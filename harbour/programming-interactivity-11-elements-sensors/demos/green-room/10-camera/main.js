// Step 10: camera and microphone, real devices, one button.
const meter = document.querySelector("level-meter");
const preview = document.querySelector("camera-preview");
const micPicker = document.querySelector("#mic");
const cameraPicker = document.querySelector("#camera");
const mirror = document.querySelector('input[name="mirror"]');
const form = document.querySelector("#join");
const sent = document.querySelector("#sent");
const start = document.querySelector("#start");
const statusLine = document.querySelector("#status");
const theme = document.querySelector("#theme");

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
};

let mic = null;
let micCall = 0; // bumped by stopMic(): a getUserMedia call that resolves late is stale

function say(text, problem = false) {
  statusLine.textContent = text;
  statusLine.classList.toggle("problem", problem);
}

function hasMediaDevices() {
  return window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);
}

async function permissionState(name) {
  try {
    const result = await navigator.permissions.query({ name });
    return result.state;
  } catch {
    return "unknown";
  }
}

// Choose the first screen from the permission state, before anything is asked.
async function setup() {
  if (!hasMediaDevices()) {
    say(`Camera and microphone need HTTPS or localhost. This page is ${location.origin}.`, true);
    start.disabled = true;
    return;
  }
  const [camera, microphone] = await Promise.all([permissionState("camera"), permissionState("microphone")]);
  if (camera === "granted" && microphone === "granted") {
    say("Camera and microphone are allowed. Start them when you're ready.");
  } else if (camera === "denied" || microphone === "denied") {
    if (microphone === "denied") micPicker.required = false; // join muted
    say("Camera or microphone is blocked. Open the site controls next to the address bar to allow them.", true);
  } else {
    say("Parley will ask for your camera and microphone. Nothing is sent until you join.");
  }
}

async function startMic(deviceId) {
  stopMic();
  const call = micCall;
  const context = new AudioContext(); // synchronously, inside the click or change event
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    if (call !== micCall) {
      // a newer start (another pick) or a stop happened meanwhile
      stream.getTracks().forEach((track) => track.stop());
      context.close();
      return false;
    }
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
      mic.frame = requestAnimationFrame(tick);
    };
    mic = { stream, context, frame: requestAnimationFrame(tick) };
    micPicker.required = true;
    return true;
  } catch (error) {
    context.close();
    if (call !== micCall) return false;
    const dismissed = error.name === "NotAllowedError" && (await permissionState("microphone")) === "prompt";
    if (dismissed) {
      say("You closed the prompt without answering. Click Start to be asked again.", true);
      return false;
    }
    if (error.name === "NotAllowedError" || error.name === "NotFoundError") micPicker.required = false; // join muted
    say(PROBLEMS[error.name] ?? `${error.name}: ${error.message}`, true);
    return false;
  }
}

function choose(picker, track) {
  // Chrome may report the alias "default" here; the alias and the real device share a groupId.
  const { deviceId, groupId } = track.getSettings();
  const device =
    picker.devices.find((d) => d.id === deviceId) ?? picker.devices.find((d) => d.groupId === groupId);
  if (!picker.value && device) picker.value = device.id;
}

function stopMic() {
  micCall++;
  if (!mic) return;
  cancelAnimationFrame(mic.frame);
  mic.stream.getTracks().forEach((track) => track.stop());
  mic.context.close();
  mic = null;
  meter.value = 0;
}

start.addEventListener("click", async () => {
  start.disabled = true;
  // Both prompts come from this one click. The camera starts inside the element.
  const [micOk] = await Promise.all([startMic(micPicker.value), preview.start(cameraPicker.value)]);
  start.disabled = false;
  // Names and ids exist only now that access is allowed.
  await Promise.all([micPicker.refresh(), cameraPicker.refresh()]);
  // Show which device the browser picked.
  if (micOk && mic) choose(micPicker, mic.stream.getAudioTracks()[0]);
  if (preview.stream) choose(cameraPicker, preview.stream.getVideoTracks()[0]);
  if (micOk && preview.state === "live") say("Say something. The meter should move.");
});

// The preview reports its state; the page decides what to say.
preview.addEventListener("statechange", (event) => {
  const { state, error } = event.detail;
  if (state === "failed") say(CAMERA_PROBLEMS[error.name] ?? `${error.name}: ${error.message}`, true);
  if (state === "idle" && error) say("You closed the camera prompt. Click Start to be asked again.", true);
});

// Events out, data in: a new choice restarts the device that's running.
micPicker.addEventListener("change", () => {
  if (mic) startMic(micPicker.value);
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
  preview.mirrored = mirror.defaultChecked; // reset doesn't fire change on the checkbox
});

theme.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  theme.textContent = dark ? "Light theme" : "Dark theme";
});

setup();
