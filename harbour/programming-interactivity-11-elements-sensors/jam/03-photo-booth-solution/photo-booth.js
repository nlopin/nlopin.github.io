// <photo-booth>: a countdown, a flash, a strip of photos, one download.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      font: 14px/1.4 system-ui, sans-serif;
      --booth-accent: #2f6fde;
    }
    :host([hidden]) { display: none; }
    .stage {
      position: relative;
      aspect-ratio: 4 / 3;
      border-radius: 12px;
      overflow: hidden;
      background: #10131a;
      color: #e8ebf2;
    }
    video { display: none; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    :host(:state(live)) video { display: block; }
    :host(:state(live)) .message { display: none; }
    .message { position: absolute; inset: 0; display: grid; place-content: center; padding: 24px; text-align: center; }
    .count {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      font: 700 120px/1 system-ui, sans-serif;
      color: #fff;
      text-shadow: 0 4px 24px rgb(0 0 0 / 0.6);
      pointer-events: none;
    }
    .flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
    .flash.go { animation: flash 300ms ease-out; }
    @keyframes flash { from { opacity: 1; } to { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .flash.go { animation-duration: 1ms; } }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
    button, .upload {
      font: inherit;
      padding: 6px 12px;
      border: 1px solid var(--booth-accent);
      border-radius: 8px;
      background: none;
      color: var(--booth-accent);
      cursor: pointer;
    }
    button:disabled { opacity: 0.4; cursor: default; }
    .upload { display: none; }
    :host(:state(blocked)) .upload, :host(:state(failed)) .upload { display: inline-block; }
    .upload input { position: absolute; opacity: 0; width: 1px; height: 1px; }
    .upload:focus-within { outline: 2px solid var(--booth-accent); outline-offset: 2px; }
    output { display: block; min-height: 1.4em; margin-top: 8px; color: #5d6576; }
    .result { display: none; gap: 8px; margin-top: 12px; justify-items: start; }
    :host(:state(has-strip)) .result { display: grid; }
    .result img { max-height: 360px; border-radius: 4px; box-shadow: 0 2px 12px rgb(0 0 0 / 0.2); }
    .recent { display: flex; gap: 8px; list-style: none; padding: 0; margin: 8px 0 0; }
    .recent img { height: 90px; border-radius: 2px; }
  </style>
  <div class="stage" part="stage">
    <video autoplay muted playsinline></video>
    <div class="message"><slot>The booth uses your camera. The photos stay on this device until you download them.</slot></div>
    <div class="count" aria-live="assertive"></div>
    <div class="flash"></div>
  </div>
  <div class="actions">
    <button class="start" part="button">Start the camera</button>
    <button class="shoot" part="button" disabled>Take a strip</button>
    <label class="upload" part="button">Use photos instead<input type="file" accept="image/*" multiple></label>
  </div>
  <output role="status"></output>
  <div class="result">
    <img class="strip" alt="The latest photo strip">
    <a class="download" download="photo-strip.png">Download the strip</a>
    <ul class="recent" aria-label="Earlier strips"></ul>
  </div>
`;

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

async function cameraPermission() {
  try {
    return await navigator.permissions.query({ name: "camera" });
  } catch {
    return null; // the browser doesn't know the name
  }
}

const PROBLEMS = {
  NotFoundError: "No camera found. You can make a strip from your own photos instead.",
  NotReadableError: "Another app is using the camera. Close it and try again.",
  TrackEndedError: "The camera stopped: it was unplugged, or access was turned off.",
};

class PhotoBooth extends HTMLElement {
  #internals = this.attachInternals();
  #stream = null;
  #call = 0; // bumped by stop(): a getUserMedia call that resolves late is stale
  #run = null; // an AbortController while a strip is being taken
  #strips = []; // object URLs of the last three strips, newest first
  #listeners = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
    const $ = (selector) => this.shadowRoot.querySelector(selector);
    $(".start").addEventListener("click", () => this.start());
    $(".shoot").addEventListener("click", () => this.shoot());
    $(".upload input").addEventListener("change", (event) => this.#fromFiles(event.target));
  }

  get shots() {
    return Math.max(1, Number(this.getAttribute("shots")) || 4);
  }

  get countdown() {
    const seconds = Number(this.getAttribute("countdown") ?? 3);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : 3;
  }

  connectedCallback() {
    this.#listeners = new AbortController();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.#setState("failed");
      this.#say(`The camera needs HTTPS or localhost; this page is ${location.origin}. You can use your own photos.`);
      this.#$(".start").disabled = true;
      return;
    }
    this.#watchPermission();
  }

  disconnectedCallback() {
    this.stop();
    this.#listeners.abort();
    this.#strips.forEach((url) => URL.revokeObjectURL(url));
    this.#strips = [];
    this.#internals.states.delete("has-strip");
  }

  async #watchPermission() {
    const { signal } = this.#listeners;
    const status = await cameraPermission();
    if (!status || signal.aborted) return;
    if (status.state === "denied") this.#blocked();
    status.addEventListener("change", () => {
      if (status.state === "denied") {
        this.stop();
        this.#blocked();
      } else if (this.#internals.states.has("blocked")) {
        this.#setState("idle");
        this.#say("The camera is allowed again. Start it when you're ready.");
      }
    }, { signal });
  }

  async start() {
    this.stop();
    const call = this.#call;
    const start = this.#$(".start");
    start.disabled = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      // Stale: stopped or removed while the prompt was open.
      if (call !== this.#call) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.#stream = stream;
      stream.getVideoTracks()[0].addEventListener("ended", () => this.#fail({ name: "TrackEndedError" }));
      const video = this.#$("video");
      video.srcObject = stream;
      await video.play(); // resolves once there's a frame with a size: no black first photo
      if (call !== this.#call) return;
      this.#setState("live");
      this.#$(".shoot").disabled = false;
      this.#say("Ready. Take a strip.");
    } catch (error) {
      if (call !== this.#call) return;
      if (error.name === "NotAllowedError") {
        const status = await cameraPermission();
        if (status?.state === "prompt") this.#say("You closed the prompt. Start the camera again to be asked.");
        else this.#blocked();
      } else {
        this.#fail(error);
      }
    } finally {
      start.disabled = false;
    }
  }

  stop() {
    this.#call++;
    this.#run?.abort();
    this.#stream?.getTracks().forEach((track) => track.stop());
    this.#stream = null;
    this.#$("video").srcObject = null;
    this.#$(".shoot").disabled = true;
    if (this.#internals.states.has("live")) this.#setState("idle");
  }

  async shoot() {
    if (!this.#stream) {
      this.#say("Start the camera first.");
      return;
    }
    if (this.#run) return; // one strip at a time: a second call doesn't interleave
    this.#run = new AbortController();
    const { signal } = this.#run;
    const count = this.#$(".count");
    const frames = [];
    try {
      for (let shot = 1; shot <= this.shots; shot++) {
        for (let n = this.countdown; n > 0; n--) {
          count.textContent = n;
          await sleep(1000, signal);
        }
        count.textContent = "";
        const frame = this.#capture();
        this.#flash();
        frames.push(frame);
        this.#say(`Photo ${shot} of ${this.shots}.`);
        this.dispatchEvent(new CustomEvent("photo", { bubbles: true, detail: { blob: await toBlob(frame) } }));
        await sleep(500, signal);
      }
      await this.#finish(frames);
    } catch (error) {
      if (!signal.aborted) throw error; // stopped or removed mid-countdown: nothing to finish
    } finally {
      count.textContent = "";
      if (this.#run?.signal === signal) this.#run = null;
    }
  }

  // The video's own pixels at their real size, unmirrored.
  #capture() {
    const video = this.#$("video");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas;
  }

  #flash() {
    const flash = this.#$(".flash");
    flash.classList.remove("go");
    void flash.offsetWidth; // restart the animation
    flash.classList.add("go");
  }

  async #fromFiles(input) {
    const files = [...input.files].slice(0, this.shots);
    input.value = "";
    if (files.length === 0) return;
    const images = await Promise.all(files.map((file) => createImageBitmap(file)));
    if (!this.isConnected) return;
    await this.#finish(images);
  }

  // One tall PNG: each frame cropped to 4:3 from its centre, so nothing is squashed.
  async #finish(frames) {
    const width = 600;
    const frameHeight = 450;
    const gap = 24;
    const footer = 56;
    const canvas = document.createElement("canvas");
    canvas.width = width + gap * 2;
    canvas.height = frames.length * (frameHeight + gap) + gap + footer;
    const g = canvas.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    frames.forEach((frame, i) => {
      const ratio = width / frameHeight;
      let sw = frame.width;
      let sh = frame.height;
      if (sw / sh > ratio) sw = sh * ratio;
      else sh = sw / ratio;
      const sx = (frame.width - sw) / 2;
      const sy = (frame.height - sh) / 2;
      g.drawImage(frame, sx, sy, sw, sh, gap, gap + i * (frameHeight + gap), width, frameHeight);
    });
    g.fillStyle = "#161a22";
    g.font = "600 22px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText(new Date().toLocaleString(), canvas.width / 2, canvas.height - footer / 2);

    const blob = await toBlob(canvas);
    if (!this.isConnected) return;
    this.#keep(URL.createObjectURL(blob));
    this.#say("Done. Download the strip, or take another.");
    this.dispatchEvent(new CustomEvent("strip", { bubbles: true, detail: { blob } }));
  }

  // The current strip, and the last three in memory only: older URLs are revoked.
  #keep(url) {
    this.#strips.unshift(url);
    this.#strips.splice(3).forEach((old) => URL.revokeObjectURL(old));
    this.#$(".strip").src = url;
    this.#$(".download").href = url;
    this.#$(".recent").replaceChildren(
      ...this.#strips.slice(1).map((src) => {
        const item = document.createElement("li");
        const image = document.createElement("img");
        image.src = src;
        image.alt = "An earlier strip";
        item.append(image);
        return item;
      }),
    );
    this.#internals.states.add("has-strip");
  }

  #blocked() {
    this.#setState("blocked");
    this.#say("The camera is blocked. Allow it in the site controls next to the address bar, or use your own photos.");
  }

  #fail(error) {
    this.stop();
    this.#setState("failed");
    this.#say(PROBLEMS[error.name] ?? `The camera failed: ${error.message ?? error.name}`);
  }

  #setState(state) {
    for (const s of ["live", "blocked", "failed"]) this.#internals.states.delete(s);
    if (state !== "idle") this.#internals.states.add(state);
  }

  #say(text) {
    this.#$("output").textContent = text;
  }

  #$(selector) {
    return this.shadowRoot.querySelector(selector);
  }
}

customElements.define("photo-booth", PhotoBooth);
