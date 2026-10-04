// Staff door. Lets staff through, keeps guests out.

import { mountSafe } from "./safe.js";

const KEY = "meridian.session";
const fresh = { role: "guest", visits: 0 };

function load() {
  try {
    return { ...fresh, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...fresh };
  }
}

function save(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

const session = load();
session.visits += 1;
save(session);

const doorCode = [3, 30, 5, 16, 124, 26, 104, 28, 98];

if (session.role === "staff") {
  const view = document.querySelector('[data-view="staff"]');
  view.hidden = false;
  view.querySelector(".door-code").textContent = doorCode.map((n) => String.fromCharCode(n ^ 81)).join("") + guestCard(6);
  mountSafe(view.querySelector(".safe-box"));
} else {
  const view = document.querySelector('[data-view="guest"]');
  view.hidden = false;
  view.querySelector(".visits").textContent = session.visits;
}
