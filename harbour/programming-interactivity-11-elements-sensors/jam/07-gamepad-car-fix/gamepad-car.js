// <gamepad-car>: a car on a track, driven with a gamepad or the arrow keys.
// The world is 1.6 wide and 1 high; the track is a closed centre line with a width.

const WIDTH = 1.6;
const TRACK_WIDTH = 0.2;
const CAR = { length: 0.05, width: 0.028 };

function oval() {
  return Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2 + Math.PI / 2;
    return [0.8 + 0.62 * Math.cos(a), 0.5 + 0.34 * Math.sin(a)];
  });
}

function square() {
  const corners = [[0.22, 0.8], [0.22, 0.2], [1.38, 0.2], [1.38, 0.8]];
  const points = [];
  corners.forEach((from, i) => {
    const to = corners[(i + 1) % corners.length];
    for (let t = 0; t < 1; t += 1 / 16) points.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
  });
  return points;
}

const TRACKS = { oval, square };

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      aspect-ratio: 16 / 10;
      border-radius: 12px;
      overflow: hidden;
      background: #1d3b24;
      color: #e8ebf2;
      font: 14px/1.4 system-ui, sans-serif;
      --car-colour: #ff4f4f;
      --track-colour: #3a3f4b;
    }
    :host([hidden]) { display: none; }
    :host(:focus-visible) { outline: 3px solid var(--car-colour); outline-offset: 2px; }
    canvas { display: block; width: 100%; height: 100%; }
    .message {
      position: absolute;
      inset: auto 12px 12px;
      padding: 6px 10px;
      border-radius: 8px;
      background: rgb(0 0 0 / 0.55);
      text-align: center;
    }
    .message:empty { display: none; }
  </style>
  <canvas></canvas>
  <div class="message" role="status"></div>
`;

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

class GamepadCar extends HTMLElement {
  static observedAttributes = ["track"];

  #points = oval();
  #car = null;
  #padIndex = null;
  #keys = new Set();
  #lap = { start: 0, segment: 0, halfway: false, last: null, best: null };
  #frame = 0;
  #last = 0;
  #listeners = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  get track() {
    return TRACKS[this.getAttribute("track")] ? this.getAttribute("track") : "oval";
  }

  get gamepad() {
    return this.#padIndex === null ? null : navigator.getGamepads?.()[this.#padIndex] ?? null;
  }

  connectedCallback() {
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;

    // The keyboard drives when the track has focus.
    this.addEventListener("keydown", (event) => {
      if (!event.key.startsWith("Arrow")) return;
      this.#keys.add(event.key);
    }, { signal });
    this.addEventListener("keyup", (event) => this.#keys.delete(event.key), { signal });
    this.addEventListener("blur", () => this.#keys.clear(), { signal });

    // A page sees a gamepad only after a button press on it: that press fires "gamepadconnected".
    window.addEventListener("gamepadconnected", (event) => {
      if (this.#padIndex !== null) return; // the first pad drives; a second one is ignored
      this.#padIndex = event.gamepad.index;
      this.#status(`${event.gamepad.id.split("(")[0].trim()}: trigger to drive, stick to steer.`);
      setTimeout(() => this.#status(""), 3000);
    }, { signal });
    window.addEventListener("gamepaddisconnected", (event) => {
      if (event.gamepad.index !== this.#padIndex) return;
      this.#padIndex = null;
      this.#car.speed = 0;
      this.#status("The gamepad was disconnected and the car stopped. Press a button on a pad, or drive with the arrows.");
    }, { signal });

    const canvas = this.shadowRoot.querySelector("canvas");
    const resize = new ResizeObserver(() => {
      canvas.width = Math.round(canvas.clientWidth * devicePixelRatio);
      canvas.height = Math.round(canvas.clientHeight * devicePixelRatio);
    });
    resize.observe(canvas);
    signal.addEventListener("abort", () => resize.disconnect());

    // A pad pressed before this element existed is already in the list.
    const existing = [...(navigator.getGamepads?.() ?? [])].find(Boolean);
    if (existing) this.#padIndex = existing.index;
    else if (!window.isSecureContext || !navigator.getGamepads) this.#status("Gamepads need HTTPS or localhost here. Click the track and drive with the arrows.");
    else this.#status("Press any button on a gamepad, or click the track and drive with the arrows.");

    this.#reset();
    this.#last = performance.now();
    this.#frame = requestAnimationFrame((now) => this.#tick(now));
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#frame);
    this.#listeners.abort();
    this.#keys.clear();
  }

  attributeChangedCallback() {
    this.#points = TRACKS[this.track]();
    if (this.isConnected) this.#reset();
  }

  #reset() {
    const [a, b] = this.#points;
    this.#car = { x: a[0], y: a[1], heading: Math.atan2(b[1] - a[1], b[0] - a[0]), speed: 0 };
    this.#lap = { start: 0, segment: 0, halfway: false, last: null, best: null };
  }

  // Steering and throttle from the pad (polled every frame: there's no "stick moved" event) or the keys.
  #input() {
    let steer = 0;
    let throttle = 0;
    let brake = 0;
    const pad = this.gamepad;
    if (pad) {
      steer = pad.axes[0] ?? 0;
      // "standard" mapping: 6 and 7 are the triggers. Other pads number their buttons differently.
      const standard = pad.mapping === "standard";
      throttle = pad.buttons[standard ? 7 : 0]?.value ?? 0;
      brake = pad.buttons[standard ? 6 : 1]?.value ?? 0;
    }
    if (this.#keys.has("ArrowLeft")) steer = -1;
    if (this.#keys.has("ArrowRight")) steer = 1;
    if (this.#keys.has("ArrowUp")) throttle = 1;
    if (this.#keys.has("ArrowDown")) brake = 1;
    return { steer, throttle, brake };
  }

  #tick(now) {
    this.#frame = requestAnimationFrame((t) => this.#tick(t));
    const dt = Math.min(0.05, (now - this.#last) / 1000);
    this.#last = now;
    this.#drive(this.#input(), dt, now);
    this.#draw(now);
  }

  #drive({ steer, throttle, brake }, dt, now) {
    const car = this.#car;
    if (throttle > 0 && !this.#lap.start) this.#lap.start = now; // the clock starts with the first throttle
    car.speed += (throttle * 0.9 - brake * 1.4) * dt;
    car.speed *= 1 - 0.9 * dt; // rolling resistance
    car.speed = Math.max(-0.2, Math.min(0.7, car.speed));
    car.heading += steer * 3 * dt * (car.speed / 0.7);

    const x = car.x + Math.cos(car.heading) * car.speed * dt;
    const y = car.y + Math.sin(car.heading) * car.speed * dt;
    const { distance, segment } = this.#nearest([x, y]);
    if (distance > TRACK_WIDTH / 2 - CAR.width / 2) {
      car.speed = 0; // a wall: stop where it was
      return;
    }
    car.x = x;
    car.y = y;
    this.#progress(segment, now);
  }

  #nearest(point) {
    let best = { distance: Infinity, segment: 0 };
    this.#points.forEach((a, i) => {
      const distance = distanceToSegment(point, a, this.#points[(i + 1) % this.#points.length]);
      if (distance < best.distance) best = { distance, segment: i };
    });
    return best;
  }

  // A lap: across the start line going forwards.
  #progress(segment, now) {
    const lap = this.#lap;
    const n = this.#points.length;
    if (Math.abs(segment - n / 2) < n / 8) lap.halfway = true;
    const crossed = lap.segment > n * 0.9 && segment < n * 0.1;
    lap.segment = segment;
    if (!crossed || !lap.start) return;
    const time = Math.round(now - lap.start);
    lap.start = now;
    lap.halfway = false;
    lap.last = time;
    lap.best = Math.min(lap.best ?? Infinity, time);
    this.dispatchEvent(new CustomEvent("lap", { bubbles: true, detail: { time } }));
  }

  #draw(now) {
    const canvas = this.shadowRoot.querySelector("canvas");
    const g = canvas.getContext("2d");
    const scale = canvas.width / WIDTH;
    const style = getComputedStyle(this);
    g.clearRect(0, 0, canvas.width, canvas.height);

    g.save();
    g.scale(scale, scale);
    g.lineJoin = "round";
    g.strokeStyle = style.getPropertyValue("--track-colour").trim() || "#3a3f4b";
    g.lineWidth = TRACK_WIDTH;
    g.beginPath();
    this.#points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.stroke();

    // The start line, across the track at the first point.
    const [a, b] = this.#points;
    const across = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    g.strokeStyle = "#fff";
    g.lineWidth = 0.008;
    g.beginPath();
    g.moveTo(a[0] - (Math.cos(across) * TRACK_WIDTH) / 2, a[1] - (Math.sin(across) * TRACK_WIDTH) / 2);
    g.lineTo(a[0] + (Math.cos(across) * TRACK_WIDTH) / 2, a[1] + (Math.sin(across) * TRACK_WIDTH) / 2);
    g.stroke();

    const car = this.#car;
    g.translate(car.x, car.y);
    g.rotate(car.heading);
    g.fillStyle = style.getPropertyValue("--car-colour").trim() || "#ff4f4f";
    g.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
    g.fillStyle = "#fff";
    g.fillRect(CAR.length / 2 - 0.01, -CAR.width / 2, 0.01, CAR.width); // the front
    g.restore();

    const seconds = (ms) => (ms === null ? "–" : (ms / 1000).toFixed(2));
    const lap = this.#lap;
    g.fillStyle = "#fff";
    g.font = `${14 * devicePixelRatio}px ui-monospace, monospace`;
    g.fillText(`lap ${seconds(lap.start ? now - lap.start : null)}   last ${seconds(lap.last)}   best ${seconds(lap.best)}`, 12 * devicePixelRatio, 22 * devicePixelRatio);
  }

  #status(text) {
    this.shadowRoot.querySelector(".message").textContent = text;
  }
}

customElements.define("gamepad-car", GamepadCar);
