# Lecture 12 · "Inside the browser" · plan

Teacher-facing structure. Not student-facing. No deck yet.

How the engine turns bytes into pixels, and how it keeps one site's code
away from another's. Two topics, one model of the browser: processes and
threads, then the rendering pipeline in depth, then the security boundaries
built on the same processes.

**Assumes:** Lecture 8 (HTTP, origins, CORS, the event loop), Lecture 9 (the
frame pipeline, the Performance panel, layout thrashing), Lecture 10
(supply-chain risk, `integrity`), the Meridian CTF (the client holds no
secrets), the animation guest class (`transform` / `opacity`).

**Overlap with Lecture 9:** L9 named the five frame stages and measured
them. This class opens each stage: what the data structure is, what
invalidates it, which thread runs it. Don't repeat L9's Performance-panel
tutorial; use it.

**Running examples:** a news article page (rendering), a recipe site with
comments and a share-by-link search (security). No market.

## The story in one paragraph

A browser is several processes: one for the UI and the network, one per site
for rendering and JavaScript, one for the GPU. Inside a renderer, the main
thread parses HTML into the DOM, CSS into style rules, computes styles,
builds a layout tree, and records paint operations. A compositor thread then
assembles layers into frames, and keeps scrolling and `transform` animations
running even when the main thread is busy. Every loading and jank problem is
one of these stages waiting on another. The same process split is the
security model: a site's code runs in a sandboxed process, the same-origin
policy decides what it may read, and almost every frontend attack (XSS,
clickjacking, CSRF, a hostile frame) is a way to run code or act with
another origin's rights. The defences are browser features the page opts
into: CSP, cookie attributes, `frame-ancestors`, `sandbox`.

## Timing · 3 hours

| Min | Block |
| --- | --- |
| 5 | Opening |
| 10 | Act 1 · Processes and threads |
| 45 | Act 2 · From bytes to pixels |
| 20 | Ex 1 · Five broken pages |
| 15 | Break |
| 45 | Act 3 · Origins and attacks |
| 35 | Ex 2 · Break it, then fix it (CTF) |
| 5 | Close |

## Opening · 5 min

- **Hook:** a page with a busy `while` loop for 3 seconds. One box animated
  with `left`, one with `transform`. Click: the first freezes, the second
  keeps moving, and the page still scrolls. Same JavaScript thread, so what
  else is drawing?
- **Thesis:** the browser is a set of processes and threads. Knowing which
  one does what explains both speed and security.

## Act 1 · Processes and threads · 10 min

1. **One browser, many processes** · browser process (UI, network, storage),
   renderer processes, GPU process, utility processes. Chrome's Task
   Manager shows them live.
2. **One renderer per site** · site isolation, introduced after Spectre
   (2018): a cross-site iframe runs in another process. A crashed tab
   doesn't take the others down.
3. **Inside a renderer** · main thread (DOM, CSS, JS, layout, paint
   recording), compositor thread, raster threads, workers (Lecture 9).
4. **Sandboxed** · the renderer can't open files or sockets itself; it asks
   the browser process over IPC. That's why a page needs permission prompts
   (Lecture 11) and can't read your disk.

## Act 2 · From bytes to pixels · 45 min

### Loading

5. **Navigation** · DNS, TCP, TLS, the response streams into the renderer.
   Parsing starts before the last byte arrives.
6. **The HTML parser** · tokenizer → tree builder. It never throws: error
   recovery is in the spec (Lecture 1's broken HTML, explained).
7. **Scripts stop the parser** · classic `<script>` blocks parsing until
   fetched and run; `defer` runs after parsing, in order; `async` whenever it
   arrives; module scripts defer by default. Timeline diagram.
8. **The preload scanner** · a second, speculative parser finds `<img>`,
   `<link>` and `<script>` URLs ahead of the blocked one. Why URLs built in
   JavaScript load late.
9. **CSS blocks rendering** · no first paint until the stylesheets in
   `<head>` arrive; a script waits for the stylesheets before it.
   `media` on `<link>` makes a stylesheet non-blocking.
10. **Priorities** · `fetchpriority`, `<link rel="preload">`,
    `loading="lazy"`; the Network panel's Priority column.

### Style and layout

11. **Style** · selectors matched right to left; the cascade resolves every
    property of every element into a computed style. Invalidation: a class
    change re-styles a subtree, not the page.
12. **The layout tree is not the DOM** · `display: none` is absent,
    `::before` is present, anonymous boxes appear. `visibility: hidden` vs
    `display: none` vs `content-visibility: hidden`.
13. **Formatting contexts** · block, inline, flex, grid, each with its own
    algorithm; a new block formatting context contains floats and margins
    (Lecture 3's margin leak, explained).
14. **Containment** · `contain: layout paint size`, `container-type`: tell
    the engine a subtree's changes stay inside it.

### Paint and composite

15. **Paint is a recording** · a list of draw operations, not pixels yet.
16. **Paint order** · background, negative `z-index`, blocks, floats,
    inline content, positioned elements: per stacking context.
17. **Stacking contexts** · created by `position` + `z-index`, `opacity < 1`,
    `transform`, `filter`, `isolation: isolate`, `will-change`. Quiz:
    `z-index: 9999` that stays behind.
18. **Layers** · some stacking contexts get their own layer; the compositor
    moves layers without repainting them. DevTools Layers panel. Too many
    layers costs GPU memory.
19. **Raster** · the recording becomes pixels in tiles, on raster threads
    and the GPU. Image decoding: `decoding="async"`, `img.decode()`.
20. **The compositor thread** · scrolling, `transform` and `opacity`
    animations run here. The hook demo, explained.
21. **Trap: a listener that blocks scrolling** · a non-passive `wheel` /
    `touchstart` listener makes the compositor wait for the main thread.
    `{ passive: true }`.
22. **DevTools Rendering tab** · paint flashing, layout shift regions, layer
    borders, frame rendering stats.

### What users feel

23. **Core Web Vitals** · LCP (≤ 2.5 s), INP (≤ 200 ms), CLS (≤ 0.1). Which
    stage each one measures.
24. **Layout shift** · images without `width` / `height`, late fonts, content
    injected above the reader. `aspect-ratio`, `font-display`,
    `size-adjust`, reserved space.
25. **Fonts** · invisible vs fallback text while loading (FOIT / FOUT),
    `font-display: swap | optional`.
26. **Symptom → stage** · table: blank screen → blocking resources; content
    jumps → layout; animation stutters → main thread / paint; scroll janks
    → non-passive listener or layers.

### Ex 1 · Five broken pages · 20 min

One news article page, five copies, one problem each. For each: name the
stage, show the evidence in DevTools (Network, Performance, Rendering tab),
fix it with one change, record again.

1. a `<script>` in `<head>` delays the first paint by 2 s
2. the hero image is discovered late (URL set from JavaScript)
3. the article jumps three times while loading (image without dimensions,
   web font, injected banner)
4. a "sticky" share bar animated with `top` stutters while the page is busy
5. a dropdown with `z-index: 1000` stays under the header (cause: a
   `transform` on an ancestor, so the `opacity` quiz doesn't give it away)

Pages 1–3 are the core; 4 and 5 are stretch.

Material to build: `exercises/01-broken-pages/` (five pages + an artificial
slow server option or DevTools throttling notes), solutions in `private/`.

## Act 3 · Origins and attacks · 45 min

27. **The threat model of a page** · the browser runs code from many
    origins side by side. The same-origin policy (Lecture 8) is the main
    boundary. The client holds no secrets (Meridian).
28. **XSS: running code as another origin** · if an attacker's script runs
    on your origin, the SOP protects it, not you: it reads the DOM, cookies
    without `HttpOnly`, `localStorage`, and calls your API with the user's
    session.
29. **Three kinds** · stored (a comment), reflected (a URL parameter echoed
    by the server), DOM-based (`location.hash` into `innerHTML`).
30. **Sources and sinks** · sources: URL, `postMessage` data, API responses,
    `localStorage`. Sinks: `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
    `document.write`, `href="javascript:…"`, `eval`, `new Function`,
    `setTimeout(string)`, `srcdoc`.
31. **Quiz: does it run?** · `innerHTML = '<script>…</script>'` (no) vs
    `'<img src=x onerror=…>'` (yes).
32. **Defence 1: don't parse** · `textContent`, `createElement`,
    `<template>` + `cloneNode` (Lecture 5's render already did this).
33. **Defence 2: sanitise** · `Element.setHTML()` (Sanitizer API, check
    support), DOMPurify from a CDN (Lecture 10's import map). Escaping
    depends on context: HTML text, attribute, URL, JavaScript.
34. **Defence 3: Trusted Types** · sinks accept only typed values; the
    browser enforces it via CSP.
35. **Content Security Policy** · a response header listing where scripts,
    styles, images and connections may come from. `script-src 'self'`,
    nonces, `'strict-dynamic'`; inline handlers blocked. `<meta>` vs
    header: static hosting can only use `<meta>`, which can't set
    `frame-ancestors`. Report-only mode for rollout.
36. **Cookies** · `HttpOnly`, `Secure`, `SameSite` (`Lax` default),
    the `__Host-` prefix. Tokens in `localStorage` are readable by any XSS.
37. **CSRF** · another site makes the user's browser send a request with
    their cookies. `SameSite`, `Sec-Fetch-Site`, tokens.
38. **Clickjacking** · your page in an invisible iframe under the
    attacker's button. `frame-ancestors 'none'` (or `X-Frame-Options`).
39. **Frames you embed** · `sandbox` and its tokens, `allow` (Permissions
    Policy, Lecture 11), `referrerpolicy`.
40. **`postMessage`** · always check `event.origin`, never send to `'*'`
    when the data matters.
41. **Opener** · `target="_blank"` implies `noopener` today; `window.opener`
    and why it was a problem.
42. **Checklist** · no HTML sinks with untrusted data, CSP, cookie
    attributes, `frame-ancestors`, `origin` checks, pinned and integrity-
    checked dependencies (Lecture 10).

### Ex 2 · Break it, then fix it · 35 min

A recipe site, served locally: comments, a search that echoes the query, a
share-by-link feature that reads `location.hash`, an embeddable "print
recipe" widget talking over `postMessage`, a fake session cookie and a token
in `localStorage`. Flags, Meridian-style, scored on the board:

1. stored XSS: a comment that runs code for every visitor
2. DOM XSS through the share link
3. read the `localStorage` token through your XSS (and why the cookie with
   `HttpOnly` stays out of reach)
4. make the widget act on a message from another origin
5. frame the "delete account" page under a decoy button

Then fix: each flag gets a one-change fix, and a CSP `<meta>` that would have
blocked flags 1–3 even without the fix.

Rule stated on the brief: only against the course page on `localhost`.

Material to build: `exercises/02-recipe-site/` (vulnerable site, flag board
using the race/desk Firebase pattern or a local list), fixed version in
`private/`.

## Close · 5 min

- **Three questions:** which stage is the user waiting on? Which thread runs
  it? Whose code runs on this origin, and what can it read?
- **Homework (optional):** run the Rendering tab and a CSP in report-only
  mode on a page you built earlier in the course; list what they flag.

## Materials to build

- `slides.html` (~45 slides)
- `demos/compositor.html` (the hook: `left` vs `transform` under a busy
  main thread), `demos/parser.html` (blocking vs `defer` / `async`,
  timeline), `demos/stacking.html` (the `z-index` quiz)
- `exercises/01-broken-pages/`, `exercises/02-recipe-site/` + flag board
- `private/` — fixes for both exercises
- `index.html` lesson notes, cheatsheet, run sheet

## Traps to plan for

- Rendering details differ between engines (Blink, WebKit, Gecko). Teach
  the shared model, label Chromium specifics, demo in Chrome.
- Artificial slowness needs a reliable source: DevTools throttling or a
  tiny local server with a delay route (Lecture 8's local server pattern).
- `setHTML` and Trusted Types support moves fast; check before the class
  and put the date on the slide.
- CTF on a shared network: everything runs on each student's `localhost`, no
  shared target.

## Open questions

- Too dense for 3 hours? Cut order if needed: Act 2's fonts and raster
  slides (19, 25), then Act 3's opener and CSRF slides (37, 41).
- Flag board: reuse the Meridian desk (Firebase) or keep it offline?
