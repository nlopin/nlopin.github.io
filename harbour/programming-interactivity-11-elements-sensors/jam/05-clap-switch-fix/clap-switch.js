// <clap-switch>: listens to the room; the right number of claps flips it.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      font: 14px/1.4 system-ui, sans-serif;
      --clap-accent: #2f6fde;
      --clap-on: #f5b301;
    }
    :host([hidden]) { display: none; }
    .row { display: flex; align-items: center; gap: 12px; }
    .bulb {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #d9dde5;
      transition: background 0.2s, box-shadow 0.2s;
      flex: none;
    }
    :host([on]) .bulb { background: var(--clap-on); box-shadow: 0 0 24px var(--clap-on); }
    .meter { position: relative; flex: 1; height: 16px; border-radius: 8px; background: #eef0f4; overflow: hidden; }
    .level { position: absolute; inset: 0 auto 0 0; width: 0; background: var(--clap-accent); }
    .threshold { position: absolute; top: 0; bottom: 0; width: 2px; background: #c2410c; }
    .claps { font: 13px ui-monospace, monospace; min-width: 5ch; }
    button {
      font: inherit;
      margin-top: 10px;
      padding: 6px 12px;
      border: 1px solid var(--clap-accent);
      border-radius: 8px;
      background: none;
      color: var(--clap-accent);
      cursor: pointer;
    }
    :host(:state(listening)) button { display: none; }
    output { display: block; min-height: 1.4em; margin-top: 8px; color: #5d6576; }
  </style>
  <div class="row">
    <div class="bulb" part="bulb"></div>
    <div class="meter" part="meter" role="meter" aria-label="Microphone level" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0">
      <div class="level"></div>
      <div class="threshold" title="threshold"></div>
    </div>
    <span class="claps" aria-hidden="true"></span>
  </div>
  <button part="button">Start listening</button>
  <output role="status"><slot>Clap to switch. It listens only after you press Start.</slot></output>
`;

async function microphonePermission() {
  try {
    return await navigator.permissions.query({ name: "microphone" });
  } catch {
    return null;
  }
}

const SEQUENCE_GAP = 1000; // ms: a clap more than this after the previous one starts a new sequence
const SETTLE = 700; // ms of quiet after the last clap: the sequence is over
const CLAP_LENGTH = 150; // ms: a clap is loud for less than this, speech and music for longer

class ClapSwitch extends HTMLElement {
  #internals = this.attachInternals();
  #mic = null; // { stream, context, analyser, samples, frame } while listening
  #call = 0;
  #floor = 0; // slow average of the level: the room's noise
  #candidate = null; // { time, level }: a sudden loud moment, not yet a clap
  #count = 0;
  #last = 0;
  #settle = 0;
  #listeners = null;
  #on = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.#$("button").addEventListener("click", () => this.start());
  }

  get claps() {
    return Math.max(1, Number(this.getAttribute("claps")) || 2);
  }

  get threshold() {
    const value = Number(this.getAttribute("threshold"));
    return value > 0 && value <= 1 ? value : 0.5;
  }

  set threshold(value) {
    this.setAttribute("threshold", value);
  }

  // The deviceId of the microphone to use; empty means the browser's default.
  get device() {
    return this.getAttribute("device") ?? "";
  }

  set device(value) {
    if (value) this.setAttribute("device", value);
    else this.removeAttribute("device");
    if (this.#mic) this.start(); // switch while listening; call it from a user gesture
  }

  get on() {
    return this.#on;
  }

  set on(value) {
    this.#on = Boolean(value);
  }

  connectedCallback() {
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    this.#showThreshold();
    // A background tab gets no animation frames: drop a half-counted sequence instead of miscounting it.
    document.addEventListener("visibilitychange", () => this.#reset(), { signal });
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.#$("button").disabled = true;
      this.#status(`The microphone needs HTTPS or localhost; this page is ${location.origin}.`);
      return;
    }
    this.#watchPermission();
  }

  disconnectedCallback() {
    this.stop();
    this.#listeners.abort();
  }

  attributeChangedCallback() {
    this.#showThreshold();
  }

  // Call it from a click: the AudioContext is created here, inside the user's gesture.
  async start() {
    this.stop();
    const call = this.#call;
    const context = new AudioContext();
    try {
      // Off: echo cancellation and noise suppression treat a clap as noise and remove it.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: this.device ? { exact: this.device } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (call !== this.#call) {
        stream.getTracks().forEach((track) => track.stop());
        context.close();
        return;
      }
      stream.getAudioTracks()[0].addEventListener("ended", () => {
        this.stop();
        this.#status("The microphone stopped: it was unplugged, or access was turned off.");
      });
      const analyser = new AnalyserNode(context, { fftSize: 1024 });
      context.createMediaStreamSource(stream).connect(analyser);
      this.#mic = { stream, context, analyser, samples: new Float32Array(analyser.fftSize), frame: 0 };
      this.#mic.frame = requestAnimationFrame(() => this.#tick());
      this.#internals.states.add("listening");
      this.#status(`Listening. Clap ${this.claps} times.`);
    } catch (error) {
      context.close();
      if (call !== this.#call) return;
      if (error.name === "NotAllowedError") {
        const status = await microphonePermission();
        this.#status(
          status?.state === "prompt"
            ? "You closed the prompt. Press Start to be asked again."
            : "The microphone is blocked. Allow it in the site controls next to the address bar.",
        );
      } else if (error.name === "NotFoundError") {
        this.#status("No microphone found.");
      } else if (error.name === "OverconstrainedError") {
        this.#status("That microphone is gone. Pick another one.");
      } else {
        this.#status(`The microphone failed: ${error.message}`);
      }
    }
  }

  stop() {
    this.#call++;
    if (this.#mic) {
      cancelAnimationFrame(this.#mic.frame);
      this.#mic.stream.getTracks().forEach((track) => track.stop());
      this.#mic.context.close();
      this.#mic = null;
    }
    this.#reset();
    this.#internals.states.delete("listening");
    this.#show(0);
  }

  #tick() {
    const mic = this.#mic;
    mic.frame = requestAnimationFrame(() => this.#tick());
    mic.analyser.getFloatTimeDomainData(mic.samples);
    let level = 0;
    for (const sample of mic.samples) level = Math.max(level, Math.abs(sample));
    level = Math.min(1, level);
    this.#show(level);
    this.#detect(level, performance.now());
  }

  // A clap is a jump from quiet to loud that is over quickly.
  #detect(level, now) {
    const threshold = this.threshold;
    if (this.#candidate) {
      if (level < threshold / 2) {
        // Quiet again in time: it was a clap.
        const { level: peak } = this.#candidate;
        this.#candidate = null;
        this.#clap(peak, now);
      } else if (now - this.#candidate.time > CLAP_LENGTH) {
        this.#candidate = null; // still loud: speech, music, a cough
        this.#floor = level;
      } else {
        this.#candidate.level = Math.max(this.#candidate.level, level);
      }
      return;
    }
    if (level >= threshold && this.#floor < threshold / 2) {
      this.#candidate = { time: now, level };
      return;
    }
    this.#floor = this.#floor * 0.9 + level * 0.1;
  }

  #clap(level, now) {
    if (now - this.#last > SEQUENCE_GAP) this.#count = 0;
    this.#last = now;
    this.#count++;
    this.#$(".claps").textContent = "👏".repeat(Math.min(this.#count, 5));
    this.dispatchEvent(new CustomEvent("clap", { bubbles: true, detail: { count: this.#count, level: Number(level.toFixed(2)) } }));
    clearTimeout(this.#settle);
    if (this.#count === this.claps) {
      this.#toggle();
      this.#reset();
      return;
    }
    this.#settle = setTimeout(() => this.#reset(), SETTLE);
  }

  #toggle() {
    this.on = !this.on;
    this.#status(this.on ? "On." : "Off.");
    this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, detail: { on: this.on } }));
  }

  #reset() {
    clearTimeout(this.#settle);
    this.#count = 0;
    this.#candidate = null;
    this.#$(".claps").textContent = "";
  }

  async #watchPermission() {
    const { signal } = this.#listeners;
    const status = await microphonePermission();
    if (!status || signal.aborted) return;
    status.addEventListener("change", () => {
      if (status.state === "denied") {
        this.stop();
        this.#status("Microphone access was turned off. Allow it in the site controls to listen again.");
      } else if (status.state === "granted" && !this.#mic) {
        this.#status("The microphone is allowed again. Press Start.");
      }
    }, { signal });
  }

  #show(level) {
    this.#$(".level").style.width = `${level * 100}%`;
    this.#$(".meter").setAttribute("aria-valuenow", level.toFixed(2));
  }

  #showThreshold() {
    this.#$(".threshold").style.left = `${this.threshold * 100}%`;
  }

  #status(text) {
    this.#$("output").textContent = text;
  }

  #$(selector) {
    return this.shadowRoot.querySelector(selector);
  }
}

customElements.define("clap-switch", ClapSwitch);
