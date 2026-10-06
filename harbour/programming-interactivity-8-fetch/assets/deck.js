/* ==========================================================================
   Deck — a tiny slide engine.
   ← → / space / PgUp PgDn  move (steps first, then slides)
   Home / End               first / last slide
   f  fullscreen    m  menu of all slides    n  speaker notes
   p  presenter window (notes, next slide, timer — synced)
   t  show the lecture clock in the footer
   Esc  leave an editor / input so arrows move slides again
   ========================================================================== */
(function () {
  "use strict";
  const W = 1600, H = 900;
  const params = new URLSearchParams(location.search);
  const MODE = params.has("presenter") ? "presenter" : params.has("embed") ? "embed" : "main";
  const deck = document.querySelector(".deck");
  const slides = [...deck.children].filter((s) => s.tagName === "SECTION");
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("l8-fetch-deck") : null;

  // --- act propagation: every slide inherits the last act marker -------------
  // data-theme on an act marker switches the look for every slide after it (Part 2 is "wire")
  let act = "0", actName = "Prologue", actAt = "0:00", theme = "";
  const acts = [];
  slides.forEach((s, i) => {
    if (s.dataset.act != null) {
      act = s.dataset.act;
      actName = s.dataset.actName || actName;
      actAt = s.dataset.at || actAt;
      if (s.dataset.theme != null) theme = s.dataset.theme;
      acts.push({ i, act, name: actName, at: actAt });
    }
    if (theme) s.classList.add(theme);
    s.dataset.actNum = act;
    s.dataset.actLabel = actName;
    s.dataset.planAt = actAt;
    s.classList.add("slide");
    if (!s.dataset.title) {
      const hd = s.querySelector("h1, h2");
      s.dataset.title = hd ? hd.textContent.replace(/\s+/g, " ").trim() : "Slide " + (i + 1);
    }
  });
  const toMin = (t) => { const [a, b] = String(t).split(":").map(Number); return a * 60 + (b || 0); };

  const stepsOf = (s) => Math.max(s.querySelectorAll(".step").length, +(s.dataset.steps || 0));
  let idx = 0, step = 0;

  if (MODE === "presenter") return presenter();

  // --- build stage ------------------------------------------------------------
  document.documentElement.classList.add("deck-root", "mode-" + MODE);
  const viewport = document.createElement("div");
  viewport.className = "deck-viewport";
  const stage = document.createElement("div");
  stage.className = "deck-stage";
  deck.parentNode.insertBefore(viewport, deck);
  viewport.append(stage);
  stage.append(deck);

  const chrome = document.createElement("div");
  chrome.className = "deck-chrome";
  chrome.innerHTML = `<div class="deck-progress"><i></i></div>
    <div class="deck-foot"><span class="deck-act"></span><span class="deck-clock" hidden></span><span class="deck-count"></span></div>`;
  stage.append(chrome);
  const bar = chrome.querySelector(".deck-progress i");
  const actEl = chrome.querySelector(".deck-act");
  const countEl = chrome.querySelector(".deck-count");
  const clockEl = chrome.querySelector(".deck-clock");

  const notesDrawer = document.createElement("div");
  notesDrawer.className = "deck-notes-drawer";
  notesDrawer.hidden = true;
  document.body.append(notesDrawer);

  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener("resize", fit);
  fit();

  // --- lazy work per slide ------------------------------------------------------
  function warm(s) {
    if (!s || s.dataset.warm) return;
    s.dataset.warm = "1";
    s.querySelectorAll("iframe[data-src]").forEach((f) => { f.src = f.dataset.src; });
    if (window.Kit) window.Kit.init(s);
  }

  function render() {
    slides.forEach((s, i) => s.classList.toggle("active", i === idx));
    const s = slides[idx];
    warm(s);
    warm(slides[idx + 1]);
    // pages pre-loaded while their slide was hidden couldn't scroll to their #section: ask again now
    setTimeout(() => s.querySelectorAll("iframe").forEach((f) => { try { f.contentWindow.postMessage({ deckShown: true }, "*"); } catch (e) {} }), 60);
    const total = stepsOf(s);
    const stepEls = [...s.querySelectorAll(".step")];
    stepEls.forEach((el, k) => el.classList.toggle("shown", k < step));
    for (let k = 1; k <= Math.max(total, 12); k++) s.classList.toggle("s" + k, k <= step);
    s.classList.toggle("s-done", step >= total);
    bar.style.width = ((idx + 1) / slides.length) * 100 + "%";
    actEl.textContent = /^[1-9]$/.test(s.dataset.actNum) ? `Act ${s.dataset.actNum} · ${s.dataset.actLabel}` : s.dataset.actLabel;
    countEl.textContent = `${idx + 1} / ${slides.length}`;
    document.documentElement.dataset.act = s.dataset.actNum;
    document.documentElement.classList.toggle("theme-wire", s.classList.contains("wire"));
    const hideChrome = s.classList.contains("no-chrome");
    chrome.classList.toggle("hidden", hideChrome);
    chrome.classList.toggle("on-dark", s.matches(".exercise, .title, .dark, .wire"));
    chrome.classList.toggle("on-act", s.matches(".act"));
    const note = s.querySelector("aside.notes");
    notesDrawer.innerHTML = `<b>${idx + 1}. ${s.dataset.title}</b>` + (note ? note.innerHTML : "<p><i>No notes.</i></p>");
    if (MODE === "main") {
      const hash = "#" + (idx + 1);
      if (location.hash !== hash) history.replaceState(null, "", hash);
      document.title = `${idx + 1}. ${s.dataset.title} — Over the wire`;
    }
  }

  function goto(i, st = 0, silent) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const leaving = slides[idx];
    if (i !== idx && document.activeElement && leaving.contains(document.activeElement)) document.activeElement.blur();
    idx = i;
    step = Math.max(0, Math.min(stepsOf(slides[i]), st));
    render();
    if (!silent) broadcast();
  }
  function next() {
    if (step < stepsOf(slides[idx])) { step++; render(); broadcast(); }
    else goto(idx + 1);
  }
  function prev() {
    if (step > 0) { step--; render(); broadcast(); }
    else if (idx > 0) goto(idx - 1, stepsOf(slides[idx - 1]));
  }
  function broadcast() {
    if (MODE === "main" && bc) bc.postMessage({ type: "state", idx, step });
  }

  // --- input ------------------------------------------------------------------
  const editable = (t) => t && t.closest && t.closest("input, textarea, select, [contenteditable]");
  function handleKey(key, e) {
    switch (key) {
      case "ArrowRight": case "PageDown": case " ": case "Spacebar": next(); break;
      case "ArrowLeft": case "PageUp": prev(); break;
      case "Home": goto(0); break;
      case "End": goto(slides.length - 1); break;
      case "f": case "F":
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        break;
      case "m": case "M": case "o": case "O": toggleMenu(); break;
      case "n": case "N": notesDrawer.hidden = !notesDrawer.hidden; break;
      case "p": case "P": window.open(location.pathname + "?presenter#" + (idx + 1), "l4-presenter", "width=1280,height=800"); break;
      case "t": case "T": toggleClock(); break;
      case "Escape": if (menu && !menu.hidden) toggleMenu(false); break;
      default: return false;
    }
    if (e) e.preventDefault();
    return true;
  }
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape" && editable(e.target)) { e.target.blur(); return; }
    if (editable(e.target)) return;
    if ((e.key === " " || e.key === "Enter") && e.target.closest && e.target.closest("button, summary, a, label")) return;
    if (MODE === "embed") return;
    handleKey(e.key, e);
  });
  // Clicks in the outer 100px of the window move back / forward (matches assets/slides.js).
  const EDGE = 100;
  function edgeDir(e) {
    if (MODE !== "main" || (menu && !menu.hidden)) return 0;
    if (!e.target.closest || e.target.closest("a, button, input, textarea, select, label, iframe, summary, [contenteditable], [data-no-nav], .deck-notes-drawer")) return 0;
    if (e.clientX < EDGE) return -1;
    if (e.clientX > innerWidth - EDGE) return 1;
    return 0;
  }
  document.addEventListener("click", (e) => {
    const d = edgeDir(e);
    if (d < 0) prev(); else if (d > 0) next();
  });
  document.addEventListener("mousemove", (e) => {
    document.documentElement.classList.toggle("nav-edge", edgeDir(e) !== 0);
  });
  addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.deckKey && MODE !== "embed") handleKey(d.deckKey);
    if (d.deckGoto) goto(d.deckGoto[0], d.deckGoto[1], true);
  });
  addEventListener("hashchange", () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n) && n - 1 !== idx) goto(n - 1);
  });
  if (bc) bc.onmessage = (e) => {
    const d = e.data || {};
    if (MODE !== "main") return;
    if (d.type === "goto") goto(d.idx, d.step, true), broadcast();
    if (d.type === "hello") broadcast();
    if (d.type === "key") handleKey(d.key);
  };

  // --- clock ----------------------------------------------------------------------
  let clockTimer = null;
  function toggleClock() {
    clockEl.hidden = !clockEl.hidden;
    if (!clockEl.hidden && !clockTimer) {
      const start = Date.now();
      const tick = () => {
        const m = Math.floor((Date.now() - start) / 60000);
        const plan = toMin(slides[idx].dataset.planAt);
        clockEl.textContent = `⏱ ${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} · plan ${slides[idx].dataset.planAt}`;
        clockEl.classList.toggle("late", m - plan > 20);
      };
      tick();
      clockTimer = setInterval(tick, 15000);
    }
  }

  // --- menu -----------------------------------------------------------------------
  let menu = null;
  function toggleMenu(force) {
    if (!menu) {
      menu = document.createElement("nav");
      menu.className = "deck-menu";
      menu.hidden = true;
      let html = "";
      let cur = null;
      slides.forEach((s, i) => {
        if (s.dataset.actLabel !== cur) {
          if (cur !== null) html += "</ol></section>";
          cur = s.dataset.actLabel;
          html += `<section data-act="${s.dataset.actNum}"><h3>${/^[1-9]$/.test(s.dataset.actNum) ? "Act " + s.dataset.actNum + " · " : ""}${cur} <small>${s.dataset.planAt}</small></h3><ol>`;
        }
        const kind = s.classList.contains("exercise") ? " ex" : s.classList.contains("quiz") ? " qz" : "";
        html += `<li class="${kind}"><a href="#${i + 1}" data-i="${i}"><span>${i + 1}</span>${s.dataset.title}</a></li>`;
      });
      html += "</ol></section>";
      menu.innerHTML = `<div class="deck-menu-inner"><header><b>All slides</b><span>click to jump · <kbd>m</kbd> to close</span></header><div class="deck-menu-cols">${html}</div></div>`;
      menu.addEventListener("click", (e) => {
        const a = e.target.closest("a[data-i]");
        if (a) { e.preventDefault(); goto(+a.dataset.i); toggleMenu(false); }
        else if (e.target === menu) toggleMenu(false);
      });
      document.body.append(menu);
    }
    menu.hidden = force === undefined ? !menu.hidden : !force;
    if (!menu.hidden) {
      menu.querySelectorAll("a").forEach((a) => a.classList.toggle("current", +a.dataset.i === idx));
      const c = menu.querySelector("a.current");
      c && c.scrollIntoView({ block: "center" });
    }
  }

  // --- start --------------------------------------------------------------------
  const start = parseInt(location.hash.slice(1), 10);
  goto(isNaN(start) ? 0 : start - 1, 0, MODE === "embed");
  if (MODE === "embed") {
    const st = +(params.get("step") || 0);
    if (st) goto(idx, st, true);
  }

  /* ==========================================================================
     Presenter view — opens with `p`, stays in sync over BroadcastChannel
     ========================================================================== */
  function presenter() {
    document.documentElement.classList.add("presenter-root");
    deck.hidden = true;
    const base = location.pathname;
    const startAt = parseInt(location.hash.slice(1), 10) || 1;
    idx = startAt - 1;
    const root = document.createElement("div");
    root.className = "presenter";
    root.innerHTML = `
      <div class="pv-main"><div class="pv-frame"><iframe id="pv-cur" title="Current slide"></iframe></div></div>
      <aside class="pv-side">
        <div class="pv-top">
          <div class="pv-clock"><b id="pv-elapsed">0:00</b><small id="pv-plan"></small></div>
          <div class="pv-btns"><button id="pv-prev">←</button><button id="pv-next">→</button><button id="pv-reset" title="Restart the lecture clock">⟲</button></div>
        </div>
        <div class="pv-next"><small>Next</small><div class="pv-frame small"><iframe id="pv-nxt" title="Next slide"></iframe></div></div>
        <div class="pv-notes" id="pv-notes"></div>
        <ol class="pv-acts" id="pv-acts"></ol>
      </aside>`;
    document.body.append(root);
    const cur = root.querySelector("#pv-cur"), nxt = root.querySelector("#pv-nxt");
    cur.src = base + "?embed#" + (idx + 1);
    nxt.src = base + "?embed#" + (idx + 2);
    const notesEl = root.querySelector("#pv-notes");
    const actsEl = root.querySelector("#pv-acts");
    actsEl.innerHTML = acts.map((a) => `<li data-i="${a.i}"><span>${a.at}</span>${/^[1-9]$/.test(a.act) ? "Act " + a.act + " · " : ""}${a.name}</li>`).join("");
    let t0 = +(sessionStorage.getItem("pv-t0") || Date.now());
    sessionStorage.setItem("pv-t0", t0);

    function scaleFrames() {
      root.querySelectorAll(".pv-frame").forEach((fr) => {
        const f = fr.querySelector("iframe");
        const s = fr.clientWidth / W;
        f.style.transform = `scale(${s})`;
        fr.style.height = H * s + "px";
      });
    }
    addEventListener("resize", scaleFrames);
    function show() {
      const s = slides[idx];
      const post = (f, i, st) => { try { f.contentWindow.postMessage({ deckGoto: [i, st] }, "*"); } catch (e) {} };
      post(cur, idx, step);
      post(nxt, Math.min(idx + 1, slides.length - 1), 0);
      const note = s.querySelector("aside.notes");
      const total = stepsOf(s);
      notesEl.innerHTML = `<h4>${idx + 1}. ${s.dataset.title}${total ? ` <em>step ${step}/${total}</em>` : ""}</h4>` + (note ? note.innerHTML : "<p><i>No notes.</i></p>");
      actsEl.querySelectorAll("li").forEach((li) => {
        const a = +li.dataset.i;
        li.classList.toggle("done", a < idx && slides[idx].dataset.actNum !== slides[a].dataset.actNum);
        li.classList.toggle("now", slides[a].dataset.actNum === s.dataset.actNum && slides[a].dataset.actLabel === s.dataset.actLabel);
      });
      history.replaceState(null, "", "?presenter#" + (idx + 1));
      tick();
    }
    function tick() {
      const m = Math.floor((Date.now() - t0) / 60000);
      root.querySelector("#pv-elapsed").textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
      const s = slides[idx];
      const nextAct = acts.find((a) => a.i > idx);
      const planEnd = nextAct ? toMin(nextAct.at) : 180;
      const diff = m - planEnd;
      const el = root.querySelector("#pv-plan");
      el.textContent = `plan: this part ${s.dataset.planAt}–${nextAct ? nextAct.at : "3:00"}` + (diff > 0 ? ` · ${diff} min over` : ` · ${-diff} min left`);
      el.className = diff > 0 ? "late" : "";
    }
    setInterval(tick, 10000);
    const move = (fn) => { fn(); show(); if (bc) bc.postMessage({ type: "goto", idx, step }); };
    const pNext = () => move(() => { if (step < stepsOf(slides[idx])) step++; else if (idx < slides.length - 1) { idx++; step = 0; } });
    const pPrev = () => move(() => { if (step > 0) step--; else if (idx > 0) { idx--; step = stepsOf(slides[idx]); } });
    root.querySelector("#pv-next").onclick = pNext;
    root.querySelector("#pv-prev").onclick = pPrev;
    root.querySelector("#pv-reset").onclick = () => { t0 = Date.now(); sessionStorage.setItem("pv-t0", t0); tick(); };
    actsEl.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) move(() => { idx = +li.dataset.i; step = 0; }); });
    document.addEventListener("keydown", (e) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); pNext(); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); pPrev(); }
    });
    addEventListener("message", (e) => {
      const d = e.data || {};
      if (d.deckKey === "ArrowRight" || d.deckKey === "PageDown") pNext();
      if (d.deckKey === "ArrowLeft" || d.deckKey === "PageUp") pPrev();
    });
    if (bc) {
      bc.onmessage = (e) => { const d = e.data || {}; if (d.type === "state") { idx = d.idx; step = d.step; show(); } };
      bc.postMessage({ type: "hello" });
    }
    cur.addEventListener("load", show);
    nxt.addEventListener("load", show);
    scaleFrames();
    show();
  }
})();
