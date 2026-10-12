const meter = document.querySelector("level-meter");
const fake = document.querySelector("#fake");

fake.addEventListener("input", () => {
  meter.value = fake.valueAsNumber;
});

// The app's dark theme: --ok and --line change, and the meter follows through its custom properties.
const theme = document.querySelector("#theme");

theme.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  theme.textContent = dark ? "Light theme" : "Dark theme";
});
