// Step 9: the real microphone feeds the same <level-meter>.
const meter = document.querySelector("level-meter");
const preview = document.querySelector("camera-preview");
const picker = document.querySelector("device-picker");
const form = document.querySelector("#join");
const sent = document.querySelector("#sent");
const start = document.querySelector("#start");
const statusLine = document.querySelector("#status");
const fakeBlocked = document.querySelector("#fake-blocked");
const fakeMirrored = document.querySelector("#fake-mirrored");
const theme = document.querySelector("#theme");

// What to tell the user for each way getUserMedia can fail.
const PROBLEMS = {
  NotAllowedError:
    "The microphone is blocked. Open the site controls next to the address bar, allow the microphone, and reload.",
  NotFoundError: "No microphone found. Plug one in and try again.",
  NotReadableError: "Another app is using the microphone. Close it and try again.",
  OverconstrainedError: "That microphone is gone. Pick another one.",
  SecurityError: "This page isn't allowed to use the microphone.",
};

let mic = null; // { stream, context, frame } while the microphone is on

function say(text, problem = false) {
  statusLine.textContent = text;
  statusLine.classList.toggle("problem", problem);
}

// First gate: a secure context. On http://192.168… the API isn't there at all.
function hasMediaDevices() {
  return window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);
}

// The permission, read without asking: "granted", "prompt", "denied", or unknown.
async function permissionState(name) {
  try {
    const result = await navigator.permissions.query({ name });
    return result.state;
  } catch {
    return "unknown"; // this browser doesn't know that permission name
  }
}

// NotAllowedError means "blocked" or "closed the prompt". Only a block needs the site controls.
async function problemFor(error) {
  if (error.name === "NotAllowedError" && (await permissionState("microphone")) === "prompt") {
    return "You closed the prompt without answering. Click Test your mic to be asked again.";
  }
  return PROBLEMS[error.name] ?? `${error.name}: ${error.message}`;
}

async function setup() {
  if (!hasMediaDevices()) {
    say(`The microphone needs HTTPS or localhost. This page is ${location.origin}.`, true);
    start.disabled = true;
    return;
  }
  const state = await permissionState("microphone");
  if (state === "denied") {
    say(PROBLEMS.NotAllowedError, true);
  } else if (state === "granted") {
    say("Your microphone is ready.");
  } else {
    say("Parley will ask for your microphone. Nothing is sent until you join.");
  }
}

async function startMic() {
  stopMic();
  // User activation: created synchronously inside the click, before any await, so it starts "running".
  const context = new AudioContext();
  try {
    // The permission prompt, the first time.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      const rms = Math.sqrt(sum / samples.length); // root mean square: 0 (silence) to 1
      const db = 20 * Math.log10(rms || 1e-8); // about -60 dB (quiet room) to 0 dB (clipping)
      meter.value = (db + 60) / 60; // the same property the fake slider used
      mic.frame = requestAnimationFrame(tick);
    };
    mic = { stream, context, frame: requestAnimationFrame(tick) };
    say("Say something. The meter should move.");
    start.textContent = "Stop the test";
  } catch (error) {
    context.close();
    say(await problemFor(error), true);
  }
}

function stopMic() {
  if (!mic) return;
  cancelAnimationFrame(mic.frame);
  mic.stream.getTracks().forEach((track) => track.stop()); // this is what turns the indicator off
  mic.context.close();
  mic = null;
  meter.value = 0;
  start.textContent = "Test your mic";
}

start.addEventListener("click", async () => {
  if (mic) return stopMic();
  start.disabled = true; // a second click while the prompt is open would ask twice
  await startMic();
  start.disabled = false;
});

setup();

// --- unchanged from step 8 ---------------------------------------------------

picker.devices = [
  { id: "built-in", label: "MacBook Pro Microphone" },
  { id: "usb", label: "USB Audio Interface" },
  { id: "headset", label: "Bluetooth Headset" },
];

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sent.textContent = JSON.stringify(Object.fromEntries(new FormData(form)), null, 2);
});

form.addEventListener("reset", () => {
  sent.textContent = "";
});

fakeBlocked.addEventListener("change", () => {
  if (fakeBlocked.checked) preview.setAttribute("state", "blocked");
  else preview.removeAttribute("state");
});

fakeMirrored.addEventListener("change", () => {
  preview.mirrored = fakeMirrored.checked;
});

theme.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  theme.textContent = dark ? "Light theme" : "Dark theme";
});
