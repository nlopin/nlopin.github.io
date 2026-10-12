// Step 12: the green room releases the microphone when it leaves, and reacts when access is revoked.
// The camera is released by <camera-preview> itself: its disconnectedCallback runs when the green room is removed.

const PROBLEMS = {
  NotAllowedError:
    "The microphone is blocked. Open the site controls next to the address bar, allow the microphone, and reload. You can still join muted.",
  NotFoundError: "No microphone found. You can still join muted.",
  NotReadableError: "Another app is using the microphone. Close it and try again.",
  OverconstrainedError: "That microphone is gone. Pick another one.",
  SecurityError: "This page isn't allowed to use the microphone.",
};

const CAMERA_PROBLEMS = {
  NotFoundError: "No camera found.",
  NotReadableError: "Another app is using the camera. Close it and try again.",
  OverconstrainedError: "That camera is gone. Pick another one.",
  TrackEndedError: "The camera stopped: it was unplugged, or access was turned off.",
};

// The PermissionStatus object, or null where the browser doesn't know the name.
async function permissionStatus(name) {
  try {
    return await navigator.permissions.query({ name });
  } catch {
    return null;
  }
}

function choose(picker, track) {
  // Chrome may report the alias "default" here; the alias and the real device share a groupId.
  const { deviceId, groupId } = track.getSettings();
  const device =
    picker.devices.find((d) => d.id === deviceId) ?? picker.devices.find((d) => d.groupId === groupId);
  if (!picker.value && device) picker.value = device.id;
}

class GreenRoom extends HTMLElement {
  #mic = null;
  #micCall = 0; // bumped by #stopMic(): a getUserMedia call that resolves late is stale
  #el = {};
  #listeners = null; // an AbortController while connected

  connectedCallback() {
    this.#listeners = new AbortController();
    this.replaceChildren(document.querySelector("#green-room").content.cloneNode(true));
    const $ = (selector) => this.querySelector(selector);
    this.#el = {
      meter: $("level-meter"),
      preview: $("camera-preview"),
      micPicker: $("#mic"),
      cameraPicker: $("#camera"),
      mirror: $('input[name="mirror"]'),
      form: $("#join"),
      sent: $("#sent"),
      start: $("#start"),
      status: $("#status"),
    };
    const { preview, micPicker, cameraPicker, mirror, form, sent, start } = this.#el;

    start.addEventListener("click", () => this.#startAll());

    preview.addEventListener("statechange", (event) => {
      const { state, error } = event.detail;
      if (state === "failed") this.#say(CAMERA_PROBLEMS[error.name] ?? `${error.name}: ${error.message}`, true);
      if (state === "idle" && error) this.#say("You closed the camera prompt. Click Start to be asked again.", true);
      if (state === "blocked") {
        this.#say("The camera is blocked. Open the site controls next to the address bar to allow it.", true);
      }
    });

    micPicker.addEventListener("change", () => {
      if (this.#mic) this.#startMic(micPicker.value);
    });

    cameraPicker.addEventListener("change", () => {
      if (preview.state === "live") preview.start(cameraPicker.value);
    });

    mirror.addEventListener("change", () => {
      preview.mirrored = mirror.checked;
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sent.textContent = JSON.stringify(Object.fromEntries(new FormData(form)), null, 2);
    });

    form.addEventListener("reset", () => {
      sent.textContent = "";
      preview.mirrored = mirror.defaultChecked;
    });

    this.#setup();
  }

  // Removed by the router: release what connectedCallback and the start button acquired.
  disconnectedCallback() {
    this.#stopMic();
    this.#listeners.abort(); // the PermissionStatus change listeners
  }

  #say(text, problem = false) {
    this.#el.status.textContent = text;
    this.#el.status.classList.toggle("problem", problem);
  }

  async #setup() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.#say(`Camera and microphone need HTTPS or localhost. This page is ${location.origin}.`, true);
      this.#el.start.disabled = true;
      return;
    }
    const statuses = await Promise.all([permissionStatus("camera"), permissionStatus("microphone")]);
    if (!this.isConnected) return; // left before the answer came
    const [camera, microphone] = statuses.map((status) => status?.state ?? "unknown");

    // The user can change their answer at any time, in the site controls.
    // The camera is the preview's job; the microphone is the green room's.
    statuses[1]?.addEventListener("change", () => this.#onMicrophoneChange(statuses[1]), {
      signal: this.#listeners.signal,
    });

    if (camera === "granted" && microphone === "granted") {
      this.#say("Camera and microphone are allowed. Start them when you're ready.");
    } else if (camera === "denied" || microphone === "denied") {
      if (microphone === "denied") this.#el.micPicker.required = false; // join muted
      this.#say("Camera or microphone is blocked. Open the site controls next to the address bar to allow them.", true);
    } else {
      this.#say("Parley will ask for your camera and microphone. Nothing is sent until you join.");
    }
  }

  #onMicrophoneChange(status) {
    if (status.state === "denied") {
      this.#stopMic();
      this.#say("Microphone access was turned off. Open the site controls next to the address bar to allow it again.", true);
    } else if (status.state === "granted") {
      this.#say("Microphone allowed. Start it when you're ready.");
    }
  }

  async #startAll() {
    const { start, micPicker, cameraPicker, preview } = this.#el;
    start.disabled = true;
    const [micOk] = await Promise.all([this.#startMic(micPicker.value), preview.start(cameraPicker.value)]);
    if (!this.isConnected) return;
    start.disabled = false;
    await Promise.all([micPicker.refresh(), cameraPicker.refresh()]);
    if (!this.isConnected) return;
    // Show which device the browser picked.
    if (micOk && this.#mic) choose(micPicker, this.#mic.stream.getAudioTracks()[0]);
    if (preview.stream) choose(cameraPicker, preview.stream.getVideoTracks()[0]);
    if (micOk && preview.state === "live") this.#say("Say something. The meter should move.");
  }

  async #startMic(deviceId) {
    this.#stopMic();
    const { meter, micPicker } = this.#el;
    const call = this.#micCall;
    const context = new AudioContext(); // synchronously, inside the click or change event
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      // Stale: another pick, a stop, or the user left while the prompt was open
      // (disconnectedCallback calls #stopMic).
      if (call !== this.#micCall) {
        stream.getTracks().forEach((track) => track.stop());
        context.close();
        return false;
      }
      stream.getAudioTracks()[0].addEventListener("ended", () => {
        this.#stopMic();
        this.#say("The microphone stopped: it was unplugged, or access was turned off.", true);
      });
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);

      const tick = () => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const db = 20 * Math.log10(Math.sqrt(sum / samples.length) || 1e-8);
        meter.value = (db + 60) / 60;
        this.#mic.frame = requestAnimationFrame(tick);
      };
      this.#mic = { stream, context, frame: requestAnimationFrame(tick) };
      micPicker.required = true;
      return true;
    } catch (error) {
      context.close();
      if (call !== this.#micCall) return false;
      const status = error.name === "NotAllowedError" ? await permissionStatus("microphone") : null;
      if (status?.state === "prompt") {
        this.#say("You closed the prompt without answering. Click Start to be asked again.", true);
        return false;
      }
      if (error.name === "NotAllowedError" || error.name === "NotFoundError") micPicker.required = false;
      this.#say(PROBLEMS[error.name] ?? `${error.name}: ${error.message}`, true);
      return false;
    }
  }

  #stopMic() {
    this.#micCall++;
    if (!this.#mic) return;
    cancelAnimationFrame(this.#mic.frame);
    this.#mic.stream.getTracks().forEach((track) => track.stop());
    this.#mic.context.close();
    this.#mic = null;
    this.#el.meter.value = 0;
  }
}

customElements.define("green-room", GreenRoom);
