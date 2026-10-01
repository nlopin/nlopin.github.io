// 1 · Light / auto / dark. The choice is "light", "auto" or "dark";
// the page only ever shows light or dark: auto asks the system which.
const root = document.documentElement;
const themeSwitch = document.querySelector(".theme-switch");
const systemLight = matchMedia("(prefers-color-scheme: light)");

let themeChoice = localStorage.getItem("theme") || "auto";

function applyTheme() {
  const auto = themeChoice === "auto";
  root.dataset.theme = auto ? (systemLight.matches ? "light" : "dark") : themeChoice;
}

// show the stored choice in the switch, then draw it
themeSwitch.querySelector(`input[value="${themeChoice}"]`).checked = true;
applyTheme();

// one listener for all three radios: "change" bubbles up to the fieldset
themeSwitch.addEventListener("change", (event) => {
  themeChoice = event.target.value;
  if (themeChoice === "auto") localStorage.removeItem("theme");
  else localStorage.setItem("theme", themeChoice);
  applyTheme();
});

// in auto, follow the system live (e.g. the laptop switches to dark at sunset)
systemLight.addEventListener("change", () => {
  if (themeChoice === "auto") applyTheme();
});
