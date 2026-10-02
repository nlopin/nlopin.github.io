// ==========================================================================
// Harbour Night Market — market.js (Lecture 5)
//
// The vendor list isn't typed into the HTML any more: it's drawn from data.
//
//     an event  →  changes state  →  render() draws the page from state
//
// Everything is in one file, and every name in it is global.
// Exercise 5 splits it into modules: the numbered sections are the seams.
// ==========================================================================


// ---------- 1 · Data: the market ------------------------------------------
// Next week this array comes from a server. Nothing else will change.
const stalls = [
  {
    id: "dumplings", name: "Dumpling Dynasty", tag: "food", price: 8, soldOut: false, featured: true,
    blurb: "Hand-folded xiaolongbao, steamed in front of you. The queue is part of the experience, and so is the chilli oil.",
  },
  {
    id: "side-b", name: "Side B Records", tag: "music", price: 12, soldOut: false,
    blurb: "Crates of second-hand vinyl, sorted by mood instead of genre.",
  },
  {
    id: "salt-ink", name: "Salt & Ink", tag: "crafts", price: 15, soldOut: false,
    blurb: "Risograph posters of the port, printed in two colours and signed while you wait. Ask for the one with the crane.",
  },
  {
    id: "churros", name: "Churros Till Late", tag: "food", price: 5, soldOut: true,
    blurb: "Crisp, sugared and dunked in thick chocolate.",
  },
  {
    id: "plant-swap", name: "The Plant Swap", tag: "crafts", price: 0, soldOut: false,
    blurb: "Bring a cutting, take a cutting. Pots are free, advice is free, gossip is extra.",
  },
  {
    id: "mezcal", name: "Mezcal Moon", tag: "drinks", price: 9, soldOut: true,
    blurb: "Small-batch mezcal and orange slices dusted with chilli salt. Sip, don't shoot. Last orders at half past midnight.",
  },
  {
    id: "taco-bike", name: "Taco Bike", tag: "food", price: 6, soldOut: false,
    blurb: "Tacos al pastor from a cargo bike. Pineapple on the spit, salsa as hot as you dare.",
  },
  {
    id: "lemonade", name: "Lantern Lemonade", tag: "drinks", price: 3, soldOut: false,
    blurb: "Fresh lemonade with a sprig of mint, served in a paper lantern cup.",
  },
];


// ---------- 2 · State: what the visitor chose -------------------------------
// Everything that can change, and nothing you can work out from it.
const state = {
  tag: "all",       // the pressed filter button
  query: "",        // what's typed in the search box
  saved: new Set(), // ids of the ♥ stalls
};

// Derived, never stored: what should be on screen right now?
function visibleStalls() {
  const q = state.query.trim().toLowerCase();
  return stalls
    .filter((stall) => state.tag === "all" || stall.tag === state.tag)
    .filter((stall) => stall.name.toLowerCase().includes(q));
}

function toggleSaved(id) {
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
}


// ---------- 3 · Storage: remember the choices -------------------------------
// localStorage keeps strings, so the choices go through JSON.
// The search box is left out on purpose: nobody expects it back tomorrow.
const KEY = "harbour-night";

function save() {
  const data = { tag: state.tag, saved: [...state.saved] }; // a Set isn't JSON
  localStorage.setItem(KEY, JSON.stringify(data));
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!data) return; // first visit
    state.tag = data.tag ?? "all";
    state.saved = new Set(data.saved ?? []);
  } catch {
    // broken or old data: keep the defaults
  }
}


// ---------- 4 · Render: draw the page from state ----------------------------
const template = document.querySelector("#stall-template");
const list = document.querySelector(".vendor-list");
const filters = document.querySelector(".filters");
const count = document.querySelector(".filter-count");
const savedCount = document.querySelector(".saved-count");
const search = document.querySelector("#vendor-search");

// Data in, element out
function card(stall) {
  const li = template.content.firstElementChild.cloneNode(true);
  li.dataset.id = stall.id;
  li.dataset.tag = stall.tag;

  const article = li.querySelector(".vendor-card");
  article.classList.toggle("featured", Boolean(stall.featured));
  article.classList.toggle("sold-out", Boolean(stall.soldOut)); // Boolean: a missing key is undefined, and toggle(name, undefined) flips

  li.querySelector(".tag").textContent = stall.tag;
  li.querySelector("h3").textContent = stall.name;
  li.querySelector(".blurb").textContent = stall.blurb;
  li.querySelector(".price").textContent = stall.price === 0 ? "free" : `from €${stall.price}`;
  li.querySelector(".badge").hidden = !stall.soldOut;

  const isSaved = state.saved.has(stall.id);
  const save = li.querySelector(".save");
  save.setAttribute("aria-pressed", String(isSaved));
  save.setAttribute("aria-label", `Save ${stall.name}`);
  save.textContent = isSaved ? "♥" : "♡";
  return li;
}

// Draws everything that depends on state. Safe to call any number of times.
function render() {
  const visible = visibleStalls();

  if (visible.length) {
    list.replaceChildren(...visible.map(card));
  } else {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = `No stall matches “${state.query}”.`; // textContent: their words stay text
    list.replaceChildren(empty);
  }

  for (const button of filters.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === state.tag));
  }
  count.textContent = visible.length === stalls.length ? "" : `${visible.length} of ${stalls.length} stalls`;
  savedCount.textContent = state.saved.size ? `♥ ${state.saved.size} saved` : "";

  // Controls are part of the page too: draw them from state
  // (only when different: rewriting the box you're typing in can move the cursor)
  if (search.value !== state.query) search.value = state.query;
}

// Every change goes through here: draw, then remember
function update() {
  render();
  save();
}


// ---------- 5 · Events: change state, then update ---------------------------
filters.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.tag = button.dataset.filter;
  update();
});

document.querySelector("#vendor-search").addEventListener("input", (event) => {
  state.query = event.target.value;
  update();
});

// The cards are redrawn all the time: one listener on the list hears every ♡
list.addEventListener("click", (event) => {
  const button = event.target.closest(".save");
  if (!button) return;
  toggleSaved(button.closest(".stall").dataset.id);
  update();
});


// ---------- 6 · The phone menu (Lecture 4) ----------------------------------
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#main-nav");

menuButton.hidden = false;
menuButton.setAttribute("aria-expanded", "false");

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) menuButton.setAttribute("aria-expanded", "false");
});


// ---------- 7 · The ticket form (Lecture 4) ---------------------------------
const form = document.querySelector(".ticket-form");
const message = form.elements.message;
const left = document.querySelector("#message-left");
const result = document.querySelector(".ticket-result");

message.addEventListener("input", () => {
  left.textContent = `${message.maxLength - message.value.length} characters left`;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const guests = Number(data.get("guests"));

  const ticket = document.createElement("article");
  ticket.className = "ticket";
  const title = document.createElement("h3");
  title.textContent = `See you there, ${data.get("name")}!`;
  const details = document.createElement("p");
  details.textContent = `${guests} ${guests === 1 ? "person" : "people"} · ${data.get("arrival")}`;
  ticket.append(title, details);

  result.replaceChildren(ticket);
  form.reset();
  left.textContent = "Up to 140 characters.";
});


// ---------- 8 · Start ---------------------------------------------------------
load();
render();
