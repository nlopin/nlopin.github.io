// <theremin-pad>: press and move to play. x sets the pitch, y the volume.
const WAVES = ["sine", "square", "sawtooth", "triangle"];

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      aspect-ratio: 16 / 10;
      border-radius: 12px;
      overflow: hidden;
      background: #10131a;
      color: #e8ebf2;
      touch-action: none; /* a drag on the pad plays, it doesn't scroll the page */
      user-select: none;
      cursor: crosshair;
      --theremin-line: #3ddc84;
    }
    :host([hidden]) { display: none; }
    canvas { display: block; width: 100%; height: 100%; }
    .hint {
      position: absolute;
      inset: auto 0 12px;
      text-align: center;
      font: 14px/1.4 system-ui, sans-serif;
      color: #9aa3b5;
      pointer-events: none;
    }
    :host(:state(playing)) .hint { display: none; }
  </style>
  <canvas part="canvas"></canvas>
  <p class="hint" part="hint"><slot>Press and move. Left to right: pitch. Bottom to top: volume.</slot></p>
`;

class ThereminPad extends HTMLElement {
  static observedAttributes = ["waves"];

  #internals = this.attachInternals();
  #audio = null; // { context, oscillator, gain, analyser, samples }, from the first press on
  #pointer = null; // { id, x, y } while pressed, x and y in 0..1
  #frame = 0;
  #resize = null;
  #listeners = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.#internals.role = "application";
    this.#internals.ariaLabel = "Theremin: press and move to play";
  }

  get wave() {
    const wave = this.getAttribute("wave");
    return WAVES.includes(wave) ? wave : "sine";
  }

  set wave(value) {
    this.setAttribute("wave", value);
  }

  get low() {
    return Number(this.getAttribute("low")) || 110;
  }

  get high() {
    return Number(this.getAttribute("high")) || 880;
  }

  get playing() {
    return this.#pointer !== null;
  }

  connectedCallback() {
    this.#audio = this.#createAudio();
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    this.addEventListener("pointerdown", (event) => this.#press(event), { signal });
    this.addEventListener("pointermove", (event) => this.#move(event), { signal });
    // pointerup, cancel, or capture lost for any other reason: the note stops.
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      this.addEventListener(type, (event) => this.#release(event), { signal });
    }
    const canvas = this.shadowRoot.querySelector("canvas");
    this.#resize = new ResizeObserver(() => {
      canvas.width = Math.round(canvas.clientHeight * devicePixelRatio);
      canvas.height = Math.round(canvas.clientWidth * devicePixelRatio);
    });
    this.#resize.observe(canvas);
    this.#frame = requestAnimationFrame(() => this.#tick());
  }

  disconnectedCallback() {
    this.#listeners.abort();
    this.#resize.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#pointer = null;
    this.#internals.states.delete("playing");
    this.#audio?.context.close();
    this.#audio = null;
  }

  attributeChangedCallback() {
    if (this.#audio) this.#audio.oscillator.type = this.wave;
  }

  #press(event) {
    if (this.#pointer || event.button > 0) return;
    this.setPointerCapture(event.pointerId); // keeps the moves coming after the pointer leaves the pad
    this.#pointer = { id: event.pointerId, ...this.#position(event) };
    this.#internals.states.add("playing");
    this.#apply(0.01);
  }

  #move(event) {
    if (event.pointerId !== this.#pointer?.id) return;
    Object.assign(this.#pointer, this.#position(event));
    this.#apply(0.03);
  }

  #release(event) {
    if (event.pointerId !== this.#pointer?.id) return;
    this.#pointer = null;
    this.#internals.states.delete("playing");
    const { gain, context } = this.#audio;
    gain.gain.setTargetAtTime(0, context.currentTime, 0.03);
  }

  #position(event) {
    const box = this.getBoundingClientRect();
    const clamp = (n) => Math.min(1, Math.max(0, n));
    return { x: clamp((event.clientX - box.left) / box.width), y: clamp((event.clientY - box.top) / box.height) };
  }

  #createAudio() {
    const context = new AudioContext();
    const oscillator = new OscillatorNode(context, { type: this.wave, frequency: this.low });
    const gain = new GainNode(context, { gain: 0 });
    const analyser = new AnalyserNode(context, { fftSize: 2048 });
    oscillator.connect(gain).connect(analyser).connect(context.destination);
    oscillator.start();
    return { context, oscillator, gain, analyser, samples: new Float32Array(analyser.fftSize) };
  }

  get #frequency() {
    // Equal steps in x are equal musical intervals, so the scale is exponential.
    return this.low * (this.high / this.low) ** this.#pointer.x;
  }

  get #volume() {
    return 1 - this.#pointer.y;
  }

  // Ramp instead of setting .value: a jump in frequency or gain is a click in the speaker.
  #apply(seconds) {
    const { oscillator, gain, context } = this.#audio;
    oscillator.frequency.setTargetAtTime(this.#frequency, context.currentTime, seconds);
    gain.gain.setTargetAtTime(this.#volume * 0.5, context.currentTime, seconds);
  }

  #tick() {
    this.#frame = requestAnimationFrame(() => this.#tick());
    this.#draw();
    if (this.#pointer) {
      const detail = { frequency: Math.round(this.#frequency), volume: Number(this.#volume.toFixed(2)) };
      this.dispatchEvent(new CustomEvent("note", { bubbles: true, detail }));
    }
  }

  #draw() {
    const canvas = this.shadowRoot.querySelector("canvas");
    const g = canvas.getContext("2d");
    const { width, height } = canvas;
    const line = getComputedStyle(this).getPropertyValue("--theremin-line").trim() || "#3ddc84";
    g.clearRect(0, 0, width, height);

    // The waveform you hear, from the analyser: flat when silent.
    g.lineWidth = 2 * devicePixelRatio;
    g.strokeStyle = line;
    g.beginPath();
    if (this.#audio) {
      const { analyser, samples } = this.#audio;
      analyser.getFloatTimeDomainData(samples);
      const shown = samples.length / 2;
      for (let i = 0; i < shown; i++) {
        const x = (i / (shown - 1)) * width;
        const y = height / 2 - samples[i] * height * 0.8;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
    } else {
      g.moveTo(0, height / 2);
      g.lineTo(width, height / 2);
    }
    g.stroke();

    // Where the finger is, and what that means: readable with the sound off.
    if (this.#pointer) {
      const x = this.#pointer.x * width;
      const y = this.#pointer.y * height;
      g.fillStyle = line;
      g.beginPath();
      g.arc(x, y, (8 + 16 * this.#volume) * devicePixelRatio, 0, Math.PI * 2);
      g.globalAlpha = 0.35;
      g.fill();
      g.globalAlpha = 1;
      g.font = `${13 * devicePixelRatio}px ui-monospace, monospace`;
      g.fillStyle = "#e8ebf2";
      g.fillText(`${Math.round(this.#frequency)} Hz · ${Math.round(this.#volume * 100)}%`, 12 * devicePixelRatio, 22 * devicePixelRatio);
    }
  }
}

customElements.define("theremin-pad", ThereminPad);
