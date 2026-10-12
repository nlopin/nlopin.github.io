// <window-pong>: one court across two windows of the same origin, joined by a BroadcastChannel.
// The court is 2 wide and 1 high: the left window shows x 0–1, the right window x 1–2.
// One window owns the ball at a time and simulates it; it hands the ball over when it crosses x = 1.

const BEAT = 500; // ms between "I'm here" messages
const GONE = 3000; // ms without one: the other window has gone
const PADDLE = { width: 0.02, height: 0.22, inset: 0.04 };
const RADIUS = 0.02;
const SPEED = 0.7; // court units per second at the serve

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      aspect-ratio: 1;
      max-width: 480px;
      border-radius: 12px;
      overflow: hidden;
      background: #10131a;
      color: #e8ebf2;
      font: 14px/1.4 system-ui, sans-serif;
      touch-action: none;
      --pong-ink: #e8ebf2;
      --pong-ball: #3ddc84;
    }
    :host([hidden]) { display: none; }
    :host(:focus-visible) { outline: 3px solid var(--pong-ball); outline-offset: 2px; }
    canvas { display: block; width: 100%; height: 100%; }
    .message {
      position: absolute;
      inset: auto 12px 12px;
      display: grid;
      gap: 8px;
      justify-items: center;
      text-align: center;
    }
    .message:empty { display: none; }
    button {
      font: inherit;
      padding: 6px 12px;
      border: 1px solid var(--pong-ink);
      border-radius: 8px;
      background: #10131a;
      color: var(--pong-ink);
      cursor: pointer;
    }
  </style>
  <canvas></canvas>
  <div class="message" role="status"></div>
`;

const other = (side) => (side === "left" ? "right" : "left");

class WindowPong extends HTMLElement {
  #me = { id: crypto.randomUUID(), born: Date.now() };
  #peers = new Map(); // id → { born, wants, hidden, hasBall, seen }
  #channel = null;
  #side = null; // "left", "right", or null for a third window
  #paired = false;
  #opponent = null; // the other player's id
  #lostSince = 0; // when the left window first saw that nobody has the ball
  #ball = null; // { x, y, vx, vy } while this window owns it
  #holdUntil = 0; // the ball waits here after a point
  #paddle = 0.5;
  #keys = new Set();
  #score = { left: 0, right: 0 };
  #frame = 0;
  #last = 0;
  #beat = 0;
  #listeners = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  get channel() {
    return this.getAttribute("channel") || "default";
  }

  get side() {
    return this.#side;
  }

  get score() {
    return { ...this.#score };
  }

  connectedCallback() {
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;

    this.#channel = new BroadcastChannel(`window-pong:${this.channel}`);
    this.#channel.addEventListener("message", (event) => this.#receive(event.data), { signal });

    // Each window moves its own paddle: the pointer, or the arrow keys once the court has focus.
    this.addEventListener("pointermove", (event) => {
      const box = this.getBoundingClientRect();
      this.#paddle = (event.clientY - box.top) / box.height;
    }, { signal });
    this.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "w", "s"].includes(event.key)) return;
      event.preventDefault(); // the arrows move the paddle, not the page
      this.#keys.add(event.key);
    }, { signal });
    this.addEventListener("keyup", (event) => this.#keys.delete(event.key), { signal });
    this.addEventListener("blur", () => this.#keys.clear(), { signal });

    // Hidden: animation frames stop, so say so and let the other window pause too.
    document.addEventListener("visibilitychange", () => this.#send("beat"), { signal });
    window.addEventListener("pagehide", () => this.#send("bye"), { signal });

    const canvas = this.shadowRoot.querySelector("canvas");
    const resize = new ResizeObserver(() => {
      canvas.width = Math.round(canvas.clientWidth * devicePixelRatio);
      canvas.height = Math.round(canvas.clientHeight * devicePixelRatio);
    });
    resize.observe(canvas);
    signal.addEventListener("abort", () => resize.disconnect());

    this.#send("beat");
    this.#beat = setInterval(() => this.#heartbeat(), BEAT);
    this.#last = performance.now();
    this.#frame = requestAnimationFrame((now) => this.#tick(now));
    this.#update();
  }

  disconnectedCallback() {
    this.#send("bye");
    this.#listeners.abort();
    this.#channel.close();
    clearInterval(this.#beat);
    cancelAnimationFrame(this.#frame);
    this.#peers.clear();
    this.#ball = null;
  }

  #send(type, data = {}) {
    if (!this.#channel) return;
    const beat = {
      born: this.#me.born,
      wants: this.getAttribute("side"),
      hidden: document.hidden,
      hasBall: this.#ball !== null,
    };
    try {
      this.#channel.postMessage({ type, from: this.#me.id, ...beat, ...data });
    } catch {
      // the channel is already closed
    }
  }

  #receive(message) {
    const { type, from } = message;
    if (type === "bye") {
      this.#peers.delete(from);
      this.#update();
      return;
    }
    const known = this.#peers.has(from);
    this.#peers.set(from, { born: message.born, wants: message.wants, hidden: message.hidden, hasBall: message.hasBall, seen: Date.now() });
    if (!known) this.#send("beat"); // a new window: answer at once rather than at the next beat

    if (type === "ball") {
      const { ball } = message;
      // Only the window whose half the ball is in takes it.
      if (this.#side === (ball.x >= 1 ? "right" : "left")) this.#ball = ball;
    }
    if (type === "score") this.#setScore(message.score);
    this.#update();
  }

  #heartbeat() {
    const now = Date.now();
    for (const [id, peer] of this.#peers) if (now - peer.seen > GONE) this.#peers.delete(id);
    this.#send("beat");
    this.#update();

    // Nobody has had the ball for a while (a new pair, or the owner left or reloaded): the left window serves.
    // The wait covers a ball in flight: a beat sent just before the hand-over still says "no ball".
    const lost = this.#paired && this.#side === "left" && !this.#ball && !this.#peer.hasBall;
    if (!lost) this.#lostSince = 0;
    else if (!this.#lostSince) this.#lostSince = now;
    else if (now - this.#lostSince > 2 * BEAT + 200) {
      this.#lostSince = 0;
      this.#serve("left");
    }
  }

  // Every window works out the same answer from the same messages: the two oldest windows play.
  #update() {
    const alive = [...this.#peers].map(([id, p]) => ({ id, ...p }));
    const everyone = [{ id: this.#me.id, born: this.#me.born, wants: this.getAttribute("side") }, ...alive]
      .sort((a, b) => a.born - b.born || a.id.localeCompare(b.id));
    const [first, second] = everyone;
    const firstSide = first.wants === "left" || first.wants === "right" ? first.wants : second?.wants ? other(second.wants) : "left";
    const sides = new Map([[first.id, firstSide]]);
    if (second) sides.set(second.id, other(firstSide));

    this.#side = sides.get(this.#me.id) ?? null;
    this.#paired = Boolean(second) && this.#side !== null;
    this.#opponent = this.#paired ? [first, second].find((w) => w.id !== this.#me.id).id : null;
    if (this.#side === null) this.#ball = null;
    this.#showMessage();
  }

  #showMessage() {
    const key = this.#side === null ? "full" : !this.#paired ? `waiting-${this.#side}` : this.#peer.hidden ? "hidden" : "";
    const message = this.shadowRoot.querySelector(".message");
    if (message.dataset.key === key) return; // rebuilt only on change, so the button isn't replaced under a click
    message.dataset.key = key;
    if (key === "full") {
      message.textContent = "This match is full: two windows are already playing on this channel.";
    } else if (key.startsWith("waiting")) {
      message.innerHTML = `<span>You're ${this.#side}. Waiting for the other window…</span><button>Open the other window</button>`;
      message.querySelector("button").addEventListener("click", () => {
        // Inside a click, so it isn't blocked as a pop-up.
        window.open(location.href, "", "popup,width=520,height=600");
      });
    } else if (key === "hidden") {
      message.textContent = "The other window is in the background. Paused.";
    } else {
      message.textContent = "";
    }
  }

  // The other player's last beat, or {} when there isn't one.
  get #peer() {
    return this.#peers.get(this.#opponent) ?? {};
  }

  #serve(loser) {
    // The ball starts in the loser's half, heading for the other side, after a pause.
    const direction = loser === "left" ? 1 : -1;
    const angle = (Math.random() - 0.5) * 0.8;
    this.#ball = {
      x: loser === "left" ? 0.5 : 1.5,
      y: 0.5,
      vx: direction * SPEED * Math.cos(angle),
      vy: SPEED * Math.sin(angle),
    };
    this.#holdUntil = performance.now() + 1000;
  }

  #tick(now) {
    this.#frame = requestAnimationFrame((t) => this.#tick(t));
    const dt = Math.min(0.05, (now - this.#last) / 1000); // a long gap must not teleport the ball
    this.#last = now;

    const step = (this.#keys.has("ArrowUp") || this.#keys.has("w") ? -1 : 0) + (this.#keys.has("ArrowDown") || this.#keys.has("s") ? 1 : 0);
    this.#paddle = Math.min(1 - PADDLE.height / 2, Math.max(PADDLE.height / 2, this.#paddle + step * 1.2 * dt));

    const paused = !this.#paired || document.hidden || this.#peer.hidden;
    if (this.#ball && !paused && now > this.#holdUntil) this.#move(dt);
    this.#draw();
  }

  #move(dt) {
    const ball = this.#ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.y < RADIUS || ball.y > 1 - RADIUS) {
      ball.vy = -ball.vy;
      ball.y = Math.min(1 - RADIUS, Math.max(RADIUS, ball.y));
    }

    const left = this.#side === "left";
    const face = left ? PADDLE.inset + PADDLE.width : 2 - PADDLE.inset - PADDLE.width;
    const coming = left ? ball.vx < 0 : ball.vx > 0;
    const reached = left ? ball.x - RADIUS <= face : ball.x + RADIUS >= face;
    const behind = left ? ball.x < PADDLE.inset : ball.x > 2 - PADDLE.inset;
    if (coming && reached && !behind && Math.abs(ball.y - this.#paddle) <= PADDLE.height / 2 + RADIUS) {
      ball.vx = -ball.vx * 1.05;
      ball.vy += ((ball.y - this.#paddle) / PADDLE.height) * 0.8; // where it hits the paddle sets the angle
      ball.x = left ? face + RADIUS : face - RADIUS;
    }

    // Missed: the other side scores, and this window serves.
    if (ball.x < -RADIUS || ball.x > 2 + RADIUS) {
      const score = { ...this.#score, [other(this.#side)]: this.#score[other(this.#side)] + 1 };
      this.#setScore(score);
      this.#send("score", { score });
      this.#serve(this.#side);
      return;
    }

    // Crossed into the other half: hand the ball over.
    if (left ? ball.x >= 1 : ball.x < 1) {
      this.#ball = null;
      this.#send("ball", { ball });
      const peer = this.#peers.get(this.#opponent);
      if (peer) peer.hasBall = true; // until its next beat says so itself
    }
  }

  #setScore(score) {
    this.#score = { left: score.left, right: score.right };
    this.dispatchEvent(new CustomEvent("score", { bubbles: true, detail: this.score }));
  }

  #draw() {
    const canvas = this.shadowRoot.querySelector("canvas");
    const g = canvas.getContext("2d");
    const { width, height } = canvas;
    const style = getComputedStyle(this);
    const ink = style.getPropertyValue("--pong-ink").trim() || "#e8ebf2";
    const ballColour = style.getPropertyValue("--pong-ball").trim() || "#3ddc84";
    const offset = this.#side === "right" ? 1 : 0;
    const toX = (x) => (x - offset) * width;
    const toY = (y) => y * height;
    g.clearRect(0, 0, width, height);
    if (this.#side === null) return;

    // The net, on the edge next to the other window.
    g.strokeStyle = ink;
    g.globalAlpha = 0.3;
    g.setLineDash([8 * devicePixelRatio, 8 * devicePixelRatio]);
    g.lineWidth = 3 * devicePixelRatio;
    g.beginPath();
    g.moveTo(toX(1), 0);
    g.lineTo(toX(1), height);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;

    g.fillStyle = ink;
    g.font = `600 ${32 * devicePixelRatio}px ui-monospace, monospace`;
    g.textAlign = "center";
    g.fillText(`${this.#score.left} : ${this.#score.right}`, width / 2, 44 * devicePixelRatio);

    const px = this.#side === "left" ? PADDLE.inset : 2 - PADDLE.inset - PADDLE.width;
    g.fillRect(toX(px), toY(this.#paddle - PADDLE.height / 2), PADDLE.width * width, PADDLE.height * height);

    if (this.#ball) {
      g.fillStyle = ballColour;
      g.beginPath();
      g.arc(toX(this.#ball.x), toY(this.#ball.y), RADIUS * height, 0, Math.PI * 2);
      g.fill();
    }
  }
}

customElements.define("window-pong", WindowPong);
