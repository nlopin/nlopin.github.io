const meter = document.querySelector("level-meter");
const preview = document.querySelector("camera-preview");
const picker = document.querySelector("device-picker");
const form = document.querySelector("#join");
const sent = document.querySelector("#sent");
const fake = document.querySelector("#fake");
const fakeBlocked = document.querySelector("#fake-blocked");
const fakeMirrored = document.querySelector("#fake-mirrored");
const theme = document.querySelector("#theme");

// Fake devices: the real list needs a permission (step 10).
picker.devices = [
  { id: "built-in", label: "MacBook Pro Microphone" },
  { id: "usb", label: "USB Audio Interface" },
  { id: "headset", label: "Bluetooth Headset" },
];

// Events out: the picker reports, the page decides.
picker.addEventListener("change", () => {
  console.log("picked", picker.value);
});

// The form only submits when every control, including the picker, is valid.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  sent.textContent = JSON.stringify(Object.fromEntries(new FormData(form)), null, 2);
});

form.addEventListener("reset", () => {
  sent.textContent = "";
});

fake.addEventListener("input", () => {
  meter.value = fake.valueAsNumber;
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
