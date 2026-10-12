const meter = document.querySelector("level-meter");
const preview = document.querySelector("camera-preview");
const fake = document.querySelector("#fake");
const fakeBlocked = document.querySelector("#fake-blocked");
const fakeMirrored = document.querySelector("#fake-mirrored");
const theme = document.querySelector("#theme");

fake.addEventListener("input", () => {
  meter.value = fake.valueAsNumber;
});

// Faked from outside for now. In step 10 the element will own its state.
fakeBlocked.addEventListener("change", () => {
  if (fakeBlocked.checked) preview.setAttribute("state", "blocked");
  else preview.removeAttribute("state");
});

fakeMirrored.addEventListener("change", () => {
  preview.mirrored = fakeMirrored.checked; // the property writes the attribute; CSS reads the attribute
});

theme.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  theme.textContent = dark ? "Light theme" : "Dark theme";
});
