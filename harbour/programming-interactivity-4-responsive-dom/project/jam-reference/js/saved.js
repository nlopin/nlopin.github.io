// 2 · My night: one listener on the list for every ♡, remembered in localStorage
const SAVED_KEY = "saved-stalls";
const saved = new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
const vendorList = document.querySelector(".vendor-list");
const savedCount = document.querySelector(".saved-count span");

const stallName = (el) => el.closest(".vendor-card").querySelector("h3").textContent;

function paintSaved() {
  for (const button of vendorList.querySelectorAll(".save")) {
    const on = saved.has(stallName(button));
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "♥" : "♡";
  }
  savedCount.textContent = saved.size;
}

vendorList.addEventListener("click", (event) => {
  const button = event.target.closest(".save");
  if (!button) return;
  const name = stallName(button);
  if (saved.has(name)) saved.delete(name);
  else saved.add(name);
  localStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
  paintSaved();
});

document.querySelector(".saved-only input").addEventListener("change", (event) => {
  document.body.classList.toggle("saved-only", event.target.checked);
});
paintSaved();
