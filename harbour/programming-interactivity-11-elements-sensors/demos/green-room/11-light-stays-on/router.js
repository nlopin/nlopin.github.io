// Step 11: the smallest router. The URL hash picks the screen; the old screen is removed from the DOM.
const outlet = document.querySelector("#outlet");
const theme = document.querySelector("#theme");

function show() {
  if (location.hash === "#/green-room") {
    outlet.replaceChildren(document.createElement("green-room"));
  } else {
    outlet.replaceChildren(document.querySelector("#lobby").content.cloneNode(true));
  }
}

addEventListener("hashchange", show);
show();

theme.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  theme.textContent = dark ? "Light theme" : "Dark theme";
});
