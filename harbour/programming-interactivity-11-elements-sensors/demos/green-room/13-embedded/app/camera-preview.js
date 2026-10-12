// Step 12: the preview releases the camera when it leaves the DOM, and notices when the camera stops.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      aspect-ratio: 16 / 9;
      background: #10131a;
      color: #e8ebf2;
      border-radius: 12px;
      overflow: hidden;
    }
    :host([hidden]) { display: none; }
    video {
      display: none;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    :host([mirrored]) video,
    :host([mirrored]) .figure { transform: scaleX(-1); }
    :host(:state(live)) video { display: block; }
    :host(:state(live)) .message { display: none; }
    .message {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      gap: 8px;
      padding: 24px;
      text-align: center;
    }
    .figure { font-size: 64px; line-height: 1; }
    ::slotted(p) { margin: 0; }
    .blocked, .failed { display: none; }
    :host(:state(blocked)) .blocked,
    :host(:state(failed)) .failed { display: block; }
    :host(:state(blocked)) .idle,
    :host(:state(failed)) .idle,
    :host(:state(blocked)) .figure,
    :host(:state(failed)) .figure { display: none; }
  </style>
  <video part="video" autoplay muted playsinline></video>
  <div class="message" part="message">
    <div class="figure" aria-hidden="true">👋</div>
    <div class="idle"><slot>Camera is off.</slot></div>
    <div class="blocked"><slot name="blocked">Camera blocked.</slot></div>
    <div class="failed"><slot name="failed">Camera unavailable.</slot></div>
  </div>
`;

async function cameraPermission() {
  try {
    return (await navigator.permissions.query({ name: "camera" })).state;
  } catch {
    return "unknown";
  }
}

class CameraPreview extends HTMLElement {
  #internals = this.attachInternals();
  #stream = null;
  #call = 0; // bumped by stop(): a getUserMedia call that resolves late is stale
  #listeners = null; // an AbortController while connected

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  get mirrored() {
    return this.hasAttribute("mirrored");
  }

  set mirrored(on) {
    this.toggleAttribute("mirrored", Boolean(on));
  }

  // "idle", "live", "blocked" or "failed". Read-only from outside: the element decides.
  get state() {
    return ["live", "blocked", "failed"].find((s) => this.#internals.states.has(s)) ?? "idle";
  }

  get stream() {
    return this.#stream;
  }

  async start(deviceId) {
    this.stop();
    const call = this.#call;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      // Stale: restarted, stopped, or removed (disconnectedCallback calls stop) while the prompt was open.
      if (call !== this.#call) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.#stream = stream;
      // Unplugged, or access turned off in the site controls while it runs.
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        const error = new Error("The camera stopped.");
        error.name = "TrackEndedError";
        this.stop();
        this.#setState("failed", error);
      });
      this.shadowRoot.querySelector("video").srcObject = stream;
      this.#setState("live");
    } catch (error) {
      if (call !== this.#call) return;
      let state = "failed";
      // NotAllowedError is a block, or a prompt closed without answering: only a block is "blocked".
      if (error.name === "NotAllowedError") state = (await cameraPermission()) === "prompt" ? "idle" : "blocked";
      if (call !== this.#call) return;
      this.#setState(state, error);
    }
  }

  connectedCallback() {
    this.#listeners = new AbortController();
    this.#watchPermission(this.#listeners.signal);
  }

  // Removed from the DOM: whatever start() and connectedCallback acquired is released here.
  disconnectedCallback() {
    this.stop();
    this.#listeners.abort();
  }

  // Access turned off in the site controls: stop, and show the blocked message.
  async #watchPermission(signal) {
    try {
      const status = await navigator.permissions.query({ name: "camera" });
      status.addEventListener(
        "change",
        () => {
          if (status.state !== "denied") return;
          this.stop();
          this.#setState("blocked");
        },
        { signal },
      );
    } catch {
      // this browser doesn't know the permission name: the track's "ended" event still fires
    }
  }

  // Moved with moveBefore(): stay live instead of a disconnect + connect (where supported).
  connectedMoveCallback() {}

  stop() {
    this.#call++;
    this.#stream?.getTracks().forEach((track) => track.stop());
    this.#stream = null;
    this.shadowRoot.querySelector("video").srcObject = null;
    if (this.state === "live") this.#setState("idle");
  }

  #setState(state, error = null) {
    this.#internals.states.clear();
    if (state !== "idle") this.#internals.states.add(state);
    this.dispatchEvent(new CustomEvent("statechange", { bubbles: true, detail: { state, error } }));
  }
}

customElements.define("camera-preview", CameraPreview);
