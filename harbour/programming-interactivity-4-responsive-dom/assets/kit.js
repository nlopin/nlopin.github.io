/* ==========================================================================
   Kit — interactive components for the lectures (CSS editors, JS editors, labs).
   Kit.init(root) upgrades every component inside `root` once.
   Pages call it on load; the deck calls it lazily per slide.
   ========================================================================== */
(function () {
  "use strict";

  const Kit = (window.Kit = {});
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const MO = "⟦", MC = "⟧"; // mark open / close inside code samples
  const inDeck = (el) => !!el.closest(".deck");

  function dedent(s) {
    s = String(s).replace(/^\s*\n/, "").replace(/\s+$/, "");
    const lines = s.split("\n");
    const ind = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
    const min = ind.length ? Math.min(...ind) : 0;
    return lines.map((l) => l.slice(min)).join("\n");
  }
  Kit.dedent = dedent;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid);
    return el;
  }

  /* ------------------------------------------------------------------------
     Syntax highlighting
     ------------------------------------------------------------------------ */
  function hlValue(v) {
    const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(!\s*important)|(#[0-9a-fA-F]{3,8}\b)|(--[\w-]+)|([\w-]+)(?=\()|(-?(?:\d*\.)?\d+(?:%|[a-zA-Z]+)?)|([⟦⟧])/g;
    let out = "", last = 0, m;
    while ((m = re.exec(v))) {
      out += esc(v.slice(last, m.index));
      const t = m[0];
      if (m[1]) out += `<span class="t-str">${esc(t)}</span>`;
      else if (m[2]) out += `<span class="t-imp">${esc(t)}</span>`;
      else if (m[3]) out += `<span class="t-hex">${t}</span>`;
      else if (m[4]) out += `<span class="t-var">${t}</span>`;
      else if (m[5]) out += `<span class="t-fn">${t}</span>`;
      else if (m[6]) out += `<span class="t-num">${t}</span>`;
      else out += t === MO ? "<mark>" : "</mark>";
      last = re.lastIndex;
    }
    out += esc(v.slice(last));
    // bare keywords (tomato, bold, solid…) get the value colour too
    return `<span class="t-val">${out}</span>`;
  }
  function wrapTrim(cls, s) {
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    return m[2] ? `${esc(m[1])}<span class="${cls}">${esc(m[2])}</span>${esc(m[3])}` : esc(s);
  }
  function hlAt(chunk) {
    const m = chunk.match(/^([\s\S]*?)(@[\w-]+)([\s\S]*)$/);
    if (!m) return hlValue(chunk);
    return esc(m[1]) + `<span class="t-at">${m[2]}</span>` + hlValue(m[3]);
  }
  const NESTING_AT = /^\s*@(media|supports|layer|container|document|scope|starting-style)\b/;

  function hlCSS(src, startInDecls) {
    let out = "", i = 0;
    const n = src.length;
    const stack = startInDecls ? ["decls"] : [];
    let sub = "prop", prelude = "";
    const top = () => (stack.length ? stack[stack.length - 1] : "rules");
    const stopAt = (stops, from) => {
      let j = from;
      while (j < n && !stops.includes(src[j]) && !src.startsWith("/*", j)) {
        if (src[j] === '"' || src[j] === "'") {
          const q = src[j++];
          while (j < n && src[j] !== q && src[j] !== "\n") j++;
        }
        j++;
      }
      return Math.min(j, n);
    };
    while (i < n) {
      if (src.startsWith("/*", i)) {
        let j = src.indexOf("*/", i + 2);
        j = j < 0 ? n : j + 2;
        out += `<span class="t-c">${esc(src.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      const ch = src[i];
      if (ch === MO || ch === MC) { out += ch === MO ? "<mark>" : "</mark>"; i++; continue; }
      if (top() === "rules") {
        const j = stopAt("{};" + MO + MC, i);
        const chunk = src.slice(i, j);
        if (chunk) {
          prelude += chunk;
          out += /^\s*@/.test(prelude) ? hlAt(chunk) : wrapTrim("t-sel", chunk);
        }
        i = j;
        if (i < n) {
          const c = src[i];
          if (c === "{") { stack.push(NESTING_AT.test(prelude) ? "rules" : "decls"); sub = "prop"; prelude = ""; out += '<span class="t-p">{</span>'; i++; }
          else if (c === "}") { stack.pop(); prelude = ""; out += '<span class="t-p">}</span>'; i++; }
          else if (c === ";") { prelude = ""; out += '<span class="t-p">;</span>'; i++; }
        }
        continue;
      }
      if (sub === "prop") {
        const j = stopAt(":;{}" + MO + MC, i);
        const chunk = src.slice(i, j);
        const c = src[j];
        if (c === "{") { out += wrapTrim("t-sel", chunk) + '<span class="t-p">{</span>'; stack.push("decls"); i = j + 1; continue; }
        out += wrapTrim("t-prop", chunk);
        i = j;
        if (c === ":") { out += '<span class="t-p">:</span>'; sub = "val"; i++; }
        else if (c === ";") { out += '<span class="t-p">;</span>'; i++; }
        else if (c === "}") { out += '<span class="t-p">}</span>'; stack.pop(); sub = "prop"; i++; }
        continue;
      }
      // value
      const j = stopAt(";}" + MO + MC, i);
      out += hlValue(src.slice(i, j));
      i = j;
      const c = src[i];
      if (c === ";") { out += '<span class="t-p">;</span>'; sub = "prop"; i++; }
      else if (c === "}") { out += '<span class="t-p">}</span>'; stack.pop(); sub = "prop"; i++; }
    }
    return out;
  }

  function hlTag(t) {
    const m = t.match(/^(<\/?)([\w-]+)([\s\S]*?)(\/?>)$/);
    if (!m) return esc(t);
    let a = "", last = 0, mm;
    const raw = m[3];
    const ar = /([^\s=]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g;
    while ((mm = ar.exec(raw))) {
      a += esc(raw.slice(last, mm.index));
      a += `<span class="t-attr">${esc(mm[1])}</span>`;
      if (mm[2]) {
        const val = mm[3] || "";
        const isStyle = mm[1].toLowerCase() === "style" && /^["']/.test(val);
        a += `<span class="t-p">${esc(mm[2])}</span>` + (isStyle
          ? `<span class="t-aval">${val[0]}</span>${hlCSS(val.slice(1, -1), true)}<span class="t-aval">${val.slice(-1)}</span>`
          : `<span class="t-aval">${esc(val)}</span>`);
      }
      last = ar.lastIndex;
    }
    a += esc(raw.slice(last));
    return `<span class="t-p">${esc(m[1])}</span><span class="t-tag">${m[2]}</span>${a}<span class="t-p">${esc(m[4])}</span>`;
  }

  function hlHTML(src) {
    const re = /<!--[\s\S]*?-->|(<style\b[^>]*>)([\s\S]*?)(<\/style>)|<\/?[a-zA-Z][\w-]*(?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>|[⟦⟧]/g;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const t = m[0];
      if (t === MO) out += "<mark>";
      else if (t === MC) out += "</mark>";
      else if (t.startsWith("<!--")) out += `<span class="t-c">${esc(t)}</span>`;
      else if (m[1]) out += hlTag(m[1]) + hlCSS(m[2]) + hlTag(m[3]);
      else out += hlTag(t);
      last = re.lastIndex;
    }
    out += esc(src.slice(last));
    return out.replace(/⟦/g, "<mark>").replace(/⟧/g, "</mark>");
  }
  // one element per line, children indented: the HTML tab must be readable at a glance
  const VOID_EL = new Set(["input", "img", "br", "hr", "meta", "link", "source", "wbr"]);
  function prettyHTML(src) {
    const tpl = document.createElement("template");
    tpl.innerHTML = src;
    const out = [];
    const openTag = (e) => "<" + e.localName + [...e.attributes].map((a) => (a.value === "" ? " " + a.name : ` ${a.name}="${a.value}"`)).join("") + ">";
    (function walk(node, depth) {
      for (const ch of node.childNodes) {
        const pad = "  ".repeat(depth);
        if (ch.nodeType === 3) { const t = ch.textContent.replace(/\s+/g, " ").trim(); if (t) out.push(pad + t); continue; }
        if (ch.nodeType !== 1) continue;
        const tag = ch.localName;
        if (VOID_EL.has(tag)) { out.push(pad + openTag(ch)); continue; }
        const inner = ch.innerHTML.replace(/\s+/g, " ").trim();
        if (!ch.children.length || (inner.length < 60 && ![...ch.children].some((k) => k.children.length))) out.push(pad + openTag(ch) + inner + `</${tag}>`);
        else { out.push(pad + openTag(ch)); walk(ch, depth + 1); out.push(pad + `</${tag}>`); }
      }
    })(tpl.content, 0);
    return out.join("\n");
  }
  Kit.prettyHTML = prettyHTML;
  const hl = (lang, src) => (lang === "html" ? hlHTML(src) : lang === "css" ? hlCSS(src) : lang === "js" ? hlJS(src) : esc(src).replace(/⟦/g, "<mark>").replace(/⟧/g, "</mark>"));
  Kit.hl = hl;

  function upgradeCode(root) {
    root.querySelectorAll('script[type="text/x-code"]').forEach((s) => {
      const pre = h("pre", { class: "code " + (s.className || "") });
      // a sample can't contain a literal </script>: write <\/script> and it is shown as </script>
      pre.innerHTML = hl(s.dataset.lang || "css", dedent(s.textContent).replace(/<\\\//g, "</"));
      if (s.getAttribute("style")) pre.setAttribute("style", s.getAttribute("style"));
      s.replaceWith(pre);
    });
    root.querySelectorAll("pre.code[data-lang]:not([data-ready])").forEach((pre) => {
      pre.dataset.ready = "";
      pre.innerHTML = hl(pre.dataset.lang, dedent(pre.textContent));
    });
  }

  /* ------------------------------------------------------------------------
     Live editor
     ------------------------------------------------------------------------ */
  const FONT_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;700&family=Space+Mono:wght@400;700&display=swap">';
  const KEY_FORWARD = "<script>addEventListener('keydown',function(e){if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['ArrowRight','ArrowLeft','PageUp','PageDown'].indexOf(e.key)>-1){parent.postMessage({deckKey:e.key},'*')}});document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(a&&!a.getAttribute('href').startsWith('#'))e.preventDefault()})<\/script>";
  const PREVIEW_BASE = "body{margin:20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.4}";

  function LiveEditor(root) {
    const get = (r) => {
      const s = root.querySelector(`:scope > script[data-role="${r}"]`);
      return s ? dedent(s.textContent) : null;
    };
    const html = get("html") || "";
    const base = get("base") || "";
    const locked = get("locked");
    const solution = get("solution"); // renders a hidden twin: the "chalk outline" target
    const checks = JSON.parse(get("checks") || "null");
    const raw = root.hasAttribute("data-raw"); // browser defaults only
    const ta0 = root.querySelector(":scope > textarea");
    const initial = dedent(ta0 ? ta0.value : "");
    const fileName = root.dataset.file || "style.css";
    const zoom = parseFloat(root.dataset.zoom || (inDeck(root) ? "1.45" : "1"));
    const measureSel = root.dataset.measure || "";
    const gridSel = root.dataset.grid || "";
    const flexSel = root.dataset.flex || "";
    const targetSel = root.dataset.target || (checks || []).filter((c) => c.match).map((c) => c.match).join(", ");
    const [rMin, rMax, rStart] = (root.dataset.resizable || "").split(/[-,]/).map(Number);
    let vwNow = rStart || rMax || 0;
    const presetWidths = (root.dataset.presets || "").split(",").map(Number).filter(Boolean);
    const burglars = root.hasAttribute("data-burglars"); // outline whatever makes the page scroll sideways
    // checks that must hold at several window widths run in hidden frames of those widths
    const checkWidths = [...new Set((checks || []).flatMap((c) => [].concat(c.at || [], c.noScroll || [])))].map(Number);
    root.textContent = "";

    // editor pane
    const pre = h("pre", { "aria-hidden": "true" });
    const ta = h("textarea", { spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": fileName + " editor" });
    ta.value = initial;
    const htmlView = h("pre", { class: "html-view", hidden: true });
    htmlView.innerHTML = hlHTML(prettyHTML(html));
    const code = h("div", { class: "live-code" }, pre, ta, htmlView);
    const tabCss = h("button", { class: "live-tab", "aria-selected": "true", type: "button", text: fileName });
    const tabs = [tabCss];
    let tabHtml;
    if (root.hasAttribute("data-show-html")) {
      tabHtml = h("button", { class: "live-tab", "aria-selected": "false", type: "button", text: "index.html" });
      tabs.push(tabHtml);
      const pick = (showHtml) => {
        htmlView.hidden = !showHtml;
        tabCss.setAttribute("aria-selected", String(!showHtml));
        tabHtml.setAttribute("aria-selected", String(showHtml));
      };
      tabCss.onclick = () => pick(false);
      tabHtml.onclick = () => pick(true);
    }
    const reset = h("button", { class: "live-btn", type: "button", text: "↺ reset", title: "Back to the starting code" });
    const barKids = [h("i", { class: "dot" }), h("i", { class: "dot" }), h("i", { class: "dot" }), tabs, h("span", { class: "spacer" })];
    let showTarget = !!solution && root.dataset.showTarget !== "off";
    let targetBtn;
    if (solution) {
      targetBtn = h("button", { class: "live-btn", type: "button", "aria-pressed": String(showTarget), title: "Show where things should end up", text: "◌ target" });
      targetBtn.onclick = () => { showTarget = !showTarget; targetBtn.setAttribute("aria-pressed", String(showTarget)); draw(); };
      barKids.push(targetBtn);
    }
    barKids.push(reset);
    const bar = h("div", { class: "live-bar" }, ...barKids);
    const pane = h("div", { class: "live-pane" }, bar);
    if (locked) {
      const lp = h("pre", { class: "code" });
      lp.innerHTML = hlCSS(locked);
      pane.append(h("div", { class: "live-locked" }, h("span", { class: "live-locked-label", text: "🔒 already in the stylesheet — read only" }), lp));
    }
    pane.append(code);

    // preview pane
    const frame = h("iframe", { title: "Preview", loading: "eager" });
    const overlay = h("div", { class: "live-overlay", "aria-hidden": "true" });
    const previewPane = h("div", { class: "live-preview" }, frame, overlay, h("span", { class: "live-preview-label", text: root.dataset.label || "preview" }));
    let tframe;
    if (solution) {
      tframe = h("iframe", { title: "Target", "aria-hidden": "true", tabindex: "-1", class: "live-target" });
      previewPane.prepend(tframe);
    }
    let widthOut, burglarBadge;
    if (vwNow) {
      const range = h("input", { type: "range", min: rMin || 320, max: rMax || 1400, value: vwNow, "aria-label": "Preview width" });
      widthOut = h("output", { text: vwNow + "px" });
      const presetBtns = presetWidths.map((w) => {
        const b = h("button", { type: "button", class: "live-preset", text: (w < 600 ? "📱 " : w < 1000 ? "▭ " : "🖥 ") + w, title: `Set the window to ${w}px` });
        b.onclick = () => setWidth(w);
        return b;
      });
      const syncPresets = () => presetBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(presetWidths[i] === vwNow)));
      function setWidth(w) { vwNow = w; range.value = w; widthOut.textContent = w + "px"; syncPresets(); fit(); }
      range.addEventListener("input", () => { vwNow = +range.value; widthOut.textContent = vwNow + "px"; syncPresets(); fit(); });
      range.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") range.blur(); });
      const bar = h("div", { class: "live-width" + (presetBtns.length ? " has-presets" : "") }, h("span", { text: "window width ⟷" }), range, widthOut);
      if (presetBtns.length) bar.append(h("span", { class: "live-presets" }, presetBtns));
      previewPane.append(bar);
      syncPresets();
    }
    if (burglars) {
      burglarBadge = h("div", { class: "live-burglar", hidden: true });
      previewPane.append(burglarBadge);
    }
    // hidden frames, one per width a check asks about
    const checkFrames = new Map();
    if (checkWidths.length) {
      const park = h("div", { class: "live-park", "aria-hidden": "true" });
      checkWidths.forEach((w) => {
        const f = h("iframe", { tabindex: "-1", title: "" });
        f.style.width = w + "px";
        f.addEventListener("load", () => { if (!f.hasAttribute("srcdoc")) return; const u = f.contentDocument && f.contentDocument.getElementById("__user"); if (u) u.textContent = ta.value; after(); setTimeout(after, 400); });
        checkFrames.set(w, f);
        park.append(f);
      });
      root.append(park);
    }
    root.append(pane, previewPane);

    let checkList;
    if (checks) {
      checkList = h("ul", { class: "live-checks", "aria-live": "polite" });
      root.append(checkList);
    }

    const docWith = (css) => `<!doctype html><html lang="en"><head><meta charset="utf-8">${raw ? "" : FONT_LINK}<style>${raw ? "" : PREVIEW_BASE}</style><style>${base}</style><style>${locked || ""}</style><style id="__user">${css}</style>${KEY_FORWARD}</head><body>${html}</body></html>`;
    const doc = docWith("");

    const paint = () => {
      pre.innerHTML = hlCSS(ta.value) + "\n ";
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    };
    const userDoc = () => { try { return frame.contentDocument; } catch (e) { return null; } };
    const targetDoc = () => { try { return tframe && tframe.contentDocument; } catch (e) { return null; } };
    let fallbackTimer;
    const apply = () => {
      const d = userDoc();
      const u = d && d.getElementById("__user");
      checkFrames.forEach((f) => { try { const cu = f.contentDocument.getElementById("__user"); if (cu) cu.textContent = ta.value; } catch (e) {} });
      if (u) { u.textContent = ta.value; after(); }
      else {
        clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(() => { frame.srcdoc = docWith(ta.value); }, 250);
      }
    };
    function after() {
      runChecks(userDoc());
      draw();
    }
    frame.addEventListener("load", () => {
      try {
        const u = frame.contentDocument.getElementById("__user");
        if (u && u.textContent !== ta.value) u.textContent = ta.value;
        frame.contentWindow.addEventListener("scroll", () => { syncScroll(); draw(); });
        frame.contentWindow.addEventListener("resize", draw);
        after();
        setTimeout(after, 400); // web fonts
      } catch (e) { /* cross-origin fallback: styles already baked in */ }
    });
    frame.srcdoc = doc;
    checkFrames.forEach((f) => { f.srcdoc = doc; });
    if (tframe) {
      tframe.addEventListener("load", () => { after(); setTimeout(after, 400); });
      tframe.srcdoc = docWith(solution);
    }
    function syncScroll() {
      const d = userDoc(), t = targetDoc();
      if (d && t && t.defaultView) t.defaultView.scrollTo(d.defaultView.scrollX, d.defaultView.scrollY);
    }

    let z = zoom;
    function fit() {
      const w = previewPane.clientWidth, hgt = previewPane.clientHeight;
      let vw = w / zoom;
      z = zoom;
      if (vwNow) { vw = vwNow; z = Math.min(zoom, w / vw); }
      for (const f of [frame, tframe]) {
        if (!f) continue;
        f.style.width = vw + "px";
        f.style.height = hgt / z + "px";
        f.style.transform = `scale(${z})`;
      }
      requestAnimationFrame(after);
    }
    new ResizeObserver(fit).observe(previewPane);
    fit();

    /* ---------- overlays: target outlines, sizes, grid lines, flex axes ---------- */
    const px = (v) => parseFloat(v) || 0;
    function box(x, y, w, hh, cls, label) {
      const el = h("div", { class: "ov " + cls });
      Object.assign(el.style, { left: x * z + "px", top: y * z + "px", width: Math.max(0, w * z) + "px", height: Math.max(0, hh * z) + "px" });
      if (label != null) el.append(h("span", { text: label }));
      overlay.append(el);
      return el;
    }
    function tracks(list) {
      return String(list).split(/\s+(?![^\[]*\])/).filter((t) => /^-?[\d.]+px$/.test(t)).map(px);
    }
    function draw() {
      overlay.textContent = "";
      const d = userDoc();
      if (!d || !d.body) return;
      const win = d.defaultView;
      if (showTarget && targetSel) {
        const t = targetDoc();
        if (t && t.body) t.querySelectorAll(targetSel).forEach((el) => {
          const r = el.getBoundingClientRect();
          box(r.left, r.top, r.width, r.height, "ov-target");
        });
      }
      if (gridSel) d.querySelectorAll(gridSel).forEach((el) => {
        const cs = win.getComputedStyle(el);
        if (!/grid/.test(cs.display)) return;
        const r = el.getBoundingClientRect();
        const x0 = r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft);
        const y0 = r.top + px(cs.borderTopWidth) + px(cs.paddingTop);
        const cols = tracks(cs.gridTemplateColumns), rows = tracks(cs.gridTemplateRows);
        const cg = px(cs.columnGap), rg = px(cs.rowGap);
        const W = cols.reduce((a, b) => a + b, 0) + cg * Math.max(0, cols.length - 1);
        const H = rows.reduce((a, b) => a + b, 0) + rg * Math.max(0, rows.length - 1);
        const xs = [], ys = [];
        let x = x0; cols.forEach((c, i) => { xs.push([x, x + c]); x += c + cg; });
        let y = y0; rows.forEach((c, i) => { ys.push([y, y + c]); y += c + rg; });
        box(x0, y0, W, H, "ov-grid-area");
        xs.forEach(([a, b], i) => {
          box(a, y0, 0, H, "ov-gl", i === 0 ? null : undefined);
          box(b, y0, 0, H, "ov-gl");
          if (i < xs.length - 1 && cg) box(b, y0, cg, H, "ov-gap");
          box(a, y0, 0, 0, "ov-num top", String(i + 1));
        });
        if (xs.length) box(xs[xs.length - 1][1], y0, 0, 0, "ov-num top", String(xs.length + 1));
        ys.forEach(([a, b], i) => {
          box(x0, a, W, 0, "ov-gl h");
          box(x0, b, W, 0, "ov-gl h");
          if (i < ys.length - 1 && rg) box(x0, b, W, rg, "ov-gap");
          box(x0, a, 0, 0, "ov-num left", String(i + 1));
        });
        if (ys.length) box(x0, ys[ys.length - 1][1], 0, 0, "ov-num left", String(ys.length + 1));
        // area names
        if (cs.gridTemplateAreas && cs.gridTemplateAreas !== "none") {
          const grid = (cs.gridTemplateAreas.match(/"[^"]*"/g) || []).map((s) => s.slice(1, -1).trim().split(/\s+/));
          const seen = {};
          grid.forEach((row, ri) => row.forEach((name, ci) => {
            if (name === "." || !xs[ci] || !ys[ri]) return;
            const s = seen[name] || (seen[name] = { x1: 1e9, y1: 1e9, x2: -1e9, y2: -1e9 });
            s.x1 = Math.min(s.x1, xs[ci][0]); s.x2 = Math.max(s.x2, xs[ci][1]);
            s.y1 = Math.min(s.y1, ys[ri][0]); s.y2 = Math.max(s.y2, ys[ri][1]);
          }));
          for (const [name, s] of Object.entries(seen)) box(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1, "ov-areaname", name);
        }
      });
      if (flexSel) d.querySelectorAll(flexSel).forEach((el) => {
        const cs = win.getComputedStyle(el);
        if (!/flex/.test(cs.display)) return;
        const r = el.getBoundingClientRect();
        const col = /column/.test(cs.flexDirection), rev = /reverse/.test(cs.flexDirection);
        // labels go outside the container when there is room, so they don't cover its content
        const outH = r.top > 20 ? " out" : "", outV = r.left > 20 ? " out" : "";
        if (!col) {
          box(r.left + 6, r.top + 6, r.width - 14, 0, "ov-axis main" + (rev ? " rev" : "") + outH, "main");
          box(r.left + 6, r.top + 6, 0, r.height - 14, "ov-axis cross v" + outV, "cross");
        } else {
          box(r.left + 6, r.top + 6, 0, r.height - 14, "ov-axis main v" + (rev ? " rev" : "") + outV, "main");
          box(r.left + 6, r.top + 6, r.width - 14, 0, "ov-axis cross" + outH, "cross");
        }
      });
      if (measureSel) d.querySelectorAll(measureSel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        box(r.left, r.top, r.width, r.height, "ov-measure", `${Math.round(r.width)} × ${Math.round(r.height)}`);
      });
      if (burglars) drawBurglars(d);
    }
    function drawBurglars(d) {
      const found = Kit.burglars(d);
      burglarBadge.hidden = !found.extra;
      if (!found.extra) return;
      burglarBadge.textContent = `🦝 scrollburglar! the page is ${found.extra}px too wide`;
      found.culprits.slice(0, 8).forEach((el) => {
        const r = el.getBoundingClientRect();
        box(r.left, r.top, Math.max(r.width, el.scrollWidth), r.height, "ov-burglar", "🦝 " + Kit.describe(el));
      });
    }

    function norm(d, prop, value) {
      const p = d.createElement("div");
      p.style.cssText = "position:absolute;left:-9999px;top:0";
      p.style.setProperty(prop, value);
      d.body.append(p);
      const v = d.defaultView.getComputedStyle(p).getPropertyValue(prop);
      p.remove();
      return v;
    }
    function helpers(d) {
      const q = (s) => d.querySelector(s);
      const r = (s) => { const e = typeof s === "string" ? q(s) : s; return e ? e.getBoundingClientRect() : { left: NaN, top: NaN, right: NaN, bottom: NaN, width: NaN, height: NaN }; };
      const cs = (s, p) => { const e = q(s); return e ? d.defaultView.getComputedStyle(e).getPropertyValue(p).trim() : ""; };
      const near = (a, b, tol = 3) => Math.abs(a - b) <= tol;
      return { d, q, r, cs, near, w: d.defaultView };
    }
    function matchTarget(d, sel, tol) {
      const t = targetDoc();
      if (!t || !t.body) return false;
      const a = [...d.querySelectorAll(sel)], b = [...t.querySelectorAll(sel)];
      if (!a.length || a.length !== b.length) return false;
      // layout boxes, not painted boxes: a rotated stamp still counts
      const box = (el) => { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight }; };
      return a.every((el, i) => {
        const p = box(el), q = box(b[i]);
        return ["left", "top", "width", "height"].every((k) => Math.abs(p[k] - q[k]) <= tol);
      });
    }
    // the stylesheet with every @media / @supports / @container block cut out
    function outsideAt(css) {
      css = css.replace(/\/\*[\s\S]*?\*\//g, "");
      let out = "", i = 0;
      while (i < css.length) {
        const at = css.indexOf("@", i);
        if (at < 0) { out += css.slice(i); break; }
        out += css.slice(i, at);
        const open = css.indexOf("{", at);
        if (open < 0) break;
        let depth = 1, j = open + 1;
        while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
        i = j;
      }
      return out;
    }
    function frameDoc(wd) { const f = checkFrames.get(+wd); try { return f && f.contentDocument; } catch (e) { return null; } }
    function runChecks(d) {
      if (!checks || !d || !d.body) return;
      const css = ta.value;
      const untouched = css.trim() === initial.trim(); // no green chips before the first edit
      const selectorsOnly = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{[^}]*\}/g, "{}");
      checkList.textContent = "";
      let allPass = true;
      for (const c of checks) {
        let pass = false, cls = "";
        if (c.forbid && c.outside) {
          pass = !new RegExp(c.forbid, "i").test(outsideAt(css));
          if (!pass) cls = "fail-constraint";
        } else if (c.forbid) {
          const bad =
            c.forbid === "important" ? /!\s*important/i.test(css) :
            c.forbid === "id" ? /#[\w-]/.test(selectorsOnly) :
            c.forbid === "non-type" ? /[.#\[:]/.test(selectorsOnly) :
            new RegExp(c.forbid, "i").test(css.replace(/\/\*[\s\S]*?\*\//g, ""));
          pass = !bad;
          if (bad) cls = "fail-constraint";
        } else if (c.require) {
          pass = new RegExp(c.require, "i").test(css.replace(/\/\*[\s\S]*?\*\//g, ""));
        } else if (c.match) {
          pass = matchTarget(d, c.match, c.tol || 3);
        } else if (c.noScroll) {
          pass = [].concat(c.noScroll).every((wd) => { const fd = frameDoc(wd); return fd && fd.body && !Kit.burglars(fd).extra; });
        } else if (c.expr) {
          const docs = c.at ? [].concat(c.at).map(frameDoc) : [d];
          pass = docs.every((dd) => {
            if (!dd || !dd.body) return false;
            try {
              const H = helpers(dd);
              return !!new Function("d", "q", "r", "cs", "near", "w", `"use strict"; return (${c.expr});`)(H.d, H.q, H.r, H.cs, H.near, H.w);
            } catch (e) { return false; }
          });
        } else {
          const el = d.querySelector(c.sel);
          if (el) {
            const actual = d.defaultView.getComputedStyle(el, c.pseudo || null).getPropertyValue(c.prop).trim();
            const want = c.raw ? c.is : norm(d, c.prop, c.is).trim();
            pass = c.not ? actual !== want : actual === want;
          }
        }
        if (!pass) allPass = false;
        checkList.append(h("li", { class: untouched ? "" : pass ? "pass" : cls, text: c.label }));
      }
      if (allPass && css.trim() !== initial.trim()) {
        checkList.append(h("li", { class: "solved-msg", text: root.dataset.solved || "✓ Solved" }));
        root.classList.add("solved");
      } else root.classList.remove("solved");
    }

    let raf;
    ta.addEventListener("input", () => {
      paint();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    ta.addEventListener("scroll", () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; });
    ta.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { ta.blur(); return; }
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertText", false, "  ");
      } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        const before = ta.value.slice(0, ta.selectionStart);
        const line = before.slice(before.lastIndexOf("\n") + 1);
        let indent = line.match(/^\s*/)[0];
        if (/\{\s*$/.test(line)) indent += "  ";
        e.preventDefault();
        document.execCommand("insertText", false, "\n" + indent);
      } else if (e.key === "}" ) {
        const before = ta.value.slice(0, ta.selectionStart);
        const line = before.slice(before.lastIndexOf("\n") + 1);
        if (/^\s{2,}$/.test(line)) {
          e.preventDefault();
          ta.setSelectionRange(ta.selectionStart - 2, ta.selectionStart);
          document.execCommand("insertText", false, "}");
        }
      }
    });
    reset.addEventListener("click", () => { ta.value = initial; paint(); apply(); });
    paint();

    root.liveEditor = {
      get: () => ta.value,
      set: (v) => { ta.value = v; paint(); apply(); },
      frame,
    };
  }

  /* ------------------------------------------------------------------------
     Specificity
     ------------------------------------------------------------------------ */
  const IDENT = /^-?(?:[_a-zA-Z -￿]|\\.)(?:[\w -￿-]|\\.)*/;
  const LEGACY_PE = /^(before|after|first-line|first-letter)$/i;

  function splitTop(s) {
    const out = [];
    let depth = 0, cur = "", q = null;
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out;
  }
  function findClose(s, from, open, close) {
    let depth = 0, q = null;
    for (let k = from; k < s.length; k++) {
      const ch = s[k];
      if (q) { if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === open) depth++;
      else if (ch === close) { depth--; if (depth === 0) return k; }
    }
    return -1;
  }
  const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  function maxSpec(list) {
    let best = [0, 0, 0];
    for (const part of splitTop(list)) {
      if (!part.trim()) continue;
      const s = specOf(part.trim()).s;
      if (cmp(s, best) > 0) best = s;
    }
    return best;
  }
  function specOf(sel) {
    const toks = [];
    let a = 0, b = 0, c = 0, i = 0;
    const n = sel.length;
    while (i < n) {
      const ch = sel[i];
      if (/\s/.test(ch) || ">+~".includes(ch)) {
        let j = i;
        while (j < n && (/\s/.test(sel[j]) || ">+~".includes(sel[j]))) j++;
        toks.push({ t: sel.slice(i, j), k: "comb" });
        i = j;
        continue;
      }
      if (ch === "*" || ch === "&") { toks.push({ t: ch, k: "z" }); i++; continue; }
      if (ch === "#" || ch === ".") {
        const m = sel.slice(i + 1).match(IDENT);
        if (!m) throw new Error(`Expected a name after "${ch}"`);
        toks.push({ t: ch + m[0], k: ch === "#" ? "a" : "b" });
        ch === "#" ? a++ : b++;
        i += 1 + m[0].length;
        continue;
      }
      if (ch === "[") {
        const k = findClose(sel, i, "[", "]");
        if (k < 0) throw new Error("Unclosed [ bracket");
        toks.push({ t: sel.slice(i, k + 1), k: "b" });
        b++;
        i = k + 1;
        continue;
      }
      if (ch === ":") {
        const pe = sel[i + 1] === ":";
        let j = i + (pe ? 2 : 1);
        const m = sel.slice(j).match(IDENT);
        if (!m) throw new Error('Expected a name after ":"');
        const name = m[0].toLowerCase();
        j += m[0].length;
        let arg = null;
        if (sel[j] === "(") {
          const k = findClose(sel, j, "(", ")");
          if (k < 0) throw new Error("Unclosed ( bracket");
          arg = sel.slice(j + 1, k);
          j = k + 1;
        }
        const text = sel.slice(i, j);
        if (pe || (LEGACY_PE.test(name) && arg == null)) { c++; toks.push({ t: text, k: "c" }); }
        else if (name === "where") toks.push({ t: text, k: "z", note: "always 0" });
        else if (["is", "not", "has", "matches", "-webkit-any"].includes(name)) {
          const best = maxSpec(arg || "");
          a += best[0]; b += best[1]; c += best[2];
          toks.push({ t: text, k: best[0] ? "a" : best[1] ? "b" : best[2] ? "c" : "z", note: `= its strongest argument (${best.join(",")})` });
        } else if (/^nth-(last-)?child$/.test(name) && arg && /\sof\s/i.test(arg)) {
          const best = maxSpec(arg.split(/\sof\s/i)[1]);
          a += best[0]; b += best[1] + 1; c += best[2];
          toks.push({ t: text, k: "b" });
        } else { b++; toks.push({ t: text, k: "b" }); }
        i = j;
        continue;
      }
      const m = sel.slice(i).match(IDENT);
      if (m) { toks.push({ t: m[0], k: "c" }); c++; i += m[0].length; continue; }
      throw new Error(`Unexpected character "${ch}"`);
    }
    return { s: [a, b, c], toks };
  }
  function validSelector(sel) {
    try { document.createDocumentFragment().querySelector(sel); return true; } catch (e) { return false; }
  }
  Kit.specificity = (sel) => splitTop(sel).map((p) => specOf(p.trim()));
  Kit.compareSpec = cmp;

  function scoreHTML(s) {
    const lab = ["ID", "CLASS", "TYPE"];
    return `<div class="spec-score">${s.map((v, k) => `<span class="${"abc"[k]}${v ? "" : " zero"}">${v}<small>${lab[k]}</small></span>`).join("")}</div>`;
  }
  Kit.scoreHTML = scoreHTML;
  function tokensHTML(toks) {
    return toks.map((t) => `<span class="spec-tok ${t.k}"${t.note ? ` title="${esc(t.note)}"` : ""}>${esc(t.t)}</span>`).join("");
  }

  function SpecCalc(root) {
    const values = (root.dataset.value || "nav a:hover").split("||");
    const compare = root.hasAttribute("data-compare");
    root.textContent = "";
    const inputs = (compare ? values.slice(0, 2) : values.slice(0, 1)).map((v) =>
      h("input", { class: "spec-input", value: v, spellcheck: "false", autocapitalize: "off", "aria-label": "Selector" }));
    const rows = h("div", { class: "spec-rows" });
    const verdict = h("div", { class: "spec-error" });
    inputs.forEach((inp) => root.append(inp));
    root.append(rows, verdict);
    if (compare) {
      inputs[0].style.marginBottom = "0.5em";
    }
    function render() {
      rows.textContent = "";
      verdict.textContent = "";
      const results = [];
      for (const inp of inputs) {
        const sel = inp.value.trim();
        if (!sel) continue;
        try {
          if (!validSelector(sel)) throw new Error("The browser rejects this selector — the whole rule would be ignored.");
          for (const part of splitTop(sel)) {
            const r = specOf(part.trim());
            const row = h("div", { class: "spec-row", html: `<div class="spec-tokens">${tokensHTML(r.toks)}</div>${scoreHTML(r.s)}` });
            rows.append(row);
            results.push({ r, row });
          }
        } catch (e) {
          verdict.textContent = "⚠ " + e.message;
        }
      }
      if (compare && results.length === 2) {
        const d = cmp(results[0].r.s, results[1].r.s);
        if (d === 0) { verdict.textContent = "Tie → the rule that comes later in the CSS wins."; verdict.style.color = "var(--ink)"; }
        else { (d > 0 ? results[0] : results[1]).row.classList.add("winner"); verdict.textContent = (d > 0 ? "Top" : "Bottom") + " selector wins."; verdict.style.color = "var(--ink)"; }
      } else verdict.style.color = "";
    }
    inputs.forEach((inp) => {
      inp.addEventListener("input", render);
      inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") inp.blur(); });
    });
    render();
  }


  /* ------------------------------------------------------------------------
     Specificity duel — rows of "A vs B", result revealed as a deck step
     ------------------------------------------------------------------------ */
  function SpecDuel(root) {
    root.querySelectorAll(".duel-row").forEach((row) => {
      const a = row.dataset.a, b = row.dataset.b;
      const ra = specOf(a).s, rb = specOf(b).s;
      const d = cmp(ra, rb);
      const verdict = d > 0 ? "◀ wins" : d < 0 ? "wins ▶" : "tie → the later rule wins";
      row.innerHTML = `<code class="duel-sel${d > 0 ? " win" : ""}">${esc(a)}</code><span class="duel-vs">vs</span><code class="duel-sel${d < 0 ? " win" : ""}">${esc(b)}</code>` +
        `<div class="duel-res step">${scoreHTML(ra)}<b class="${d === 0 ? "tie" : ""}">${verdict}</b>${scoreHTML(rb)}</div>`;
    });
  }

  /* ------------------------------------------------------------------------
     Selector tester — a selector is a question to the DOM
     ------------------------------------------------------------------------ */
  const VOID = new Set(["input", "img", "br", "hr", "meta", "link", "source", "wbr", "area", "col"]);
  const SEL_PREVIEW_CSS = `
    :host{all:initial;display:block;font:19px/1.4 system-ui,sans-serif;color:#17140f;padding:14px}
    *{box-sizing:border-box}
    a{color:#2f49ff}
    h1,h2,h3{margin:.3em 0;line-height:1.1}
    h1{font-size:1.6em} h2{font-size:1.25em} h3{font-size:1.05em}
    p{margin:.3em 0}
    ul{margin:.3em 0;padding-left:1.2em}
    nav ul{display:flex;gap:.8em;list-style:none;padding:0}
    section,header,footer,article,li,nav,form{display:block}
    .vendor-list{display:grid;grid-template-columns:1fr 1fr;gap:6px;list-style:none;padding:0}
    .vendor-card{border:1px solid #ccc;border-radius:6px;padding:6px 8px}
    .tag{font-size:.75em;background:#eee;padding:1px 6px;border-radius:99px}
    .badge{font-size:.75em;color:#b3290b}
    input{font:inherit;padding:2px 6px;width:100%}
    label{display:block;margin-top:.3em}
    .__hit{outline:3px solid #ff5a36!important;outline-offset:2px;background-color:rgba(255,90,54,.14)!important;border-radius:3px}
  `;

  function SelTester(root) {
    const src = dedent(root.querySelector(':scope > script[type="text/plain"]').textContent);
    const extraCss = root.querySelector(':scope > script[data-role="preview-css"]');
    const presets = (root.dataset.presets || "").split("|").filter(Boolean);
    const start = root.dataset.value || presets[0] || "";
    root.textContent = "";

    const tpl = document.createElement("template");
    tpl.innerHTML = src;
    const tree = document.createElement("div");
    tree.append(tpl.content.cloneNode(true));
    const els = [...tree.querySelectorAll("*")];
    const idx = new Map(els.map((e, k) => [e, k]));

    // pretty-print the tree as lines, remembering which element each line belongs to
    const lines = [];
    const openTag = (e) => "<" + e.localName + [...e.attributes].map((a) => (a.value === "" ? " " + a.name : ` ${a.name}="${a.value}"`)).join("") + ">";
    (function walk(node, depth) {
      for (const ch of node.childNodes) {
        if (ch.nodeType === 3) {
          const t = ch.textContent.replace(/\s+/g, " ").trim();
          if (t) lines.push({ html: esc(t), depth, el: null });
          continue;
        }
        if (ch.nodeType !== 1) continue;
        const id = idx.get(ch);
        const tag = ch.localName;
        if (VOID.has(tag)) lines.push({ html: hlHTML(openTag(ch)), depth, el: id, open: true, close: true });
        else if (ch.children.length === 0 && ch.textContent.trim().length < 46) {
          lines.push({ html: hlHTML(openTag(ch) + ch.textContent.replace(/\s+/g, " ").trim() + `</${tag}>`), depth, el: id, open: true, close: true });
        } else {
          lines.push({ html: hlHTML(openTag(ch)), depth, el: id, open: true });
          walk(ch, depth + 1);
          lines.push({ html: hlHTML(`</${tag}>`), depth, el: id, close: true });
        }
      }
    })(tree, 0);

    const input = h("input", { class: "sel-input", value: start, spellcheck: "false", autocapitalize: "off", "aria-label": "CSS selector" });
    const count = h("div", { class: "sel-count", "aria-live": "polite" });
    const presetRow = h("div", { class: "sel-presets" });
    const code = h("pre", { class: "sel-code" });
    const lineEls = lines.map((l) => {
      const span = h("span", { class: "sel-line", html: "  ".repeat(l.depth) + l.html });
      code.append(span);
      return span;
    });
    const preview = h("div", { class: "sel-preview" });
    const shadow = preview.attachShadow({ mode: "open" });
    const clone = tree.cloneNode(true);
    const cloneEls = [...clone.querySelectorAll("*")];
    shadow.innerHTML = `<style>${SEL_PREVIEW_CSS}${extraCss ? extraCss.textContent : ""}</style>`;
    shadow.append(...clone.childNodes);
    shadow.addEventListener("click", (e) => e.preventDefault());

    root.append(h("div", { class: "sel-head" }, input, count), presetRow, h("div", { class: "sel-body" }, code, preview));
    presets.forEach((p) => {
      const b = h("button", { class: "chip-btn", type: "button", text: p });
      b.onclick = () => { input.value = p; run(); };
      presetRow.append(b);
    });

    function run() {
      const sel = input.value.trim();
      presetRow.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === sel)));
      cloneEls.forEach((e) => e.classList.remove("__hit"));
      lineEls.forEach((e) => e.classList.remove("hit", "inside"));
      count.classList.remove("bad");
      if (!sel) { count.textContent = "type a selector"; return; }
      let hits;
      try { hits = tree.querySelectorAll(sel); }
      catch (e) { count.textContent = "invalid → rule ignored"; count.classList.add("bad"); return; }
      const set = new Set([...hits].map((e) => idx.get(e)));
      set.forEach((k) => cloneEls[k].classList.add("__hit"));
      let depthInside = 0;
      const insideStack = [];
      lines.forEach((l, k) => {
        if (l.el != null && set.has(l.el)) {
          lineEls[k].classList.add("hit");
          if (l.open && !l.close) insideStack.push(l.el);
          else if (l.close && !l.open) insideStack.pop();
          return;
        }
        if (insideStack.length) lineEls[k].classList.add("inside");
      });
      void depthInside;
      let msg = `${hits.length} match${hits.length === 1 ? "" : "es"}`;
      if (/::/.test(sel)) msg = "pseudo-elements aren't in the DOM";
      else if (hits.length === 0 && /:(hover|focus|active|checked|visited)/.test(sel)) msg = "0 now — waits for that state";
      count.textContent = msg;
      const first = code.querySelector(".hit");
      if (first) {
        const top = first.offsetTop - code.offsetTop;
        if (top < code.scrollTop || top > code.scrollTop + code.clientHeight - 30) code.scrollTop = top - 20;
      }
    }
    input.addEventListener("input", run);
    input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") input.blur(); });
    new ResizeObserver(() => { if (code.clientHeight) run(); }).observe(code);
    run();
  }

  /* ------------------------------------------------------------------------
     :nth-child() playground
     ------------------------------------------------------------------------ */
  function NthPlay(root) {
    const count = +(root.dataset.count || 20);
    const presets = (root.dataset.presets || "odd|even|3|3n|3n+1|n+5|-n+3").split("|");
    root.textContent = "";
    const input = h("input", { value: root.dataset.value || "2n+1", spellcheck: "false", "aria-label": "nth-child formula" });
    const form = h("div", { class: "nth-form" }, h("span", { text: "li:nth-child(" }), input, h("span", { text: ")" }));
    const list = h("ul", { class: "nth-grid" });
    for (let k = 1; k <= count; k++) list.append(h("li", { text: k }));
    const note = h("div", { class: "nth-note" });
    const presetRow = h("div", { class: "sel-presets" });
    presets.forEach((p) => {
      const b = h("button", { class: "chip-btn", type: "button", text: p });
      b.onclick = () => { input.value = p; run(); };
      presetRow.append(b);
    });
    root.append(form, list, presetRow, note);
    function run() {
      const v = input.value.trim();
      list.querySelectorAll("li").forEach((li) => li.classList.remove("hit"));
      presetRow.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === v)));
      try {
        const hits = [...list.querySelectorAll(`li:nth-child(${v})`)];
        hits.forEach((li) => li.classList.add("hit"));
        const m = v.replace(/\s/g, "").match(/^([+-]?\d*)n([+-]\d+)?$/);
        let expl = hits.length ? "matches " + hits.map((li) => li.textContent).join(", ") : "matches nothing";
        if (m) {
          const A = m[1] === "" || m[1] === "+" ? 1 : m[1] === "-" ? -1 : +m[1];
          const B = +(m[2] || 0);
          const ex = [0, 1, 2, 3].map((nv) => A * nv + B);
          expl = `n = 0, 1, 2, 3 … → ${ex.join(", ")} …  (only positions ≥ 1 exist)`;
        }
        note.textContent = expl;
      } catch (e) {
        note.textContent = "⚠ not a valid formula";
      }
    }
    input.addEventListener("input", run);
    input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") input.blur(); });
    run();
  }

  /* ------------------------------------------------------------------------
     Colour lab — HSL knobs + contrast
     ------------------------------------------------------------------------ */
  function hsl2rgb(hh, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + hh / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
  }
  const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  function lum(rgb) {
    const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(x, y) {
    const [p, q] = [lum(x), lum(y)].sort((m, n) => n - m);
    return (p + 0.05) / (q + 0.05);
  }
  Kit.contrast = contrast;

  function ColorLab(root) {
    const [H0, S0, L0] = (root.dataset.value || "9,100,61").split(",").map(Number);
    const state = { h: H0, s: S0, l: L0 };
    root.textContent = "";
    const mk = (key, max, label) => {
      const r = h("input", { type: "range", min: 0, max, value: state[key], "aria-label": label });
      const o = h("output");
      r.addEventListener("input", () => { state[key] = +r.value; paint(); });
      return { row: h("label", { class: "cl-slider" }, h("span", { text: key.toUpperCase() }), r, o), r, o };
    };
    const H = mk("h", 360, "Hue"), S = mk("s", 100, "Saturation"), L = mk("l", 100, "Lightness");
    const codes = h("div", { class: "cl-codes" });
    const sampleW = h("div", { class: "cl-sample" });
    const sampleB = h("div", { class: "cl-sample" });
    const palette = h("div", { class: "cl-palette" });
    const swatch = h("div", { class: "cl-swatch" }, sampleW, sampleB);
    root.append(h("div", { class: "cl-sliders" }, H.row, S.row, L.row, codes), h("div", {}, swatch, palette));
    function paint() {
      const { h: hh, s, l } = state;
      const rgb = hsl2rgb(hh, s, l);
      H.o.textContent = hh + "°"; S.o.textContent = s + "%"; L.o.textContent = l + "%";
      H.r.style.background = "linear-gradient(90deg," + [0, 60, 120, 180, 240, 300, 360].map((x) => `hsl(${x} ${s}% ${l}%)`).join(",") + ")";
      S.r.style.background = `linear-gradient(90deg, hsl(${hh} 0% ${l}%), hsl(${hh} 100% ${l}%))`;
      L.r.style.background = `linear-gradient(90deg, #000, hsl(${hh} ${s}% 50%), #fff)`;
      codes.innerHTML = [
        ["hsl", `hsl(${hh} ${s}% ${l}%)`],
        ["hex", hex(rgb)],
        ["rgb", `rgb(${rgb.join(" ")})`],
      ].map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join("");
      swatch.style.background = `hsl(${hh} ${s}% ${l}%)`;
      const cw = contrast(rgb, [255, 255, 255]), cb = contrast(rgb, [23, 20, 15]);
      const tag = (c) => `<small class="${c < 4.5 ? "fail" : ""}">${c.toFixed(2)}:1 ${c >= 7 ? "AAA" : c >= 4.5 ? "AA ✓" : "✗ fails"}</small>`;
      sampleW.innerHTML = `<span style="color:#fff">Night Market</span>${tag(cw)}`;
      sampleB.innerHTML = `<span style="color:#17140f">Night Market</span>${tag(cb)}`;
      palette.textContent = "";
      for (let k = 1; k <= 9; k++) {
        const lv = k * 10;
        const c = hsl2rgb(hh, s, lv);
        const cell = h("div", { text: lv, title: `hsl(${hh} ${s}% ${lv}%)` });
        cell.style.background = `hsl(${hh} ${s}% ${lv}%)`;
        cell.style.color = lum(c) > 0.35 ? "#000" : "#fff";
        cell.style.cursor = "pointer";
        if (Math.abs(lv - l) < 5) cell.style.outline = "0.15em solid var(--ink)";
        cell.onclick = () => { state.l = lv; L.r.value = lv; paint(); };
        palette.append(cell);
      }
    }
    root.querySelectorAll("input").forEach((i) => i.addEventListener("keydown", (e) => { if (e.key === "Escape") i.blur(); }));
    paint();
  }

  /* ------------------------------------------------------------------------
     Contrast pair — check YOUR text colour on YOUR background
     ------------------------------------------------------------------------ */
  function hexToRgb(hx) {
    const m = String(hx).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    let v = m[1];
    if (v.length === 3) v = v.split("").map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  }
  function ContrastPair(root) {
    const [fg0, bg0] = (root.dataset.value || "#17140f,#ff6347").split(",");
    root.textContent = "";
    const mk = (label, val) => {
      const color = h("input", { type: "color", value: val, "aria-label": label + " colour" });
      const text = h("input", { type: "text", value: val, spellcheck: "false", "aria-label": label + " hex" });
      color.addEventListener("input", () => { text.value = color.value; paint(); });
      text.addEventListener("input", () => { if (hexToRgb(text.value)) { color.value = "#" + text.value.replace("#", ""); paint(); } });
      text.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") text.blur(); });
      return { el: h("label", {}, h("span", { text: label }), color, text), color };
    };
    const F = mk("text", fg0), B = mk("background", bg0);
    const sample = h("div", { class: "cp-sample" });
    root.append(h("div", { class: "cp-controls" }, F.el, B.el), sample);
    function paint() {
      const f = hexToRgb(F.color.value), b = hexToRgb(B.color.value);
      const c = contrast(f, b);
      sample.style.background = B.color.value;
      sample.style.color = F.color.value;
      const badge = (ok, t) => `<i class="${ok ? "" : "fail"}">${ok ? "✓" : "✗"} ${t}</i>`;
      sample.innerHTML = `<b>Harbour Night Market</b><span>Vendors open at 19:00. Bring cash for the stalls.</span><div class="cp-score">${c.toFixed(2)} : 1 ${badge(c >= 4.5, "body text 4.5")}${badge(c >= 3, "large text 3")}</div>`;
    }
    paint();
  }

  /* ------------------------------------------------------------------------
     Box model lab
     ------------------------------------------------------------------------ */
  function BoxLab(root) {
    const st = { width: 260, padding: 30, border: 10, margin: 30, sizing: "content-box" };
    root.textContent = "";
    const mk = (key, max, color, label) => {
      const r = h("input", { type: "range", min: 0, max, value: st[key], "aria-label": label });
      const o = h("output");
      r.addEventListener("input", () => { st[key] = +r.value; paint(); });
      r.addEventListener("keydown", (e) => { if (e.key === "Escape") r.blur(); });
      const sw = h("i", { class: "sw" });
      sw.style.background = color;
      return { row: h("label", { class: "bl-row" }, h("span", {}, sw, key), r, o), o };
    };
    const W = mk("width", 400, "#9fc4e7", "width"), P = mk("padding", 70, "#c3deb7", "padding"), B = mk("border", 40, "#2b2b2b", "border"), M = mk("margin", 70, "#f9cc9d", "margin");
    const bContent = h("button", { type: "button", text: "content-box", "aria-pressed": "true" });
    const bBorder = h("button", { type: "button", text: "border-box", "aria-pressed": "false" });
    const setSizing = (v) => { st.sizing = v; bContent.setAttribute("aria-pressed", String(v === "content-box")); bBorder.setAttribute("aria-pressed", String(v === "border-box")); paint(); };
    bContent.onclick = () => setSizing("content-box");
    bBorder.onclick = () => setSizing("border-box");
    const math = h("div", { class: "bl-math" });
    const box = h("div", { class: "bl-box" });
    const marginEl = h("div", { class: "bl-margin" }, box);
    const ruler = h("div", { class: "bl-ruler" });
    const stage = h("div", { class: "bl-stage" }, h("div", {}, ruler, marginEl));
    root.append(
      h("div", { class: "bl-controls" },
        W.row, P.row, B.row, M.row,
        h("div", { class: "bl-row" }, h("span", { text: "box-sizing" }), h("div", { class: "bl-toggle" }, bContent, bBorder)),
        math),
      stage);
    function paint() {
      W.o.textContent = st.width + "px"; P.o.textContent = st.padding + "px"; B.o.textContent = st.border + "px"; M.o.textContent = st.margin + "px";
      Object.assign(box.style, { width: st.width + "px", padding: st.padding + "px", borderWidth: st.border + "px", boxSizing: st.sizing, minHeight: "0" });
      marginEl.style.padding = st.margin + "px";
      const outer = st.sizing === "content-box" ? st.width + 2 * st.padding + 2 * st.border : Math.max(st.width, 2 * st.padding + 2 * st.border);
      const content = st.sizing === "content-box" ? st.width : Math.max(0, st.width - 2 * st.padding - 2 * st.border);
      box.textContent = `content ${content}px`;
      ruler.textContent = `← ${box.offsetWidth || outer}px on screen →`;
      math.innerHTML = st.sizing === "content-box"
        ? `width ${st.width}<br>+ padding 2 × ${st.padding}<br>+ border 2 × ${st.border}<br>= <b>${outer}px</b> visible box<br><span style="color:var(--muted)">+ margin 2 × ${st.margin} = ${outer + 2 * st.margin}px of space</span>`
        : `width ${st.width} = the whole visible box: <b>${outer}px</b><br>content shrinks to ${content}px<br><span style="color:var(--muted)">+ margin 2 × ${st.margin} = ${outer + 2 * st.margin}px of space</span>`;
      requestAnimationFrame(() => { ruler.textContent = `← ${box.offsetWidth}px on screen →`; });
    }
    new ResizeObserver(() => { if (box.offsetWidth) ruler.textContent = `← ${box.offsetWidth}px on screen →`; }).observe(box);
    paint();
  }

  /* ------------------------------------------------------------------------
     Units lab — real iframe, so vw is honest
     ------------------------------------------------------------------------ */
  function UnitsLab(root) {
    const st = { root: 16, parent: 24, vw: 900 };
    root.textContent = "";
    const mk = (key, min, max, label) => {
      const r = h("input", { type: "range", min, max, value: st[key], "aria-label": label });
      const o = h("b");
      r.addEventListener("input", () => { st[key] = +r.value; paint(); });
      r.addEventListener("keydown", (e) => { if (e.key === "Escape") r.blur(); });
      return { el: h("label", { class: "ul-control" }, h("span", {}, label, o), r), o };
    };
    const R = mk("root", 10, 32, "html font-size (browser setting) "), P = mk("parent", 10, 40, ".parent font-size "), V = mk("vw", 360, 1400, "viewport width ");
    const frame = h("iframe", { title: "Units preview" });
    const stage = h("div", { class: "ul-stage" }, frame);
    root.append(h("div", { class: "ul-controls" }, R.el, P.el, V.el), stage);
    const rows = [
      ["240px", "width:240px", "never changes"],
      ["15rem", "width:15rem", "× html font-size"],
      ["10em", "width:10em", "× this element's font-size (inherited from .parent)"],
      ["50%", "width:50%", "× parent's width"],
      ["30vw", "width:30vw", "× 1% of viewport width"],
      ["30ch", "width:30ch", "× width of the “0” glyph"],
    ];
    frame.srcdoc = `<!doctype html><html><head><style>
      html{font-size:16px}
      body{margin:14px;font-family:system-ui,sans-serif}
      .parent{border:2px dashed #b9ad97;border-radius:8px;padding:10px 12px;font-size:24px}
      .parent > p{margin:0 0 8px;font:600 16px/1.2 ui-monospace,Menlo,monospace;color:#6f665a}
      .row{display:grid;grid-template-columns:86px 1fr;align-items:center;margin:8px 0}
      .row code{font:700 17px ui-monospace,Menlo,monospace}
      .bar{height:34px;border-radius:5px;background:#ff5a36;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 8px;box-sizing:border-box;white-space:nowrap;overflow:hidden}
      .bar span{font:700 16px ui-monospace,Menlo,monospace}
      .bar small{font:500 14px system-ui;opacity:.9}
      .row:nth-child(3) .bar{background:#2f49ff}.row:nth-child(4) .bar{background:#7b4dff}.row:nth-child(5) .bar{background:#12a26f}.row:nth-child(6) .bar{background:#f5a300}.row:nth-child(7) .bar{background:#17140f}
      .text{display:flex;gap:18px;align-items:baseline;margin-top:10px;flex-wrap:wrap}
      .text span{font-weight:800;line-height:1}
      .text code{display:block;font:600 14px ui-monospace,Menlo,monospace;color:#6f665a;margin-top:4px}
    </style>${KEY_FORWARD}</head><body><div class="parent"><p>.parent — every bar below lives here</p>${rows.map(([u, css, why]) => `<div class="row"><code>${u}</code><div class="bar" style="${css}"><span></span><small>${why}</small></div></div>`).join("")}
      <div class="text"><div><span style="font-size:1.5rem">Aa</span><code>1.5rem</code></div><div><span style="font-size:1.5em">Aa</span><code>1.5em</code></div><div><span style="font-size:24px">Aa</span><code>24px</code></div><div><span style="font-size:4vw">Aa</span><code>4vw</code></div></div></div></body></html>`;
    frame.addEventListener("load", paint);
    function fit() {
      const sw = stage.clientWidth, sh = stage.clientHeight;
      const scale = Math.min(1.35, sw / st.vw);
      frame.style.width = st.vw + "px";
      frame.style.height = sh / scale + "px";
      frame.style.transform = `scale(${scale})`;
    }
    function paint() {
      R.o.textContent = st.root + "px"; P.o.textContent = st.parent + "px"; V.o.textContent = st.vw + "px";
      fit();
      let d;
      try { d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body) return;
      d.documentElement.style.fontSize = st.root + "px";
      const par = d.querySelector(".parent");
      if (!par) return;
      par.style.fontSize = st.parent + "px";
      requestAnimationFrame(() => {
        d.querySelectorAll(".bar").forEach((b) => {
          b.firstChild.textContent = Math.round(parseFloat(d.defaultView.getComputedStyle(b).width)) + "px";
        });
        d.querySelectorAll(".text span").forEach((s) => {
          s.nextElementSibling.textContent = s.nextElementSibling.textContent.split(" ")[0] + " = " + Math.round(parseFloat(d.defaultView.getComputedStyle(s).fontSize)) + "px";
        });
      });
    }
    new ResizeObserver(paint).observe(stage);
  }

  /* ------------------------------------------------------------------------
     Flex lab — container knobs, click an item for item knobs, axes drawn live
     ------------------------------------------------------------------------ */
  const STALLS = [["🥟", "Dumplings"], ["🎸", "Vinyl"], ["🌵", "Plant swap"], ["🍹", "Mezcal Moon"], ["🥖", "Bread"], ["🧀", "Cheese"], ["🍋", "Lemonade stand"], ["🐟", "Fish"]];
  const PADS = [0.5, 1.4, 0.8, 1.9, 0.6, 1.1, 0.9, 1.5];
  function chipGroup(label, values, get, set, cls) {
    const row = h("div", { class: "lab-group " + (cls || "") }, h("span", { class: "lab-label", text: label }));
    const wrap = h("div", { class: "lab-chips" });
    const btns = values.map((v) => {
      const b = h("button", { class: "chip-btn", type: "button", text: String(v) });
      b.onclick = () => set(v);
      wrap.append(b);
      return b;
    });
    row.append(wrap);
    row.sync = () => btns.forEach((b, i) => b.setAttribute("aria-pressed", String(values[i] === get())));
    return row;
  }
  function rangeRow(label, min, max, get, set, unit) {
    const r = h("input", { type: "range", min, max, value: get(), "aria-label": label });
    const o = h("output");
    r.addEventListener("input", () => set(+r.value));
    r.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") r.blur(); });
    const row = h("label", { class: "lab-group lab-range" }, h("span", { class: "lab-label", text: label }), r, o);
    row.sync = () => { r.value = get(); o.textContent = get() + unit; };
    return row;
  }

  function FlexLab(root) {
    const ds = root.dataset;
    const show = new Set((ds.show || "direction,justify,align,wrap,gap,width,items,item").split(","));
    const st = { dir: ds.direction || "row", jc: ds.justify || "flex-start", ai: ds.align || "stretch", wrap: ds.wrap || "nowrap", gap: +(ds.gap || 0), width: +(ds.width || 100), n: +(ds.items || 4) };
    const items = STALLS.map(() => ({ grow: 0, shrink: 1, basis: "auto", self: "auto", push: false }));
    (ds.itemPreset || "").split(";").filter(Boolean).forEach((s) => { const [i, k, v] = s.split(":"); items[+i][k] = k === "push" ? v === "true" : isNaN(+v) || k === "basis" ? v : +v; });
    let sel = ds.selected != null ? +ds.selected : -1;
    root.textContent = "";

    const groups = [];
    const add = (key, g) => { if (show.has(key)) groups.push(g); };
    const rerender = () => render();
    add("direction", chipGroup("flex-direction", ["row", "row-reverse", "column", "column-reverse"], () => st.dir, (v) => { st.dir = v; rerender(); }));
    add("justify", chipGroup("justify-content", ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"], () => st.jc, (v) => { st.jc = v; rerender(); }));
    add("align", chipGroup("align-items", ["stretch", "flex-start", "center", "flex-end", "baseline"], () => st.ai, (v) => { st.ai = v; rerender(); }));
    add("wrap", chipGroup("flex-wrap", ["nowrap", "wrap"], () => st.wrap, (v) => { st.wrap = v; rerender(); }));
    add("gap", rangeRow("gap", 0, 40, () => st.gap, (v) => { st.gap = v; rerender(); }, "px"));
    add("width", rangeRow("container width", 30, 100, () => st.width, (v) => { st.width = v; rerender(); }, "%"));
    add("items", rangeRow("items", 2, 8, () => st.n, (v) => { st.n = v; if (sel >= v) sel = -1; rerender(); }, ""));
    const itemBox = h("div", { class: "fl-itembox" });
    const itemGroups = [
      chipGroup("flex-grow", [0, 1, 2, 3], () => items[sel].grow, (v) => { items[sel].grow = v; rerender(); }),
      chipGroup("flex-shrink", [0, 1], () => items[sel].shrink, (v) => { items[sel].shrink = v; rerender(); }),
      chipGroup("flex-basis", ["auto", "0", "10em", "40%"], () => items[sel].basis, (v) => { items[sel].basis = v; rerender(); }),
      chipGroup("align-self", ["auto", "flex-start", "center", "flex-end", "stretch"], () => items[sel].self, (v) => { items[sel].self = v; rerender(); }),
      chipGroup("push it", [false, true].map(String), () => String(items[sel].push), (v) => { items[sel].push = v === "true"; rerender(); }),
    ];
    const itemHint = h("p", { class: "fl-hint", text: "👆 Click a stall to change just that item." });
    itemBox.append(itemHint, ...itemGroups);
    if (show.has("item")) groups.push(itemBox);

    const controls = h("div", { class: "lab-controls" }, ...groups);
    const box = h("div", { class: "fl-box" });
    const axes = h("div", { class: "fl-axes", "aria-hidden": "true" });
    const stage = h("div", { class: "fl-stage" }, box, axes);
    const codeEl = h("pre", { class: "code fl-code" });
    root.append(controls, h("div", { class: "fl-right" }, stage, codeEl));

    const pushProp = () => ({ row: "margin-left", "row-reverse": "margin-right", column: "margin-top", "column-reverse": "margin-bottom" })[st.dir];
    function render() {
      groups.forEach((g) => g.sync && g.sync());
      itemGroups.forEach((g) => { g.hidden = sel < 0; if (sel >= 0) g.sync(); });
      itemHint.textContent = sel < 0 ? "👆 Click a stall to change just that item." : `Stall ${sel + 1} (${STALLS[sel][1]}) selected — click it again to deselect.`;
      Object.assign(box.style, { flexDirection: st.dir, justifyContent: st.jc, alignItems: st.ai, flexWrap: st.wrap, gap: st.gap + "px", width: st.width + "%" });
      box.textContent = "";
      for (let i = 0; i < st.n; i++) {
        const it = items[i];
        const b = h("button", { class: "fl-item" + (i === sel ? " sel" : ""), type: "button", "aria-pressed": String(i === sel) },
          h("b", { text: STALLS[i][0] }), h("span", { text: STALLS[i][1] }), h("small", { class: "fl-size" }));
        b.style.paddingBlock = PADS[i] + "em";
        b.style.flex = `${it.grow} ${it.shrink} ${it.basis}`;
        b.style.alignSelf = it.self;
        if (it.push) b.style[pushProp().replace(/-(\w)/, (m, c) => c.toUpperCase())] = "auto";
        b.onclick = () => { sel = sel === i ? -1 : i; render(); };
        box.append(b);
      }
      // code
      const L = [".pier {", "  display: flex;"];
      if (st.dir !== "row") L.push(`  flex-direction: ${st.dir};`);
      if (st.jc !== "flex-start") L.push(`  justify-content: ${st.jc};`);
      if (st.ai !== "stretch") L.push(`  align-items: ${st.ai};`);
      if (st.wrap !== "nowrap") L.push(`  flex-wrap: ${st.wrap};`);
      if (st.gap) L.push(`  gap: ${st.gap}px;`);
      L.push("}");
      items.slice(0, st.n).forEach((it, i) => {
        const d = [];
        if (it.grow) d.push(`flex-grow: ${it.grow};`);
        if (it.shrink !== 1) d.push(`flex-shrink: ${it.shrink};`);
        if (it.basis !== "auto") d.push(`flex-basis: ${it.basis};`);
        if (it.self !== "auto") d.push(`align-self: ${it.self};`);
        if (it.push) d.push(`${pushProp()}: auto;`);
        if (d.length) L.push(`.stall:nth-child(${i + 1}) { ${d.join(" ")} }`);
      });
      codeEl.innerHTML = hlCSS(L.join("\n"));
      requestAnimationFrame(measure);
    }
    function measure() {
      const col = /column/.test(st.dir);
      box.querySelectorAll(".fl-item").forEach((b) => { b.querySelector(".fl-size").textContent = Math.round(col ? b.offsetHeight : b.offsetWidth) + "px"; });
      axes.textContent = "";
      const sr = stage.getBoundingClientRect(), r = box.getBoundingClientRect();
      if (!sr.width) return;
      const k = sr.width / stage.offsetWidth || 1; // undo transforms (deck scaling)
      const L = (r.left - sr.left) / k, T = (r.top - sr.top) / k, W = r.width / k, H = r.height / k;
      const mk = (cls, x, y, w, hh, label) => {
        const el = h("div", { class: "ov ov-axis " + cls }, h("span", { text: label }));
        Object.assign(el.style, { left: x + "px", top: y + "px", width: w + "px", height: hh + "px" });
        axes.append(el);
      };
      const rev = /reverse/.test(st.dir) ? " rev" : "";
      if (!col) { mk("main" + rev, L + 4, T - 14, W - 8, 0, "main axis · justify-content"); mk("cross v", L - 14, T + 4, 0, H - 8, "cross · align-items"); }
      else { mk("main v" + rev, L - 14, T + 4, 0, H - 8, "main axis · justify-content"); mk("cross", L + 4, T - 14, W - 8, 0, "cross · align-items"); }
    }
    new ResizeObserver(() => requestAnimationFrame(measure)).observe(stage);
    render();
  }

  /* ------------------------------------------------------------------------
     Position lab — one badge, five position values, the containing block drawn
     ------------------------------------------------------------------------ */
  const POS_PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
    html{scrollbar-width:thin}
    body{margin:0;font:17px/1.5 system-ui,sans-serif;background:#12151d;color:#f3ecdf}
    .top{background:#1b202b;padding:10px 16px;font-weight:800;border-bottom:2px solid #3a4254}
    main{padding:14px 18px 40px;max-width:640px}
    h2{margin:6px 0 8px;font-size:22px}
    p{color:#c9c1b3;margin:0 0 10px}
    .card{background:#1b202b;border:2px solid #3a4254;border-radius:12px;padding:14px 18px;margin:14px 0 14px 40px}
    .card h3{margin:0 0 6px;font-size:21px}
    .badge{display:inline-block;font:800 13px/1 ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.1em;color:#ff6b4a;border:3px double #ff6b4a;padding:6px 8px;border-radius:6px;background:#1b202b;z-index:2}
    #__cb{position:absolute;pointer-events:none;border:3px dashed #ffd23f;border-radius:10px;box-sizing:border-box;z-index:1}
    #__cb span, #__ghost span{position:absolute;left:6px;top:6px;background:#ffd23f;color:#17140f;font:800 12px/1 ui-monospace,Menlo,monospace;padding:4px 6px;border-radius:4px;white-space:nowrap}
    #__ghost{position:absolute;pointer-events:none;border:2px dashed #5ec8d8;border-radius:6px;box-sizing:border-box}
    #__ghost span{background:#5ec8d8;top:auto;bottom:-22px}
  </style></head><body>
    <div class="top">🏮 Night Market</div>
    <main>
      <h2>Vendors</h2>
      <p>Forty stalls on the waterfront. Scroll this little page to see fixed and sticky at work.</p>
      <article class="card"><h3>Churros Till Late</h3><p>Crisp, sugared and dunked in thick chocolate.</p><strong class="badge">Sold out</strong> <p>Open until the last dancer leaves. Cash only.</p></article>
      <p>Side B Records has crates of second-hand vinyl sorted by mood instead of genre.</p>
      <p>Salt &amp; Ink prints risograph posters of the port and signs them while you wait.</p>
      <p>The Plant Swap: bring a cutting, take a cutting. Pots are free, advice is free.</p>
      <p>Mezcal Moon: small-batch mezcal and orange slices dusted with chilli salt.</p>
      <p>Dumpling Dynasty: the queue is part of the experience.</p>
      <p>The market has never closed early.</p>
      <h2>Schedule</h2>
      <p>19:00 — Doors open, DJ Marisol warms up on the main stage.</p>
      <p>19:30 — Dumpling folding class at the long table. Aprons provided.</p>
      <p>20:30 — Los Faroles play live cumbia. Bring your dancing shoes.</p>
      <p>21:30 — Zine-making workshop: scissors, glue, a photocopier, no rules.</p>
      <p>22:30 — Harbour Brass Band marches down the pier.</p>
      <p>00:00 — Silent disco until close. Headphones at the gate.</p>
      <h2>FAQ</h2>
      <p>Is it really free? Entry is free. Bring cash or a card for the stalls.</p>
      <p>Can I bring my dog? Yes, on a leash. The dumplings are not for dogs.</p>
      <p>What if it rains? We move under the big tent next to the main stage.</p>
      <p>Is there parking? Barely. Take the metro to Drassanes and walk five minutes.</p>
      <p>Can I sell at the market? Applications for next month open on Monday.</p>
      <h2>Getting here</h2>
      <p>Moll de la Fusta, Barcelona. Follow the lanterns from the Columbus monument.</p>
      <p>Last metro leaves around midnight on Fridays; night buses run all night.</p>
      <p>Bikes can be locked at the racks by the entrance.</p>
      <p>See you on the waterfront. 🏮</p>
    </main>
  </body></html>`;
  function PositionLab(root) {
    const ds = root.dataset;
    const st = { pos: ds.position || "static", top: ds.top || "auto", right: ds.right || "auto", card: ds.card || "static" };
    const zoom = parseFloat(ds.zoom || (inDeck(root) ? "1.5" : "1"));
    root.textContent = "";
    const rerender = () => update();
    const groups = [
      chipGroup(".badge position", ["static", "relative", "absolute", "fixed", "sticky"], () => st.pos, (v) => { st.pos = v; rerender(); }, "strong"),
      chipGroup("top", ["auto", "0", "20px", "50%"], () => st.top, (v) => { st.top = v; rerender(); }),
      chipGroup("right", ["auto", "0", "40px"], () => st.right, (v) => { st.right = v; rerender(); }),
      chipGroup(".card", ["static", "relative", "transform"], () => st.card, (v) => { st.card = v; rerender(); }, "strong"),
    ];
    const say = h("div", { class: "pl-say", "aria-live": "polite" });
    const codeEl = h("pre", { class: "code pl-code" });
    const frame = h("iframe", { title: "Position preview" });
    const stage = h("div", { class: "pl-stage" }, frame);
    root.append(h("div", { class: "lab-controls" }, ...groups, codeEl, say), stage);
    frame.srcdoc = POS_PAGE.replace("</body>", KEY_FORWARD + "</body>");
    frame.addEventListener("load", () => { const w = frame.contentWindow; w.addEventListener("scroll", () => draw()); update(); });
    function fit() {
      frame.style.width = stage.clientWidth / zoom + "px";
      frame.style.height = stage.clientHeight / zoom + "px";
      frame.style.transform = `scale(${zoom})`;
      draw();
    }
    new ResizeObserver(fit).observe(stage);
    function update() {
      groups.forEach((g) => g.sync());
      const off = st.pos === "static";
      codeEl.innerHTML = hlCSS(
        (st.card === "relative" ? `.card {\n  position: relative;\n}\n` : st.card === "transform" ? `.card {\n  transform: rotate(0);\n}\n` : "") +
        `.badge {\n  position: ${st.pos};\n` + (st.top !== "auto" ? `  top: ${st.top};${off ? " /* ignored */" : ""}\n` : "") + (st.right !== "auto" ? `  right: ${st.right};${off ? " /* ignored */" : ""}\n` : "") + "}");
      let d;
      try { d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body) return;
      const b = d.querySelector(".badge"), c = d.querySelector(".card");
      Object.assign(b.style, { position: st.pos, top: st.top, right: st.right });
      c.style.position = st.card === "relative" ? "relative" : "static";
      c.style.transform = st.card === "transform" ? "rotate(0)" : "";
      draw();
    }
    function draw() {
      let d;
      try { d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body) return;
      const w = d.defaultView;
      d.querySelectorAll("#__cb, #__ghost").forEach((e) => e.remove());
      const b = d.querySelector(".badge");
      const mk = (id, x, y, wd, ht, label, fixed) => {
        const e = d.createElement("div");
        e.id = id;
        e.style.cssText = `left:${x}px;top:${y}px;width:${wd}px;height:${ht}px;${fixed ? "position:fixed" : ""}`;
        const s = d.createElement("span"); s.textContent = label; e.append(s);
        d.body.append(e);
      };
      const sx = w.scrollX, sy = w.scrollY;
      let msg = "";
      if (st.pos === "static") msg = "<b>static</b> (the default): the badge sits in the flow of text. <code>top</code> and <code>right</code> do nothing.";
      if (st.pos === "relative" || st.pos === "sticky") {
        const save = b.style.position;
        b.style.position = "static";
        const r = b.getBoundingClientRect();
        b.style.position = save;
        mk("__ghost", r.left + sx, r.top + sy, r.width, r.height, "its seat in the flow");
        msg = st.pos === "relative"
          ? "<b>relative</b>: moved from its seat, but the seat stays reserved. Nothing around it moves."
          : "<b>sticky</b>: normal flow until you scroll past <code>top</code>, then it sticks, but only while its parent (<code>.card</code>) is on screen. Scroll the page.";
      }
      // containing block for absolute: nearest ancestor that is positioned OR has a transform;
      // for fixed: the window, unless an ancestor has a transform (then that ancestor)
      const anchorOf = (fixed) => {
        let p = b.parentElement;
        while (p && p !== d.documentElement && p !== d.body) {
          const cs = w.getComputedStyle(p);
          if (cs.transform !== "none" || (!fixed && cs.position !== "static")) return p;
          p = p.parentElement;
        }
        return null;
      };
      const drawAnchor = (p) => {
        const r = p.getBoundingClientRect(), cs = w.getComputedStyle(p);
        mk("__cb", r.left + sx + parseFloat(cs.borderLeftWidth), r.top + sy + parseFloat(cs.borderTopWidth), p.clientWidth, p.clientHeight, "containing block: ." + p.className + (cs.transform !== "none" && cs.position === "static" ? " (because of transform!)" : ""));
      };
      if (st.pos === "fixed" && anchorOf(true)) {
        drawAnchor(anchorOf(true));
        say.innerHTML = "<b>fixed</b>, but trapped: an ancestor with a <code>transform</code> (or <code>filter</code>, <code>contain</code>…) becomes the containing block even for fixed. Scroll: it scrolls away with the card. The classic \"my modal isn't fixed\" bug.";
        return;
      }
      if (st.pos === "absolute") {
        const p = anchorOf(false);
        if (p) {
          drawAnchor(p);
          msg = w.getComputedStyle(p).position === "static"
            ? "<b>absolute</b>: the card isn't positioned, but its <code>transform</code> makes it a containing block anyway."
            : "<b>absolute</b>: out of the flow, pinned to the nearest <b>positioned</b> ancestor: the card.";
        } else {
          mk("__cb", 0, 0, d.documentElement.clientWidth, w.innerHeight, "containing block: the first screen of the page");
          msg = "<b>absolute</b>: out of the flow. No positioned ancestor, so it's pinned to the <b>first screen of the page</b>. Give the card <code>position: relative</code>.";
        }
      }
      if (st.pos === "fixed") {
        mk("__cb", 0, 0, d.documentElement.clientWidth, w.innerHeight, "containing block: the window", true);
        msg = "<b>fixed</b>: pinned to the window. Scroll: it doesn't move. The card's position doesn't matter.";
      }
      say.innerHTML = msg;
    }
    fit();
  }

  /* ------------------------------------------------------------------------
     Countdown timer
     ------------------------------------------------------------------------ */
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.22);
      });
    } catch (e) { /* no audio, no problem */ }
  }
  function Timer(btn) {
    const total = Math.round(parseFloat(btn.dataset.min || "5") * 60);
    let left = total, t = null, endAt = 0;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const label = btn.dataset.label ? btn.dataset.label + " " : "";
    const show = () => { btn.textContent = label + fmt(left); };
    btn.title = "Click: start / pause · Double-click: reset";
    btn.type = "button";
    btn.addEventListener("click", () => {
      if (btn.classList.contains("done")) { reset(); return; }
      if (t) { clearInterval(t); t = null; btn.classList.remove("running"); return; }
      endAt = Date.now() + left * 1000;
      btn.classList.add("running");
      t = setInterval(() => {
        left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        show();
        if (left === 0) { clearInterval(t); t = null; btn.classList.remove("running"); btn.classList.add("done"); beep(); }
      }, 250);
    });
    const reset = () => { clearInterval(t); t = null; left = total; btn.classList.remove("running", "done"); show(); };
    btn.addEventListener("dblclick", reset);
    show();
  }

  /* ------------------------------------------------------------------------
     Brief generator for the final makeover
     ------------------------------------------------------------------------ */
  const MOODS = [
    ["Midnight Arcade", "CRT glow, chunky pixels, high-score energy.", ["#0d0221", "#ff2a6d", "#05d9e8", "#f9f871"]],
    ["Swiss Poster, 1962", "A strict grid, giant type, one loud red.", ["#ffffff", "#111111", "#e30613", "#d9d9d9"]],
    ["Grandma's Recipe Card", "Warm paper, serif type, a coffee stain.", ["#f6ecd9", "#6b3e26", "#c8553d", "#90a955"]],
    ["Acid Rave Flyer, 1994", "Smiley faces, clashing neon, zero chill.", ["#ccff00", "#ff00aa", "#111111", "#00e5ff"]],
    ["Tokyo Train Timetable", "Dense, precise, colour-coded lines.", ["#ffffff", "#1b1b1b", "#00a0e9", "#f39800"]],
    ["Luxury Perfume Launch", "Whitespace, thin serif, whispered prices.", ["#faf7f2", "#1a1a1a", "#b89b72", "#e8e1d6"]],
    ["Botanical Field Guide", "Latin names, ink sketches, pressed leaves.", ["#f3efe0", "#2f3e2e", "#6a994e", "#bc4749"]],
    ["Newspaper Front Page", "Columns, rules, a headline that screams.", ["#f7f4ec", "#111111", "#8a8a8a", "#b3001b"]],
    ["Mission Control", "Dark consoles, monospace readouts, one warning light.", ["#0b1320", "#9ae6b4", "#f6ad55", "#e2e8f0"]],
    ["Candy Shop", "Pastel stripes, round corners, sugar rush.", ["#fff0f6", "#ff85c0", "#95de64", "#69c0ff"]],
    ["Film Noir", "Black, white, venetian-blind shadows.", ["#0a0a0a", "#f2f2f2", "#7a7a7a", "#c0a062"]],
    ["Seaside Ice-Cream Van", "Mint, strawberry, hand-painted lettering.", ["#e6fff7", "#ff6b8b", "#3ec1a8", "#ffd166"]],
  ];
  const PALETTES = [
    ["One colour only", "Ignore the swatches: one colour plus lighter and darker versions of it (the colour playground makes shades)."],
    ["Black, white + one", "Black, white and exactly one accent colour. Use it sparingly."],
    ["Opposites attract", "Two colours from opposite sides of the colour wheel — orange and blue, red and teal."],
    ["Pastel only", "Soft, light backgrounds (think ice cream). Text stays dark."],
    ["Dark mode", "Background lightness under 15 %. Text must pass 4.5:1 contrast."],
    ["Named colours only", "Only CSS colour names: tomato, rebeccapurple, papayawhip…"],
    ["Stolen palette", "Take the four swatches on the mood card as custom properties."],
  ];
  const CONSTRAINTS = [
    ["No px", "Not a single px — except for borders."],
    ["One radius", "A single --radius variable used for every rounded corner."],
    ["Five variables", "At least five custom properties. Change one, restyle the page."],
    ["No emoji", "Decorate only with CSS: borders, gradients, shadows."],
    ["Monospace everything", "One monospace family for the whole page. Make it look intentional."],
    ["Two fonts max", "One family for headings, one for text. That's it."],
    ["Zero radius", "border-radius: 0 on everything. Sharp is the look."],
    ["Huge headline", "The h1 is at least 5rem. Everything else stays calm."],
    ["em for spacing", "Paddings and margins in em, so they grow with the text."],
  ];
  function Brief(root) {
    root.textContent = "";
    const cards = h("div", { class: "brief-cards" });
    const btn = h("button", { class: "brief-draw", type: "button", text: "🎲 Draw a brief" });
    root.append(cards, btn);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    function render(m, p, c) {
      cards.innerHTML = `
        <div class="brief-card"><small>A night market in the style of</small><strong>${m[0]}</strong><p>${m[1]}</p><div class="swatches">${m[2].map((x) => `<i style="background:${x}" title="${x}"></i>`).join("")}</div></div>
        <div class="brief-card"><small>Colour rule</small><strong>${p[0]}</strong><p>${p[1]}</p></div>
        <div class="brief-card"><small>Constraint</small><strong>${c[0]}</strong><p>${c[1]}</p></div>`;
    }
    btn.addEventListener("click", () => {
      root.classList.add("shuffling");
      let k = 0;
      const t = setInterval(() => {
        render(pick(MOODS), pick(PALETTES), pick(CONSTRAINTS));
        if (++k > 9) { clearInterval(t); root.classList.remove("shuffling"); }
      }, 70);
    });
    render(MOODS[0], PALETTES[PALETTES.length - 1], CONSTRAINTS[0]);
  }

  /* ------------------------------------------------------------------------
     Scrollburglars — what makes a page scroll sideways?
     ------------------------------------------------------------------------ */
  Kit.describe = (el) => {
    if (!el || !el.localName) return String(el);
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).join(".") : "";
    return el.localName + (el.id ? "#" + el.id : "") + cls;
  };
  Kit.burglars = function (d) {
    const de = d.documentElement, W = de.clientWidth, win = d.defaultView;
    const extra = Math.max(0, Math.round(de.scrollWidth - W));
    if (!extra || !d.body) return { extra: 0, culprits: [] };
    // an element inside a box that clips or scrolls can't push the page
    const contained = (el) => {
      for (let p = el.parentElement; p && p !== d.body; p = p.parentElement) {
        const cs = win.getComputedStyle(p);
        if (cs.overflowX !== "visible") return true;
      }
      return false;
    };
    // text can stick out of a box that doesn't (a long URL, white-space: nowrap)
    const textOut = (el) => [...el.childNodes].some((n) => {
      if (n.nodeType !== 3 || !n.textContent.trim()) return false;
      const rg = d.createRange();
      rg.selectNodeContents(n);
      return rg.getBoundingClientRect().right > W + 0.5;
    });
    const all = [...d.body.querySelectorAll("*")].filter((el) => {
      if (el.id && el.id.startsWith("__")) return false;
      const r = el.getBoundingClientRect();
      if (!r.width || win.getComputedStyle(el).position === "fixed" || contained(el)) return false;
      return r.right > W + 0.5 || textOut(el);
    });
    const set = new Set(all);
    // the burglar is the outermost offender: the first box that sticks out while its parent doesn't
    const culprits = all.filter((el) => !set.has(el.parentElement));
    return { extra, culprits };
  };

  /* ------------------------------------------------------------------------
     JavaScript highlighting
     ------------------------------------------------------------------------ */
  const JS_KW = new Set("const let var function return if else for of in while do new class this true false null undefined await async typeof instanceof break continue switch case default try catch finally throw import export from".split(" "));
  const JS_GLOBAL = new Set(["document", "window", "console", "event", "Math", "Number", "String", "FormData", "Array", "Object", "JSON", "Date"]);
  function hlJS(src) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([⟦⟧])/g;
    let out = "", last = 0, m;
    const punct = (t) => (t ? (/\S/.test(t) ? `<span class="t-p">${esc(t)}</span>` : t) : "");
    while ((m = re.exec(src))) {
      out += punct(src.slice(last, m.index));
      const t = m[0];
      if (m[1]) out += `<span class="t-c">${esc(t)}</span>`;
      else if (m[2]) out += `<span class="t-str">${esc(t)}</span>`;
      else if (m[3]) out += `<span class="t-num">${t}</span>`;
      else if (m[4]) {
        const afterDot = src[m.index - 1] === ".";
        const call = /^\s*\(/.test(src.slice(re.lastIndex));
        if (!afterDot && JS_KW.has(t)) out += `<span class="t-kw">${t}</span>`;
        else if (!afterDot && JS_GLOBAL.has(t)) out += `<span class="t-glob">${t}</span>`;
        else if (call) out += `<span class="t-fn">${t}</span>`;
        else if (afterDot) out += `<span class="t-prop">${t}</span>`;
        else out += `<span class="t-id">${t}</span>`;
      } else out += t === MO ? "<mark>" : "</mark>";
      last = re.lastIndex;
    }
    out += punct(src.slice(last));
    return out;
  }
  Kit.hlJS = hlJS;

  /* ------------------------------------------------------------------------
     A code editor pane: highlighted <pre> under a transparent <textarea>
     ------------------------------------------------------------------------ */
  function codePane(opts) {
    const lang = opts.lang || "js";
    const hi = (v) => (lang === "js" ? hlJS(v) : lang === "html" ? hlHTML(v) : hlCSS(v));
    const pre = h("pre", { "aria-hidden": "true" });
    const ta = h("textarea", { spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": (opts.file || "code") + " editor" });
    ta.value = opts.initial || "";
    const views = [];
    const code = h("div", { class: "live-code" }, pre, ta);
    const tabMain = h("button", { class: "live-tab", "aria-selected": "true", type: "button", text: opts.file || "script.js" });
    const tabs = [tabMain];
    const pick = (i) => {
      tabs.forEach((t, k) => t.setAttribute("aria-selected", String(k === i)));
      views.forEach((v, k) => { v.hidden = k + 1 !== i; });
    };
    tabMain.onclick = () => pick(0);
    (opts.extraTabs || []).forEach(([name, langX, src], i) => {
      const v = h("pre", { class: "html-view", hidden: true });
      v.innerHTML = langX === "html" ? hlHTML(prettyHTML(src)) : langX === "css" ? hlCSS(src) : hlJS(src);
      views.push(v);
      code.append(v);
      const t = h("button", { class: "live-tab", "aria-selected": "false", type: "button", text: name });
      t.onclick = () => pick(i + 1);
      tabs.push(t);
    });
    const bar = h("div", { class: "live-bar" }, h("i", { class: "dot" }), h("i", { class: "dot" }), h("i", { class: "dot" }), tabs, h("span", { class: "spacer" }), opts.buttons || []);
    const pane = h("div", { class: "live-pane" }, bar);
    if (opts.locked) {
      const lp = h("pre", { class: "code" });
      lp.innerHTML = hi(opts.locked);
      pane.append(h("div", { class: "live-locked" }, h("span", { class: "live-locked-label", text: opts.lockedLabel || "🔒 already in the file — read only" }), lp));
    }
    pane.append(code);
    const paint = () => { pre.innerHTML = hi(ta.value) + "\n "; pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
    ta.addEventListener("scroll", () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; });
    ta.addEventListener("input", () => { paint(); opts.onInput && opts.onInput(ta.value); });
    ta.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { ta.blur(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); opts.onRun && opts.onRun(); return; }
      if (e.key === "Tab") { e.preventDefault(); document.execCommand("insertText", false, "  "); }
      else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        const before = ta.value.slice(0, ta.selectionStart);
        const line = before.slice(before.lastIndexOf("\n") + 1);
        let indent = line.match(/^\s*/)[0];
        if (/[{(\[]\s*$/.test(line)) indent += "  ";
        e.preventDefault();
        document.execCommand("insertText", false, "\n" + indent);
      } else if (e.key === "}" || e.key === ")" || e.key === "]") {
        const before = ta.value.slice(0, ta.selectionStart);
        const line = before.slice(before.lastIndexOf("\n") + 1);
        if (/^\s{2,}$/.test(line)) {
          e.preventDefault();
          ta.setSelectionRange(ta.selectionStart - 2, ta.selectionStart);
          document.execCommand("insertText", false, e.key);
        }
      }
    });
    paint();
    return { pane, ta, get: () => ta.value, set: (v) => { ta.value = v; paint(); opts.onInput && opts.onInput(v); } };
  }
  Kit.codePane = codePane;

  /* ------------------------------------------------------------------------
     Running student JavaScript in a same-origin iframe, with a console
     ------------------------------------------------------------------------ */
  const isEl = (v) => v && typeof v === "object" && v.nodeType === 1 && typeof v.localName === "string";
  function fmt(v, depth = 0, top = true) {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    const t = typeof v;
    if (t === "string") return top ? v : JSON.stringify(v);
    if (t === "number" || t === "boolean" || t === "bigint") return String(v);
    if (t === "function") return `ƒ ${v.name || "anonymous"}()`;
    if (t === "symbol") return v.toString();
    if (isEl(v)) {
      const attrs = [...v.attributes].filter((a) => a.name !== "style" || a.value).slice(0, 3).map((a) => (a.value === "" ? " " + a.name : ` ${a.name}="${a.value.length > 24 ? a.value.slice(0, 22) + "…" : a.value}"`)).join("");
      return `<${v.localName}${attrs}>`;
    }
    if (v.nodeType === 3) return `#text ${JSON.stringify(v.textContent.slice(0, 40))}`;
    if (v.nodeType === 9) return "#document";
    const ctor = (v.constructor && v.constructor.name) || "Object";
    if (typeof v.length === "number" && typeof v.item === "function") {
      if (depth > 1) return `${ctor}(${v.length})`;
      return `${ctor}(${v.length}) [${[...v].slice(0, 8).map((x) => fmt(x, depth + 1, false)).join(", ")}${v.length > 8 ? ", …" : ""}]`;
    }
    if (ctor === "FormData") return `FormData { ${[...v.entries()].map(([k, x]) => `${k}: ${fmt(x, 2, false)}`).join(", ")} }`;
    if (ctor === "DOMTokenList") return `DOMTokenList(${v.length}) [${[...v].map((x) => JSON.stringify(x)).join(", ")}]`;
    if (ctor === "DOMStringMap") return `DOMStringMap { ${Object.keys(v).map((k) => `${k}: ${JSON.stringify(v[k])}`).join(", ")} }`;
    if (typeof v.type === "string" && v.target !== undefined && "bubbles" in v) return `${ctor} { type: "${v.type}", target: ${fmt(v.target, 2, false)} }`;
    if (v instanceof Error || (typeof v.message === "string" && typeof v.stack === "string")) return `${v.name || "Error"}: ${v.message}`;
    if (Array.isArray(v) || ctor === "Array") {
      if (depth > 1) return `Array(${v.length})`;
      return `[${v.slice(0, 12).map((x) => fmt(x, depth + 1, false)).join(", ")}${v.length > 12 ? ", …" : ""}]`;
    }
    if (depth > 1) return "{…}";
    const keys = Object.keys(v).slice(0, 10);
    return `${ctor === "Object" ? "" : ctor + " "}{ ${keys.map((k) => `${k}: ${fmt(v[k], depth + 1, false)}`).join(", ")}${Object.keys(v).length > 10 ? ", …" : ""} }`;
  }
  Kit.fmt = fmt;

  // Plain-language hints for the errors beginners meet first
  function errorHint(msg) {
    if (/Cannot (read|set) propert(y|ies) of (null|undefined)|null is not an object|is null/i.test(msg)) return "Something you selected is null: querySelector found no element. Check the selector, or whether the element exists yet.";
    if (/forEach is not a function|\.map is not a function/i.test(msg)) return "Only lists have forEach. querySelector returns ONE element; querySelectorAll returns the list.";
    if (/addEventListener is not a function/i.test(msg)) return "addEventListener lives on ONE element. On a list (querySelectorAll), loop over it first.";
    if (/is not defined/i.test(msg)) return "A name JavaScript doesn't know. Typo? Names are case-sensitive: querySelector, not queryselector.";
    if (/Assignment to constant/i.test(msg)) return "A const can't be reassigned. Use let for values that change.";
    if (/is not a function/i.test(msg)) return "You called something that isn't a function. Check the spelling and the brackets.";
    if (/Unexpected (token|end|identifier)|missing \)|Invalid or unexpected/i.test(msg)) return "A syntax error: an unclosed bracket, quote or a missing comma. The line number is where JavaScript gave up.";
    if (/already been declared/i.test(msg)) return "The same name declared twice with const/let. Pick a new name, or reuse the old one without const.";
    return "";
  }
  Kit.errorHint = errorHint;

  const CONSOLE_SHIM = `<script>(function(){var host=window.frameElement;window.__logs=[];window.__errors=[];function send(kind,args){try{host&&host.__onlog&&host.__onlog(kind,args)}catch(e){}}["log","info","warn","error","table","dir"].forEach(function(k){var o=console[k];console[k]=function(){var a=[].slice.call(arguments);window.__logs.push({kind:k,args:a});send(k,a);try{o.apply(console,a)}catch(e){}}});window.addEventListener("error",function(e){var ln=e.lineno-(window.__offset||0);window.__errors.push(e.message);send("uncaught",[e.message,ln>0?ln:0])});window.addEventListener("unhandledrejection",function(e){var m=String(e.reason&&e.reason.message||e.reason);window.__errors.push(m);send("uncaught",[m,0])});document.addEventListener("submit",function(e){if(!e.defaultPrevented){e.preventDefault();window.__reloaded=true;send("warn",["⟳ The form was submitted and the browser would now reload the page: everything your script did is gone. Did you forget event.preventDefault()?"])}});})()<\/script>`;
  const JS_FRAME_BASE = "body{margin:16px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.4}";

  // Build the document the student's script runs in. Their code starts on a known line,
  // so error line numbers can be reported relative to their file.
  function jsDoc({ html, css, js, before }) {
    const head = `<!doctype html><html lang="en"><head><meta charset="utf-8">${FONT_LINK}<style>${JS_FRAME_BASE}</style><style>${css || ""}</style><script>window.__offset=__OFF__<\/script>${CONSOLE_SHIM}${KEY_FORWARD}</head><body>${html}${before ? `<script>${before}<\/script>` : ""}<script>`;
    const off = (head.match(/\n/g) || []).length;
    return head.replace("__OFF__", String(off)) + "\n" + js + "\n<\/script></body></html>";
  }
  Kit.jsDoc = jsDoc;

  function loadFrame(frame, docSrc) {
    return new Promise((res) => {
      const done = () => { frame.removeEventListener("load", done); res(frame); };
      frame.addEventListener("load", done);
      frame.srcdoc = docSrc;
    });
  }

  // Helpers the checks use to poke the page like a user would
  function testKit(frame) {
    const win = frame.contentWindow, doc = frame.contentDocument;
    const pick = (s) => (typeof s === "string" ? doc.querySelector(s) : s);
    const logs = () => (win.__logs || []).map((l) => l.args.map((a) => fmt(a)).join(" "));
    return {
      doc, win,
      $: (s) => doc.querySelector(s),
      $$: (s) => [...doc.querySelectorAll(s)],
      text: (s) => { const e = pick(s); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; },
      click: (s) => { const e = pick(s); if (e) e.click(); return !!e; },
      type: (s, value) => {
        const e = pick(s);
        if (!e) return false;
        e.focus();
        e.value = value;
        e.dispatchEvent(new win.Event("input", { bubbles: true }));
        e.dispatchEvent(new win.Event("change", { bubbles: true }));
        return true;
      },
      // like a person: click the submit button (click → validation → submit), else submit the form
      submit: (s) => { const f = pick(s || "form"); if (!f) return false; const b = f.querySelector("[type=submit]"); if (b) b.click(); else if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true })); return true; },
      key: (s, k) => { const e = pick(s) || doc.body; e.dispatchEvent(new win.KeyboardEvent("keydown", { key: k, bubbles: true })); },
      logs,
      errors: () => win.__errors || [],
      wait: (ms = 30) => new Promise((r) => setTimeout(r, ms)),
      visible: (s) => { const e = pick(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && win.getComputedStyle(e).visibility !== "hidden"; },
    };
  }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  async function runJSChecks(root, checks, docSrc, park) {
    const results = [];
    for (const c of checks) {
      const f = h("iframe", { tabindex: "-1", title: "" });
      park.append(f);
      let pass = false;
      try {
        await loadFrame(f, docSrc);
        const k = testKit(f);
        await k.wait(20);
        const fn = new AsyncFunction("$", "$$", "text", "click", "type", "submit", "key", "logs", "errors", "wait", "visible", "doc", "win", c.run || `return (${c.expr});`);
        pass = !!(await Promise.race([
          fn(k.$, k.$$, k.text, k.click, k.type, k.submit, k.key, k.logs, k.errors, k.wait, k.visible, k.doc, k.win),
          new Promise((r) => setTimeout(() => r(false), 1500)),
        ]));
      } catch (e) { pass = false; }
      f.remove();
      results.push(pass);
    }
    return results;
  }
  Kit.runJSChecks = runJSChecks;

  function consoleView() {
    const list = h("ol", { class: "js-console-list", "aria-live": "polite" });
    const clearBtn = h("button", { class: "live-btn", type: "button", text: "clear" });
    const el = h("div", { class: "js-console" }, h("div", { class: "js-console-bar" }, h("span", { text: "Console" }), h("span", { class: "spacer" }), clearBtn), list);
    const add = (kind, args) => {
      let text, hint = "";
      if (kind === "uncaught") {
        text = `Uncaught ${args[0]}` + (args[1] ? `  (line ${args[1]})` : "");
        hint = errorHint(args[0]);
        kind = "error";
      } else if (kind === "result") {
        text = "← " + fmt(args[0], 0, false);
      } else if (kind === "input") {
        text = "› " + args[0];
      } else text = args.map((a) => fmt(a)).join(" ");
      const li = h("li", { class: "c-" + kind, text });
      if (hint) li.append(h("small", { text: "💡 " + hint }));
      list.append(li);
      while (list.children.length > 200) list.firstChild.remove();
      list.scrollTop = list.scrollHeight;
    };
    const clear = () => { list.textContent = ""; };
    clearBtn.onclick = clear;
    return { el, add, clear };
  }
  Kit.consoleView = consoleView;


  // The Night Market look, shared by every JS preview (data-market on the component)
  const MARKET_CSS = `*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:16px;background:#12151d;color:#f3ecdf;font:400 16px/1.5 "Bricolage Grotesque",system-ui,sans-serif}
a{color:#ffb547}
h1,h2,h3{line-height:1.05;margin:0 0 .4rem}
h1{font:400 2.4rem/1 "Instrument Serif",Georgia,serif}
h2{font-size:1.5rem}
p{color:#c9c1b3;margin:0 0 .6rem}
.eyebrow{color:#5ec8d8;font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:.75rem}
.site-header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.5rem;padding:.6rem .9rem;margin:-16px -16px 16px;background:#171b25;border-bottom:2px solid #3a4254}
.logo{font-weight:800;color:#f3ecdf;text-decoration:none}
.main-nav{flex-basis:100%}
.main-nav ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.2rem}
.main-nav a{color:#c9c1b3;text-decoration:none;font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:.8rem}
.menu-toggle{font:800 .75rem/1 "Bricolage Grotesque",system-ui;text-transform:uppercase;letter-spacing:.1em;color:#f3ecdf;background:#262c3a;border:2px solid #3a4254;border-radius:99px;padding:.55rem .9rem;cursor:pointer}
.menu-toggle[aria-expanded="false"] + .main-nav{display:none}
.vendor-list{list-style:none;margin:0 0 1rem;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(11rem,100%),1fr));gap:.7rem}
.vendor-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:.3rem;background:#1b202b;border:2px solid #3a4254;border-radius:12px;padding:.8rem .9rem}
.vendor-card h3{font-size:1.1rem;margin:0}
.vendor-card p{font-size:.85rem;margin:0}
.vendor-card.featured{border-color:#ffb547}
.vendor-card.sold-out h3,.vendor-card.sold-out p{opacity:.5}
.tag{font:700 .65rem/1 ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.1em;background:#262c3a;color:#5ec8d8;padding:.3rem .45rem;border-radius:6px}
.badge{position:absolute;top:-.6rem;right:.6rem;transform:rotate(8deg);font:800 .7rem/1 ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.1em;color:#ff6b4a;border:3px double #ff6b4a;padding:.3rem .4rem;border-radius:6px;background:#1b202b}
.fav{font:700 .8rem/1 system-ui;color:#ffb547;background:none;border:2px solid #3a4254;border-radius:99px;padding:.35rem .6rem;cursor:pointer}
.fav[aria-pressed="true"]{background:#ffb547;color:#12151d;border-color:#ffb547}
.filters{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:0 0 .8rem}
.filters button{font:700 .7rem/1 ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.08em;color:#5ec8d8;background:#1b202b;border:2px solid #3a4254;border-radius:99px;padding:.45rem .7rem;cursor:pointer}
.filters button[aria-pressed="true"]{background:#5ec8d8;color:#12151d;border-color:#5ec8d8}
.count,.filter-count{color:#c9c1b3;font-size:.85rem}
.button,button[type=submit]{display:inline-block;font:800 .9rem "Bricolage Grotesque",system-ui;background:#ffb547;color:#12151d;border:0;border-radius:99px;padding:.65rem 1.1rem;text-decoration:none;cursor:pointer}
form{display:grid;gap:.35rem;max-width:26rem;background:#1b202b;border:2px solid #3a4254;border-radius:12px;padding:1rem}
label{font-weight:700;font-size:.9rem;margin-top:.3rem}
label.check{font-weight:400;color:#c9c1b3}
input:not([type=checkbox]),select,textarea{font:inherit;color:#f3ecdf;background:#12151d;border:2px solid #3a4254;border-radius:8px;padding:.45rem .6rem;width:100%}
input:user-invalid,textarea:user-invalid{border-color:#ff6b4a}
form button{justify-self:start;margin-top:.5rem}
.hint{font-size:.8rem;margin:0}
.error{color:#ff8a70;font-size:.85rem;margin:0}
.ticket{margin-top:1rem;padding:1rem 1.2rem;border:2px dashed #ffb547;border-radius:12px;background:#1b202b;max-width:26rem}
.ticket h3{font:400 1.7rem/1 "Instrument Serif",Georgia,serif}
.ticket p{margin:.2rem 0}
details{background:#1b202b;border:2px solid #3a4254;border-radius:10px;padding:.5rem .8rem;margin-bottom:.4rem}
summary{font-weight:700;cursor:pointer}
body.lights-out{background:#000}
body.lights-out .vendor-card{border-color:#ffb547;box-shadow:0 0 18px rgb(255 181 71 / .35)}
`;
  Kit.MARKET_CSS = MARKET_CSS;

  /* ------------------------------------------------------------------------
     Live JavaScript editor: script.js + preview + console + checks
     ------------------------------------------------------------------------ */
  function JSLive(root) {
    const get = (r) => { const s = root.querySelector(`:scope > script[data-role="${r}"]`); return s ? dedent(s.textContent) : null; };
    const html = get("html") || "";
    const css = (root.hasAttribute("data-market") ? MARKET_CSS : "") + (get("css") || "");
    const before = get("before"); // runs first, not shown as editable
    const checks = JSON.parse(get("checks") || "null");
    const ta0 = root.querySelector(":scope > textarea");
    const initial = dedent(ta0 ? ta0.value : "");
    const zoom = parseFloat(root.dataset.zoom || (inDeck(root) ? "1.4" : "1"));
    const auto = root.dataset.autorun !== "off";
    root.textContent = "";

    const runBtn = h("button", { class: "live-btn run", type: "button", text: "▶ run", title: "Run the script again (Ctrl/⌘ + Enter)" });
    const resetBtn = h("button", { class: "live-btn", type: "button", text: "↺ reset", title: "Back to the starting code" });
    const extra = [];
    if (root.hasAttribute("data-show-html")) extra.push(["index.html", "html", html]);
    if (root.hasAttribute("data-show-css")) extra.push(["style.css", "css", css]);
    let timer;
    const editor = codePane({
      file: root.dataset.file || "script.js", lang: "js", initial, extraTabs: extra, buttons: [runBtn, resetBtn],
      locked: before && root.hasAttribute("data-show-before") ? before : null, lockedLabel: "🔒 runs first — read only",
      onInput: () => { if (!auto) return; clearTimeout(timer); timer = setTimeout(run, 900); },
      onRun: () => run(),
    });
    const frame = h("iframe", { title: "Preview" });
    const previewPane = h("div", { class: "live-preview" }, frame, h("span", { class: "live-preview-label", text: root.dataset.label || "preview · click it, type in it" }));
    const con = consoleView();
    const right = h("div", { class: "js-right" }, previewPane, con.el);
    root.append(editor.pane, right);
    let checkList, park;
    if (checks) {
      checkList = h("ul", { class: "live-checks", "aria-live": "polite" });
      park = h("div", { class: "live-park", "aria-hidden": "true" });
      root.append(checkList, park);
      checkList.append(...checks.map((c) => h("li", { text: c.label })));
    }
    frame.__onlog = (kind, args) => con.add(kind, args);

    function fit() {
      const w = previewPane.clientWidth, hh = previewPane.clientHeight;
      frame.style.width = w / zoom + "px";
      frame.style.height = hh / zoom + "px";
      frame.style.transform = `scale(${zoom})`;
    }
    new ResizeObserver(fit).observe(previewPane);
    fit();

    let runId = 0;
    async function run() {
      clearTimeout(timer);
      const id = ++runId;
      con.clear();
      const src = jsDoc({ html, css, js: editor.get(), before });
      frame.srcdoc = src;
      if (!checks) return;
      await new Promise((r) => setTimeout(r, 150));
      if (id !== runId) return;
      const untouched = editor.get().trim() === initial.trim();
      const res = await runJSChecks(root, checks, src, park);
      if (id !== runId) return;
      checkList.textContent = "";
      checks.forEach((c, i) => checkList.append(h("li", { class: untouched ? "" : res[i] ? "pass" : "", text: c.label })));
      const all = res.every(Boolean) && !untouched;
      if (all) checkList.append(h("li", { class: "solved-msg", text: root.dataset.solved || "✓ Solved" }));
      root.classList.toggle("solved", all);
    }
    runBtn.onclick = run;
    resetBtn.onclick = () => { editor.set(initial); run(); };
    root.liveEditor = { get: editor.get, set: (v) => { editor.set(v); run(); }, frame, run };
    run();
  }

  /* ------------------------------------------------------------------------
     DOM lab — a page, its live tree, and a console to poke it with
     ------------------------------------------------------------------------ */
  const SKIP_TAGS = new Set(["script", "style", "link", "meta"]);
  function DomLab(root) {
    const get = (r) => { const s = root.querySelector(`:scope > script[data-role="${r}"]`); return s ? dedent(s.textContent) : null; };
    const html = get("html") || "<h1>Hello</h1>";
    const css = (root.hasAttribute("data-market") ? MARKET_CSS : "") + (get("css") || "");
    const presets = (root.dataset.presets || "").split("||").map((s) => s.trim()).filter(Boolean);
    const zoom = parseFloat(root.dataset.zoom || (inDeck(root) ? "1.3" : "1"));
    root.textContent = "";

    const frame = h("iframe", { title: "Page" });
    const hover = h("div", { class: "dl-hover", hidden: true });
    const previewPane = h("div", { class: "live-preview dl-page" }, frame, hover, h("span", { class: "live-preview-label", text: "the page" }));
    const tree = h("pre", { class: "dl-tree", "aria-label": "DOM tree" });
    const treeWrap = h("div", { class: "dl-treewrap" }, h("div", { class: "js-console-bar" }, h("span", { text: "Elements · the DOM tree" }), h("span", { class: "spacer" }), h("small", { text: "click a line → $0" })), tree);
    const con = consoleView();
    const input = h("input", { class: "dl-input", spellcheck: "false", autocapitalize: "off", autocomplete: "off", placeholder: "type JavaScript, press Enter", "aria-label": "Console input" });
    con.el.append(h("div", { class: "dl-prompt" }, h("span", { text: "›" }), input));
    const presetRow = h("div", { class: "dl-presets" });
    presets.forEach((p) => {
      const b = h("button", { class: "chip-btn", type: "button", text: p });
      b.onclick = () => { input.value = p; exec(); };
      presetRow.append(b);
    });
    const resetBtn = h("button", { class: "live-btn", type: "button", text: "↺ reset page" });
    root.append(previewPane, h("div", { class: "dl-side" }, treeWrap, con.el), presets.length ? presetRow : "", h("div", { class: "dl-foot" }, resetBtn));

    frame.__onlog = (kind, args) => con.add(kind, args);
    let lines = new Map(), flash = new Set(), obs, selected = null;
    const hist = [];
    let hIdx = 0;

    function fit() {
      const w = previewPane.clientWidth, hh = previewPane.clientHeight;
      frame.style.width = w / zoom + "px";
      frame.style.height = hh / zoom + "px";
      frame.style.transform = `scale(${zoom})`;
    }
    new ResizeObserver(fit).observe(previewPane);
    fit();

    function load() {
      frame.srcdoc = jsDoc({ html, css, js: "" });
    }
    frame.addEventListener("load", () => {
      const d = frame.contentDocument;
      if (!d || !d.body) return;
      if (obs) obs.disconnect();
      obs = new MutationObserver((muts) => {
        muts.forEach((m) => {
          const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          if (t) flash.add(t);
          m.addedNodes.forEach((n) => { if (n.nodeType === 1) flash.add(n); });
        });
        render();
      });
      obs.observe(d.body, { subtree: true, childList: true, attributes: true, characterData: true });
      d.addEventListener("click", (e) => { const a = e.target.closest("a[href]"); if (a) e.preventDefault(); });
      render();
    });

    function openTag(e) {
      return "<" + e.localName + [...e.attributes].map((a) => (a.value === "" ? " " + a.name : ` ${a.name}="${a.value}"`)).join("") + ">";
    }
    function render() {
      const d = frame.contentDocument;
      if (!d || !d.body) return;
      tree.textContent = "";
      lines = new Map();
      const add = (el, depth, htmlStr, cls) => {
        const line = h("span", { class: "dl-line" + (cls ? " " + cls : ""), html: "  ".repeat(depth) + htmlStr });
        if (el) {
          line.dataset.kit = "";
          line.onmouseenter = () => showHover(el);
          line.onmouseleave = () => { hover.hidden = true; };
          line.onclick = () => select(el);
          if (!lines.has(el)) lines.set(el, line);
          if (flash.has(el)) line.classList.add("flash");
          if (el === selected) line.classList.add("sel");
        }
        tree.append(line);
      };
      (function walk(node, depth) {
        for (const ch of node.childNodes) {
          if (ch.nodeType === 3) {
            const t = ch.textContent.replace(/\s+/g, " ").trim();
            if (t) add(null, depth, `<span class="dl-text">"${esc(t.length > 50 ? t.slice(0, 48) + "…" : t)}"</span>`);
            continue;
          }
          if (ch.nodeType !== 1 || SKIP_TAGS.has(ch.localName)) continue;
          const kids = [...ch.childNodes].filter((k) => (k.nodeType === 1 && !SKIP_TAGS.has(k.localName)) || (k.nodeType === 3 && k.textContent.trim()));
          const onlyText = kids.length === 1 && kids[0].nodeType === 3 && kids[0].textContent.trim().length < 40;
          if (!kids.length || onlyText) {
            const inner = onlyText ? esc(kids[0].textContent.replace(/\s+/g, " ").trim()) : "";
            add(ch, depth, hlHTML(openTag(ch)) + `<span class="dl-text">${inner}</span>` + (VOID_EL.has(ch.localName) ? "" : hlHTML(`</${ch.localName}>`)));
          } else {
            add(ch, depth, hlHTML(openTag(ch)));
            walk(ch, depth + 1);
            add(ch, depth, hlHTML(`</${ch.localName}>`), "close");
          }
        }
      })(d.body, 0);
      if (flash.size) {
        const first = tree.querySelector(".flash");
        if (first) first.scrollIntoView({ block: "nearest" });
        setTimeout(() => { tree.querySelectorAll(".flash").forEach((l) => l.classList.remove("flash")); }, 1200);
      }
      flash = new Set();
    }
    function showHover(el) {
      const r = el.getBoundingClientRect();
      Object.assign(hover.style, { left: r.left * zoom + "px", top: r.top * zoom + "px", width: r.width * zoom + "px", height: r.height * zoom + "px" });
      hover.hidden = false;
    }
    function select(el) {
      selected = el;
      frame.contentWindow.$0 = el;
      render();
      con.add("log", ["$0 = ", el]);
    }
    function exec() {
      const code = input.value.trim();
      if (!code) return;
      hist.push(code); hIdx = hist.length;
      con.add("input", [code]);
      input.value = "";
      const w = frame.contentWindow;
      // top-level const/let would vanish after each eval: keep them, like the real console does
      const src = code.replace(/(^|[;\n]\s*)(const|let)\s+/g, "$1var ");
      try {
        const res = w.eval(src);
        if (!(res === undefined && /^(var|function|if|for|while)\b/.test(src))) con.add("result", [res]);
      } catch (e) {
        con.add("uncaught", [e.message, 0]);
      }
    }
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { input.blur(); return; }
      if (e.key === "Enter") { e.preventDefault(); exec(); }
      if (e.key === "ArrowUp" && hist.length) { e.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = hist[hIdx]; }
      if (e.key === "ArrowDown" && hist.length) { e.preventDefault(); hIdx = Math.min(hist.length, hIdx + 1); input.value = hist[hIdx] || ""; }
    });
    resetBtn.onclick = () => { selected = null; con.clear(); load(); };
    load();
  }

  /* ------------------------------------------------------------------------
     Event lab — watch a click bubble up, and who hears it
     ------------------------------------------------------------------------ */
  function EventLab(root) {
    const ds = root.dataset;
    const LEVELS = [
      { key: "section", label: "section#vendors", sel: "section" },
      { key: "ul", label: "ul.vendor-list", sel: "ul" },
      { key: "li", label: "li.stall", sel: "li" },
      { key: "button", label: "button.save", sel: "button" },
    ];
    const on = new Set((ds.listen || "button").split(","));
    let stopAt = ds.stop || "none";
    let delegate = ds.delegate === "true";
    root.textContent = "";
    const stage = h("div", { class: "ev-stage", "data-no-nav": "" });
    stage.innerHTML = `<section class="ev-box" data-l="section"><b>section#vendors</b>
      <ul class="ev-box" data-l="ul"><b>ul.vendor-list</b>
        <li class="ev-box" data-l="li" data-name="Dumpling Dynasty"><b>li.stall</b><span>🥟 Dumpling Dynasty</span><button type="button" data-l="button" class="ev-btn">♡ save</button></li>
        <li class="ev-box" data-l="li" data-name="Side B Records"><b>li.stall</b><span>🎸 Side B Records</span><button type="button" data-l="button" class="ev-btn">♡ save</button></li>
      </ul></section>`;
    const log = h("ol", { class: "ev-log", "aria-live": "polite" });
    const codeEl = h("pre", { class: "code ev-code" });
    const listenRow = chipGroup("listeners on", LEVELS.map((l) => l.key), () => null, (v) => { on.has(v) ? on.delete(v) : on.add(v); if (!on.has(stopAt)) stopAt = "none"; sync(); }, "multi");
    const stopRow = chipGroup("stopPropagation() in", ["none", ...LEVELS.map((l) => l.key)], () => stopAt, (v) => { stopAt = v; if (v !== "none") on.add(v); sync(); });
    const delRow = chipGroup("event.target.closest(\"li\")", ["off", "on"], () => (delegate ? "on" : "off"), (v) => { delegate = v === "on"; sync(); });
    const controls = h("div", { class: "lab-controls" }, listenRow, stopRow, delRow, codeEl);
    root.append(controls, h("div", { class: "ev-right" }, stage, log));

    function sync() {
      listenRow.querySelectorAll(".chip-btn").forEach((b) => b.setAttribute("aria-pressed", String(on.has(b.textContent))));
      stopRow.sync(); delRow.sync();
      stage.querySelectorAll("[data-l]").forEach((el) => el.classList.toggle("listening", on.has(el.dataset.l)));
      const L = [];
      LEVELS.forEach((l) => {
        if (!on.has(l.key)) return;
        const many = l.key === "li" || l.key === "button";
        const name = { section: "section", ul: "list", li: "stall", button: "button" }[l.key];
        const body = [`  console.log(event.currentTarget, event.target);`];
        if (delegate && (l.key === "ul" || l.key === "section")) body.push(`  const stall = event.target.closest("li");`, `  if (stall) console.log("save", stall.dataset.name);`);
        if (stopAt === l.key) body.push(`  event.stopPropagation(); // stop here`);
        if (many) L.push(`for (const ${name} of ${name}s) {`, `  ${name}.addEventListener("click", (event) => {`, ...body.map((b) => "  " + b), "  });", "}");
        else L.push(`${name}.addEventListener("click", (event) => {`, ...body, "});");
      });
      codeEl.innerHTML = L.length ? hlJS(L.join("\n")) : hlJS("// no listeners: the click happens,\n// but nobody hears it");
    }
    let animating = [];
    stage.addEventListener("click", (e) => {
      const target = e.target.closest("[data-l]");
      if (!target) return;
      // walk the real bubbling path from the target up to the section
      const path = [];
      for (let el = target; el && stage.contains(el); el = el.parentElement) if (el.dataset && el.dataset.l) path.push(el);
      animating.forEach(clearTimeout);
      animating = [];
      stage.querySelectorAll(".heard, .is-target, .stopped").forEach((el) => el.classList.remove("heard", "is-target", "stopped"));
      log.textContent = "";
      target.classList.add("is-target");
      const lab = (el) => LEVELS.find((l) => l.key === el.dataset.l).label;
      log.append(h("li", { class: "ev-l-target", html: `click on <b>${esc(lab(target))}</b> → <code>event.target</code>` }));
      let k = 0, stopped = false;
      for (const el of path) {
        const lvl = el.dataset.l;
        if (stopped) break;
        k++;
        const delay = k * 420;
        if (on.has(lvl)) {
          animating.push(setTimeout(() => {
            el.classList.add("heard");
            let msg = `<b>${esc(lab(el))}</b> hears it · currentTarget: <code>${esc(lab(el))}</code> · target: <code>${esc(lab(target))}</code>`;
            if (delegate && (lvl === "ul" || lvl === "section")) {
              const li = target.closest("li");
              msg += li ? ` · closest("li") → <b>${esc(li.dataset.name)}</b>` : ` · closest("li") → <b>null</b>`;
            }
            log.append(h("li", { class: "ev-l-heard", html: msg }));
          }, delay));
        } else {
          animating.push(setTimeout(() => { log.append(h("li", { class: "ev-l-pass", html: `${esc(lab(el))}: no listener, the event bubbles on` })); }, delay));
        }
        if (stopAt === lvl && on.has(lvl)) {
          stopped = true;
          animating.push(setTimeout(() => { el.classList.add("stopped"); log.append(h("li", { class: "ev-l-stop", html: `✋ stopPropagation(): nobody above <b>${esc(lab(el))}</b> hears it` })); }, delay + 200));
        }
      }
    });
    sync();
  }

  /* ------------------------------------------------------------------------
     Event monitor — which events fire while you use a form, in which order
     ------------------------------------------------------------------------ */
  function EventMonitor(root) {
    const TYPES = ["focus", "blur", "keydown", "input", "change", "click", "submit"];
    const active = new Set((root.dataset.types || "focus,blur,keydown,input,change,click,submit").split(","));
    root.textContent = "";
    const form = h("form", { class: "em-form", novalidate: true, "data-no-nav": "" });
    form.innerHTML = `<label>Name <input name="name" autocomplete="off"></label>
      <label>Arriving <select name="arrival"><option>Early</option><option>Late</option></select></label>
      <label class="em-check"><input type="checkbox" name="news"> News</label>
      <button type="submit">Reserve</button>`;
    const log = h("ol", { class: "em-log", "aria-live": "polite" });
    const chips = h("div", { class: "lab-chips" });
    TYPES.forEach((t) => {
      const b = h("button", { class: "chip-btn", type: "button", text: t, "aria-pressed": String(active.has(t)) });
      b.onclick = () => { active.has(t) ? active.delete(t) : active.add(t); b.setAttribute("aria-pressed", String(active.has(t))); };
      chips.append(b);
    });
    const clearBtn = h("button", { class: "live-btn", type: "button", text: "clear" });
    root.append(h("div", { class: "em-left" }, form, h("div", { class: "lab-group" }, h("span", { class: "lab-label", text: "show" }), chips)),
      h("div", { class: "em-right" }, h("div", { class: "js-console-bar" }, h("span", { text: "form.addEventListener(type, …)" }), h("span", { class: "spacer" }), clearBtn), log));
    clearBtn.onclick = () => { log.textContent = ""; };
    const name = (el) => (el === form ? "form" : el.name ? `${el.localName}[name=${el.name}]` : el.localName);
    let n = 0;
    TYPES.forEach((t) => form.addEventListener(t, (e) => {
      if (t === "submit") e.preventDefault();
      if (!active.has(t)) return;
      const el = e.target;
      let detail = "";
      if (t === "keydown") detail = `key: "${e.key}"`;
      else if (t === "input" || t === "change") detail = el.type === "checkbox" ? `checked: ${el.checked}` : `value: "${el.value}"`;
      else if (t === "submit") detail = "preventDefault() → no reload";
      log.append(h("li", { class: "em-" + t, html: `<span>${++n}</span><b>${t}</b><code>${esc(name(el))}</code><i>${esc(detail)}</i>` }));
      log.scrollTop = log.scrollHeight;
    }, true)); // capture: focus and blur don't bubble, but they do pass down through the form
    form.addEventListener("keydown", (e) => e.stopPropagation());
  }

  /* ------------------------------------------------------------------------
     Fluid type calculator — clamp() from two points, with a zoom test
     ------------------------------------------------------------------------ */
  function FluidCalc(root) {
    const ds = root.dataset;
    const st = { minFs: +(ds.minFs || 1.75), maxFs: +(ds.maxFs || 3.5), minVw: +(ds.minVw || 360), maxVw: +(ds.maxVw || 1280), vw: +(ds.vw || 800), mode: "fluid" };
    root.textContent = "";
    const num = (key, label, step, unit) => {
      const inp = h("input", { type: "text", inputmode: "decimal", value: st[key], "aria-label": label + " (" + unit + ")" });
      inp.addEventListener("input", () => { const v = +inp.value.replace(",", "."); if (inp.value.trim() !== "" && !isNaN(v)) { st[key] = v; paint(); } });
      inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") inp.blur(); });
      return h("label", { class: "fc-num" }, h("span", { text: label }), inp, h("small", { text: unit }));
    };
    const range = h("input", { type: "range", min: 320, max: 1600, value: st.vw, "aria-label": "Window width" });
    const vwOut = h("output");
    range.addEventListener("input", () => { st.vw = +range.value; paint(); });
    range.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") range.blur(); });
    const modeRow = chipGroup("preferred value", ["fluid", "vw only"], () => st.mode, (v) => { st.mode = v; paint(); });
    const code = h("pre", { class: "code fc-code" });
    const copy = h("button", { class: "live-btn", type: "button", text: "copy" });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "fc-graph");
    svg.setAttribute("viewBox", "0 0 640 300");
    svg.setAttribute("role", "img");
    const sample = h("div", { class: "fc-sample", text: ds.text || "Harbour Night Market" });
    const zoomOut = h("div", { class: "fc-zoom" });
    root.append(
      h("div", { class: "fc-controls" },
        h("div", { class: "fc-row" }, num("minFs", "smallest", 0.05, "rem"), num("minVw", "at a window of", 10, "px")),
        h("div", { class: "fc-row" }, num("maxFs", "largest", 0.05, "rem"), num("maxVw", "at a window of", 10, "px")),
        modeRow,
        h("div", { class: "fc-codewrap" }, code, copy),
        zoomOut),
      h("div", { class: "fc-right" }, svg, h("label", { class: "fc-range" }, h("span", { text: "window width ⟷" }), range, vwOut), sample));
    copy.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(code.textContent); copy.textContent = "copied ✓"; setTimeout(() => { copy.textContent = "copy"; }, 1200); };

    const r2 = (x) => Math.round(x * 1000) / 1000;
    function formula() {
      const slope = (st.maxFs - st.minFs) * 16 / (st.maxVw - st.minVw); // px per px
      const icpt = st.minFs * 16 - slope * st.minVw; // px
      const vwCoef = slope * 100;
      if (st.mode === "vw only") {
        // the naive version: no clamp, no rem. Right size at the small window, then it just keeps going
        const v = r2((st.minFs * 16 / st.minVw) * 100);
        return { css: `${v}vw`, at: (vw) => v * vw / 100 };
      }
      return {
        css: `clamp(${st.minFs}rem, ${r2(icpt / 16)}rem + ${r2(vwCoef)}vw, ${st.maxFs}rem)`,
        at: (vw, root = 16) => Math.min(st.maxFs * root, Math.max(st.minFs * root, (icpt / 16) * root + vwCoef * vw / 100)),
      };
    }
    function paint() {
      modeRow.sync();
      const f = formula();
      code.innerHTML = hlCSS(`h1 {\n  font-size: ${f.css};\n}`);
      const px = f.at(st.vw);
      vwOut.textContent = `${st.vw}px → ${px.toFixed(1)}px`;
      sample.style.fontSize = px + "px";
      // graph
      const X = (vw) => 50 + ((vw - 320) / (1600 - 320)) * 570;
      const maxY = Math.max(st.maxFs * 16 * 1.15, 40);
      const Y = (p) => 270 - (p / maxY) * 250;
      let d = "";
      for (let vw = 320; vw <= 1600; vw += 10) d += (d ? " L" : "M") + X(vw).toFixed(1) + " " + Y(f.at(vw)).toFixed(1);
      const ticks = [320, 640, 960, 1280, 1600].map((v) => `<line x1="${X(v)}" x2="${X(v)}" y1="20" y2="270" class="fc-grid"/><text x="${X(v)}" y="290" text-anchor="middle">${v}</text>`).join("");
      const yt = [0, 0.5, 1].map((k) => { const p = Math.round(maxY * k); return `<text x="44" y="${Y(p) + 5}" text-anchor="end">${p}</text>`; }).join("");
      svg.innerHTML = `${ticks}${yt}
        <rect x="${X(st.minVw)}" y="20" width="${Math.max(0, X(st.maxVw) - X(st.minVw))}" height="250" class="fc-band"/>
        <path d="${d}" class="fc-line"/>
        <line x1="${X(st.vw)}" x2="${X(st.vw)}" y1="20" y2="270" class="fc-now"/>
        <circle cx="${X(st.vw)}" cy="${Y(px)}" r="7" class="fc-dot"/>
        <text x="620" y="16" text-anchor="end" class="fc-axis">font-size (px) against window width (px)</text>`;
      svg.setAttribute("aria-label", `Font size grows from ${st.minFs * 16}px at ${st.minVw}px to ${st.maxFs * 16}px at ${st.maxVw}px`);
      // Zoom test. Zoom z makes the window z times narrower in CSS px and draws every CSS px z times bigger.
      // WCAG 1.4.4: text must be able to reach 200%. Browsers zoom up to 500%: is there a zoom that doubles it?
      const phys = st.vw;
      const grow = (z) => (z * f.at(phys / z)) / f.at(phys);
      const k200 = grow(2);
      let reach = null;
      for (let z = 1; z <= 5.001; z += 0.05) if (grow(z) >= 1.999) { reach = Math.round(z * 100); break; }
      zoomOut.className = "fc-zoom " + (k200 >= 1.999 ? "ok" : reach ? "meh" : "bad");
      zoomOut.innerHTML = `<b>Zoom test</b> at a ${phys}px window: 200% zoom makes the text <b>×${k200.toFixed(2)}</b>. ` +
        (k200 >= 1.999 ? "✓ It doubles, like fixed text would." :
         reach ? `It doubles at <b>${reach}%</b> zoom: ✓ within the browser's 500%, but people have to zoom further.` :
         "✗ It never doubles, even at 500% zoom: fails WCAG 1.4.4 (resize text to 200%).") +
        ` <span class="fc-rule">Rule of thumb: largest ≤ 2.5 × smallest (yours: ${(st.maxFs / st.minFs).toFixed(2)}×).</span>`;
    }
    paint();
  }


  /* ------------------------------------------------------------------------
     Task draw — deal N tasks to N groups, at random, on the projector
     ------------------------------------------------------------------------ */
  function TaskDraw(root) {
    const tasks = (root.dataset.tasks || "").split("|").map((t) => t.trim()).filter(Boolean);
    root.textContent = "";
    const list = h("ol", { class: "td-list", "aria-live": "polite" });
    const btn = h("button", { class: "td-btn", type: "button", text: "🎲 Deal the tasks" });
    root.append(list, btn);
    const show = (order) => {
      list.textContent = "";
      order.forEach((t, i) => list.append(h("li", {}, h("b", { text: "Group " + (i + 1) }), h("span", { text: t }))));
    };
    btn.addEventListener("click", () => {
      let k = 0;
      const spin = setInterval(() => {
        const order = [...tasks];
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
        show(order);
        if (++k > 10) clearInterval(spin);
      }, 70);
    });
    show(tasks);
  }

  /* ------------------------------------------------------------------------
     init
     ------------------------------------------------------------------------ */
  const REGISTRY = [
    [".live", LiveEditor],
    [".spec-calc", SpecCalc],
    [".spec-duel", SpecDuel],
    [".sel-tester", SelTester],
    [".nth-play", NthPlay],
    [".color-lab", ColorLab],
    [".contrast-pair", ContrastPair],
    [".box-lab", BoxLab],
    [".flex-lab", FlexLab],
    [".pos-lab", PositionLab],
    [".units-lab", UnitsLab],
    [".live-js", JSLive],
    [".dom-lab", DomLab],
    [".event-lab", EventLab],
    [".event-monitor", EventMonitor],
    [".fluid-calc", FluidCalc],
    [".task-draw", TaskDraw],
    ["button.timer", Timer],
  ];
  Kit.init = function (root) {
    root = root || document;
    upgradeCode(root);
    for (const [sel, fn] of REGISTRY) {
      root.querySelectorAll(sel).forEach((el) => {
        if (el.dataset.kitReady) return;
        el.dataset.kitReady = "1";
        try { fn(el); } catch (e) { console.error("Kit component failed", sel, e); }
      });
    }
  };

  // Inside an iframe on a slide: hand arrow keys to the deck.
  if (window.parent !== window) {
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
      if (["ArrowRight", "ArrowLeft", "PageUp", "PageDown"].includes(e.key)) window.parent.postMessage({ deckKey: e.key }, "*");
    });
  }

  if (!document.querySelector(".deck")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => Kit.init());
    else Kit.init();
  }
})();
