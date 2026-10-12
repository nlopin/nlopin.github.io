// The app's side. You shouldn't need to change this file.
const form = document.querySelector("#feedback");
const sent = document.querySelector("#sent");
const theme = document.querySelector("#theme");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sent.textContent = "Sent:\n" + JSON.stringify(Object.fromEntries(new FormData(form)), null, 2);
});

form.addEventListener("reset", () => {
  sent.textContent = "";
});

// Every change event that reaches the form, from any control.
form.addEventListener("change", (event) => {
  console.log("change from", event.target.tagName.toLowerCase(), event.target.value);
});

theme.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  theme.textContent = dark ? "Light theme" : "Dark theme";
});
