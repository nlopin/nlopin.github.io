// ==========================================================================
// Bug hunt — app.js · THE FIXED VERSION (teacher only)
// A small market with five bugs in it. The bug reports are on the page.
// Find each one with the debugger (DevTools → Sources), fix it here,
// reload: the report turns green when its test passes.
// ==========================================================================

const stalls = [
  { id: "dumplings",   name: "Dumpling Dynasty",  tag: "food",   price: 8,  soldOut: false },
  { id: "side-b",      name: "Side B Records",    tag: "music",  price: 12, soldOut: false },
  { id: "salt-ink",    name: "Salt & Ink",        tag: "crafts", price: 15, soldOut: false },
  { id: "churros",     name: "Churros Till Late", tag: "food",   price: 5,  soldOut: true },
  { id: "plant-swap",  name: "The Plant Swap",    tag: "crafts", price: 0,  soldOut: false },
  { id: "mezcal",      name: "Mezcal Moon",       tag: "drinks", price: 9,  soldOut: true },
  { id: "taco-bike",   name: "Taco Bike",         tag: "food",   price: 6,  soldOut: false },
  { id: "lemonade",    name: "Lantern Lemonade",  tag: "drinks", price: 3,  soldOut: false },
];

const state = {
  tag: "all",
  cheapest: false,
  saved: new Set(),
};

// The checks on the page run this file in hidden copies, with their own key.
const KEY = new URLSearchParams(location.search).has("under-test") ? "bug-hunt-under-test" : "bug-hunt-night";
const list = document.querySelector(".cards");
const filters = document.querySelector(".filters");
const cheapest = document.querySelector("#cheapest");
const tip = document.querySelector("#tip");
const summary = document.querySelector(".summary");

const byPrice = (a, b) => a.price - b.price;

// What should be on screen?
function visibleStalls() {
  const ordered = state.cheapest ? [...stalls].sort(byPrice) : stalls;
  return ordered.filter((stall) => state.tag === "all" || stall.tag === state.tag); // FIX 1: compare, don't assign
}

// What does my night cost? The saved stalls, plus a tip.
function nightTotal() {
  const savedStalls = stalls.filter((stall) => state.saved.has(stall.id));
  const food = savedStalls.reduce((sum, stall) => sum + stall.price, 0);
  return food + Number(tip.value); // FIX 2: form values are strings
}

function save() {
  const choices = { tag: state.tag, cheapest: state.cheapest, saved: [...state.saved] };
  localStorage.setItem(KEY, JSON.stringify(choices));
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!data) return;
    const { tag, cheapest, saved: ids } = data; // FIX 3: save() writes the choices flat, not under .choices
    state.tag = tag;
    state.cheapest = cheapest;
    state.saved = new Set(ids);
  } catch {
    // broken data: keep the defaults
  }
}

function card(stall) {
  const li = document.createElement("li");
  li.classList.toggle("sold", Boolean(stall.soldOut));
  const tag = document.createElement("small");
  tag.textContent = stall.tag;
  const name = document.createElement("span");
  name.textContent = stall.name;
  const price = document.createElement("em");
  price.textContent = stall.price === 0 ? "free" : `€${stall.price}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "save";
  button.dataset.id = stall.id;
  button.setAttribute("aria-pressed", String(state.saved.has(stall.id)));
  button.setAttribute("aria-label", `Save ${stall.name}`);
  const heart = document.createElement("span");
  heart.className = "heart";
  heart.textContent = state.saved.has(stall.id) ? "♥" : "♡";
  button.append(heart, " save");

  li.append(tag, name, price, button);
  return li;
}

function render() {
  list.replaceChildren(...visibleStalls().map(card));
  for (const b of filters.querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(b.dataset.filter === state.tag));
  }
  cheapest.checked = state.cheapest;
  summary.textContent = state.saved.size // FIX 5: the shorthand kept the old Set after load()
    ? `${state.saved.size} saved · your night: €${nightTotal()}`
    : "Save a stall to plan your night.";
}

function update() {
  render();
  save();
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.tag = button.dataset.filter;
  update();
});

cheapest.addEventListener("change", () => {
  state.cheapest = cheapest.checked;
  update();
});

tip.addEventListener("change", update);

list.addEventListener("click", (event) => {
  const id = event.target.closest(".save")?.dataset.id; // FIX 4: the target may be the heart inside
  if (!id) return;
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
  update();
});

load();
render();
