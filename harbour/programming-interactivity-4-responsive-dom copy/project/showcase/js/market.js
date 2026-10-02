// ==========================================================================
// Harbour Night Market — market.js
// Every feature is the same loop: FIND an element, LISTEN for an event,
// CHANGE the page. JavaScript flips state; CSS (states.css) draws it.
// ==========================================================================

// ---------- 1 · The phone menu -------------------------------------------
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#main-nav");

// Without JavaScript the button stays hidden and the menu stays open.
// With it, we show the button and collapse the menu: progressive enhancement.
menuButton.hidden = false;
menuButton.setAttribute("aria-expanded", "false");

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
});

// Tapping a link inside the menu closes it again (event delegation)
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) menuButton.setAttribute("aria-expanded", "false");
});

// ---------- 2 · The vendor filter ------------------------------------------
const filters = document.querySelector(".filters");
const stalls = document.querySelectorAll(".stall");
const count = document.querySelector(".filter-count");

// One listener on the group, not one per button: the click bubbles up to it
filters.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return; // a click in the gap between buttons

  for (const b of filters.querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(b === button));
  }

  const tag = button.dataset.filter; // data-filter="food" → "food"
  let shown = 0;
  for (const stall of stalls) {
    stall.hidden = tag !== "all" && stall.dataset.tag !== tag;
    if (!stall.hidden) shown++;
  }
  count.textContent = tag === "all" ? "" : `${shown} of ${stalls.length} stalls`;
});

// ---------- 3 · The ticket form --------------------------------------------
const form = document.querySelector(".ticket-form");
const message = form.elements.message;
const left = document.querySelector("#message-left");
const result = document.querySelector(".ticket-result");

// "input" fires on every keystroke, paste and cut
message.addEventListener("input", () => {
  const remaining = message.maxLength - message.value.length;
  left.textContent = `${remaining} characters left`;
});

// A rule HTML can't express: a name needs at least one letter
const nameInput = form.elements.name;
nameInput.addEventListener("input", () => {
  const hasLetter = /\p{L}/u.test(nameInput.value);
  nameInput.setCustomValidity(hasLetter ? "" : "A name needs at least one letter.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault(); // don't reload the page: we handle it here

  const data = new FormData(form);
  const guests = Number(data.get("guests"));

  // Build the ticket from elements, not from an HTML string:
  // textContent never runs what a visitor typed
  const ticket = document.createElement("article");
  ticket.className = "ticket";

  const title = document.createElement("h3");
  title.textContent = `See you there, ${data.get("name")}!`;

  const details = document.createElement("p");
  details.textContent = `${guests} ${guests === 1 ? "person" : "people"} · ${data.get("arrival")}`;

  const number = document.createElement("p");
  number.className = "ticket-no";
  number.textContent = `Ticket #${Math.floor(1000 + Math.random() * 9000)} · sent to ${data.get("email")}`;

  ticket.append(title, details, number);
  if (data.get("message")) {
    const note = document.createElement("p");
    note.textContent = `Your note: “${data.get("message")}”`;
    ticket.append(note);
  }

  result.replaceChildren(ticket);
  form.reset();
  left.textContent = "Up to 140 characters.";
});
