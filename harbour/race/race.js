/* ==========================================================================
   Race — puts the student on the big-screen board (race/board.html).
   Include on an exercise page after kit.js:
     <script type="module" src="../../race/race.js"></script>
   A panel counts as solved when kit.js gives it the `solved` class; kit.js
   itself knows nothing about the race. A page with its own game loop instead
   declares <meta name="race-tasks" content="N"> and fires
     document.dispatchEvent(new CustomEvent("race:solved", { detail: { task: i } }))
   for i in 0…N-1. Joining: open the page with ?race=CODE (the board's QR
   code), or press "Join race" and type the code.
   ========================================================================== */
import { db, signIn, cleanCode, TASK_SEL, ref, get, set, update, onValue, onDisconnect, serverTimestamp } from "./firebase.js";

const STORE = "race";          // { room, path, at } — the race this browser is in
const NAME = "race.name";      // { name, at } — remembered across races
const MAX_AGE = 6 * 3600e3;    // a race is one class
const NAME_AGE = 15 * 86400e3; // the name outlives it: 15 days since the last race

const norm = (p) => decodeURI(p).replace(/\.html$/, "").replace(/\/index$/, "/");
const here = norm(location.pathname);
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const savedName = () => { const n = read(NAME); return n && n.name && Date.now() - n.at < NAME_AGE ? n.name : ""; };

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  el.append(...kids);
  return el;
}

document.head.append(h("style", { text: `
  .race-dock { position: fixed; right: 16px; bottom: 16px; z-index: 50; display: flex; align-items: center; gap: 0.5rem;
    font: 600 14px/1 "JetBrains Mono", ui-monospace, monospace; color: #ffd23f; background: #17140f;
    border-radius: 999px; padding: 0.55rem 0.6rem 0.55rem 1rem; box-shadow: 0 6px 24px rgb(0 0 0 / 0.25); }
  .race-dock button { font: inherit; color: inherit; background: transparent; border: 1.5px solid currentColor; border-radius: 999px; padding: 0.35rem 0.7rem; cursor: pointer; }
  .race-dock .race-score { color: #fffdf8; }
  .race-dock .race-off { color: #ff5a36; }
  .race-dialog { border: 2px solid #17140f; border-radius: 12px; padding: 1.5rem; max-width: min(360px, calc(100vw - 32px));
    font: 400 16px/1.4 "Bricolage Grotesque", system-ui, sans-serif; color: #17140f; background: #fffdf8; }
  .race-dialog::backdrop { background: rgb(23 20 15 / 0.5); }
  .race-dialog.race-dialog h2 { margin: 0 0 1rem; font: 800 1.5rem/1.2 "Bricolage Grotesque", system-ui, sans-serif; letter-spacing: 0; color: #17140f; }
  .race-dialog.race-dialog label { color: #17140f; display: block; margin: 0 0 0.9rem; font-weight: 600; }
  .race-dialog input { display: block; width: 100%; box-sizing: border-box; margin-top: 0.3rem; padding: 0.55rem 0.7rem;
    font: 600 1.1rem "JetBrains Mono", ui-monospace, monospace; border: 2px solid #17140f; border-radius: 8px; background: #fff; color: #17140f; }
  .race-dialog input[name=code] { text-transform: uppercase; letter-spacing: 0.3em; }
  .race-dialog .race-err { color: #c4300f; min-height: 1.4em; margin: 0 0 0.8rem; font-size: 0.9rem; }
  .race-dialog .race-err a { color: #2f49ff; }
  .race-dialog .race-row { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .race-dialog button { font: 700 1rem "Bricolage Grotesque", system-ui, sans-serif; padding: 0.55rem 1.1rem; border-radius: 8px;
    border: 2px solid #17140f; background: transparent; color: #17140f; cursor: pointer; }
  .race-dialog button[type=submit] { background: #17140f; color: #ffd23f; }
` }));

const dock = h("div", { class: "race-dock", "data-no-nav": "" });

/* ---- join ------------------------------------------------------------- */
function askToJoin(code = "", err = "") {
  const name = h("input", { name: "name", required: "", maxlength: "24", autocomplete: "nickname" });
  name.value = savedName();
  const codeIn = h("input", { name: "code", required: "", maxlength: "4", autocomplete: "off", spellcheck: "false" });
  codeIn.value = code;
  const msg = h("p", { class: "race-err", "aria-live": "polite" }, ...[].concat(err));
  const go = h("button", { type: "submit", text: "Join" });
  const dlg = h("dialog", { class: "race-dialog" },
    h("form", { method: "dialog" },
      h("h2", { text: "🏁 Join the race" }),
      h("label", {}, "Your name", name),
      h("label", {}, "Race code (on the big screen)", codeIn),
      msg,
      h("div", { class: "race-row" }, h("button", { type: "button", text: "Cancel", onclick: () => dlg.close() }), go)));
  dlg.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = name.value.trim().slice(0, 24), c = cleanCode(codeIn.value);
    if (!n || c.length !== 4) { msg.textContent = "Type your name and the 4-letter code."; return; }
    go.disabled = true;
    msg.textContent = "Connecting…";
    const problem = await join(c, n);
    go.disabled = false;
    if (problem) { msg.textContent = ""; msg.append(...[].concat(problem)); return; }
    dlg.close();
  });
  dlg.addEventListener("close", () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  (name.value ? codeIn : name).focus();
}

// Returns nothing on success, or what to tell the student.
async function join(room, name) {
  let uid, meta;
  try {
    uid = await signIn();
    meta = (await get(ref(db, `rooms/${room}/meta`))).val();
  } catch (e) {
    return `Couldn't reach the race server (${e.code || e.message}).`;
  }
  if (!meta) return `There's no race with code ${room}.`;
  if (norm(meta.ex) !== here) {
    const url = new URL(meta.ex, location.origin);
    url.searchParams.set("race", room);
    return ["This race is on another exercise: ", h("a", { href: url.href, text: meta.title || "open it" }), "."];
  }
  write(NAME, { name, at: Date.now() });
  write(STORE, { room, path: here, at: Date.now() });
  await race(room, uid, name, meta);
}

/* ---- racing ----------------------------------------------------------- */
async function race(room, uid, name, meta) {
  const me = ref(db, `rooms/${room}/players/${uid}`);
  const done = new Set(Object.keys((await get(ref(db, `rooms/${room}/players/${uid}/solved`))).val() || {}));
  const tasks = [...document.querySelectorAll(TASK_SEL)].filter((el) => el.querySelector(".live-checks"));
  const total = meta.total || tasks.length;

  // Online now, offline the moment the tab closes — and again after every reconnect.
  onValue(ref(db, ".info/connected"), (snap) => {
    if (!snap.val()) { paint(false); return; }
    onDisconnect(me).update({ online: false });
    update(me, { name, online: true });
    paint(true);
  });

  // Solves only count up: breaking the code after a solve doesn't move the car back.
  const record = (i) => {
    if (!(i >= 0 && i < total) || done.has(`t${i}`)) return;
    done.add(`t${i}`);
    set(ref(db, `rooms/${room}/players/${uid}/solved/t${i}`), serverTimestamp());
    paint(true);
  };
  tasks.forEach((el, i) => {
    const check = () => { if (el.classList.contains("solved")) record(i); };
    check();
    new MutationObserver(check).observe(el, { attributes: true, attributeFilter: ["class"] });
  });
  document.addEventListener("race:solved", (e) => record(Math.floor(e.detail.task)));

  function paint(online) {
    dock.textContent = "";
    dock.append(
      h("span", { class: online ? "" : "race-off", text: online ? `🏁 ${room}` : "⚠ offline" }),
      h("span", { text: name }),
      h("span", { class: "race-score", text: `${done.size}/${total}` }),
      h("button", { type: "button", text: "leave", title: "Leave the race", onclick: leave }));
  }
  async function leave() {
    write(STORE, null);
    await onDisconnect(me).cancel();
    await update(me, { online: false });
    location.reload();
  }
}

/* ---- start ------------------------------------------------------------ */
function idle() {
  dock.textContent = "";
  dock.append(h("button", { type: "button", text: "🏁 Join race", onclick: () => askToJoin() }));
}

document.body.append(dock);
const fromUrl = cleanCode(new URLSearchParams(location.search).get("race"));
const saved = read(STORE);
const fresh = saved && saved.path === here && Date.now() - saved.at < MAX_AGE;

if (fromUrl) {
  const url = new URL(location.href);
  url.searchParams.delete("race");
  history.replaceState(null, "", url);
}
idle();
if (fromUrl && !(fresh && saved.room === fromUrl && savedName())) askToJoin(fromUrl);
else if (fresh && savedName()) join(saved.room, savedName()).then((problem) => { if (problem) { write(STORE, null); askToJoin(saved.room, problem); } });
