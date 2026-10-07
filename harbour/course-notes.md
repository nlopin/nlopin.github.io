# Programming Interactivity · planning notes

Working notes for the lectures after Lecture 4. Not student-facing.

## Where the course stands

15 classes, 3 weeks, Mon–Fri 17:00 (from Lecture 1's week plan):

- **Week 1 · web basics** — L1 HTML semantics, L2 focus and forms, L2 CSS
  fundamentals, L3 layout, L4 responsive + the first JS (DOM, events, forms).
- **Week 2 · JS and Web APIs**
- **Week 3 · data fetching, final project**

## Basics nobody has taught yet

Checked against all decks so far.

**JavaScript**

- The language itself: arrays, objects, `map` / `filter` / `find`,
  destructuring, spread. Students only had L4's crib slide.
- Data → DOM: rendering a list from an array (`render()`, `<template>`).
  Today the stalls are hard-coded HTML and JS patches them in place, which is
  why the jam's "the filter can't see the new stall" bug exists.
- State: one source of truth, the UI derived from it. Filter, search and
  saved are three scripts each flipping `hidden`.
- Modules: `import` / `export`, `type="module"`. The jam's "already
  declared" trap is a symptom.
- Async: timers, promises, `async` / `await`, the event loop. Week 3's
  `fetch` needs it.
- The DevTools debugger: breakpoints, stepping, the Sources panel. Only
  `console.log` so far.
- JSON and `localStorage`: only on L4's jam toolbox slide.

**HTML / CSS**

- Images and media: `object-fit`, `aspect-ratio`, `srcset` / `<picture>`,
  `loading="lazy"`.
- Motion: `transition`, `@keyframes`, transforms as motion,
  `prefers-reduced-motion` in practice.
- `<dialog>` and `popover`: mentioned, never taught.
- Deploy: Git basics, GitHub Pages. The final project needs a public URL.

## Lecture 5 proposal · "Data in, page out"

The page becomes a view of the data. Reuses the market.

| Act | Content | Practice |
| --- | --- | --- |
| 1 · The market as data | `const stalls = [{ name, tag, soldOut }]`, objects, arrays, `map` / `filter` / `find`, destructuring | console kata: answer questions about the market with array methods |
| 2 · Render | `render(stalls)` with `<template>` + `cloneNode`, `replaceChildren`; delete the hard-coded HTML | the vendor list built from the array |
| 3 · State | `state = { filter, query, saved }`; every event changes state, then calls `render()`; derived values | filter + search + ♡ in one script, no `hidden` fights |
| 4 · Remember | JSON, `localStorage`, loading state on startup | saved stalls survive a reload |
| 5 · Split it up | modules: `data.js`, `render.js`, `main.js` | the name clash disappears |
| 6 · Debugger | a breakpoint inside `render`, watching the state | find-the-bug exercise |

Cliffhanger for week 3: "the array is hard-coded. What if it came from a
server?" `fetch` then replaces one line.

If the next class is still Friday of week 1, swap: **Motion + media +
`<dialog>`** on Friday (closes the CSS track, light JS), "Data in, page out"
on Monday.

## Rest of week 2 (one possible order)

- **Async**: timers, promises, `async` / `await`, the event loop, a first
  `fetch` of a local JSON file. Bridge to week 3.
- **Web APIs**: the jam below.
- **Game jam**: the second jam below, right after Lecture 5 or as the
  practice half of the Async class (Snake and Memory need timers).
- **Motion + media**: transitions and keyframes driven by JS state classes,
  images done right. Polish for the final project.
- **Deploy + project kickoff**: Git, GitHub Pages, project pitches.

## Web API jam

Standalone toys, not the market site. One API (or two) per group, built
from an empty `index.html` + `style.css` + `script.js`. Every task is still
find · listen · change, plus one new idea: a permission prompt, a game loop
(`requestAnimationFrame`), a stream (camera, microphone) or a channel between
windows. Closing line: the browser is a platform for sensors, not just
documents.

### Format · 45 minutes

| Minutes | Phase |
| --- | --- |
| 0–5 | Plan: read the brief, agree on the approach, sketch the screen |
| 5–15 | **The API works**: permission granted, raw data on screen (numbers, a stream, events). Ugly is fine |
| 15–35 | Build the toy: turn the raw data into the experience |
| 35–42 | Verify: reload, deny the permission (the fallback), another browser |
| 42–45 | Rehearse the demo |

Minute 15 is the checkpoint: that's when you see who is stuck on permissions
or HTTPS. Show & tell: 6 groups × 3 min ≈ 20 min, so the whole block is
about 70 minutes.

Briefs in the lean L4 jam format: "done means" as outcomes, hints and traps
folded, an MDN link to the API instead of code.

### The class set (laptop-only, low setup risk)

| Group | Task | APIs | Done means |
| --- | --- | --- | --- |
| 1 | **Theremin + visualiser** ★☆☆ | Web Audio, Pointer Events, canvas | the pointer plays (X pitch, Y volume); a live waveform is drawn; a waveform picker |
| 2 | **Colour thief** ★★☆ | EyeDropper, Clipboard, localStorage | pick colours into a palette, click to copy a hex, export as CSS variables; the palette survives a reload |
| 3 | **Photo booth** ★★☆ | getUserMedia, canvas, download | countdown, flash, a strip of 4 shots, one filter, PNG download |
| 4 | **Talk to the page** ★★☆ | SpeechRecognition, SpeechSynthesis | 5 voice commands change the page; it answers out loud; shows what it heard |
| 5 | **Gamepad racer** ★★★ | Gamepad, rAF, keyboard fallback | a car steered by the stick, speed on the trigger, walls, a lap timer |
| 6 | **Two-window pong** ★★★ | BroadcastChannel, rAF | the ball crosses between two windows; score on both sides |

Spares: **Clap switch** (microphone + `AnalyserNode`) ★★☆, **Drum machine**
(Web Audio + a 16-step sequencer) ★★☆. No gamepads in class → Clap switch
replaces group 5.

### The full idea pool

**Sound**

- *Theremin* · Web Audio + Pointer Events: X = pitch, Y = volume. Stretch:
  waveform picker, canvas trail.
- *Clap switch* · microphone + `AnalyserNode`: a dark room, two claps turn
  the light on, a volume meter. Stretch: whistle detection from frequency data.
- *Drum machine* · Web Audio + keyboard: 4×4 pads, 16-step sequencer, BPM
  slider. Stretch: the pattern as JSON in the URL, shareable.

**Voice**

- *Talk to the page* · SpeechRecognition + SpeechSynthesis: "red background",
  "bigger text", "read the headline". Stretch: it answers, spoken history.
- *Speaking coach* · SpeechRecognition: a sentence lights up word by word as
  you say it. Stretch: score, words per minute.

**Camera**

- *Photo booth* · `getUserMedia` + canvas: filters, countdown, flash, strip
  of 4, download. Stretch: pixel effects (posterize, ASCII camera).
- *Motion alarm* · camera + canvas pixel diff: alarms when something moves.
  Stretch: heat map of motion. ★★★

**Body and devices**

- *Gamepad playground / racer* · Gamepad + rAF: sticks, buttons, triggers
  visualised, then a car to drive. Stretch: `vibrationActuator` on a crash.
- *Tilt maze* · DeviceOrientation: tilt the phone, roll the ball. ★★★
- *Spirit level* · DeviceOrientation: a bubble level on the phone. ★☆☆

**Screen and system**

- *Two-window pong* · BroadcastChannel + rAF. Stretch: use `window.screenX`
  so the ball crosses where the windows really sit.
- *Focus timer* · Notifications + Page Visibility + Wake Lock: a Pomodoro
  that notifies, counts tab switches, keeps the screen on.
- *Colour thief* · EyeDropper + Clipboard.
- *Drop zone* · File API + drag & drop: drop images, get a gallery with
  sizes and dimensions, nothing uploaded. Stretch: drop a `.txt`, word count.
- *Scrollytelling* · IntersectionObserver: scrolling changes the background,
  counters count, images reveal.
- Small add-ons: View Transitions (animated re-layout), Web Animations
  (`el.animate`, confetti), Fullscreen, Web Share, Screen Wake Lock.

**Hardware, if the programme has it**

- *Physical knob* · Web Serial + Arduino: a potentiometer moves a slider.
  Chrome only.
- *MIDI piano* · Web MIDI: a MIDI keyboard lights up a CSS piano.

### Traps to plan for

- **Secure context**: camera, microphone and motion sensors need `localhost`
  or HTTPS. Laptops on live-server are fine. A phone on
  `http://192.168…` gets nothing: deploy to Pages, or use DevTools → Sensors.
- **iOS motion** needs `DeviceOrientationEvent.requestPermission()` from a
  click.
- **Autoplay policy**: Web Audio starts only after a user gesture
  (`audioContext.resume()` in a click).
- **Gamepad** isn't reported until a button is pressed; buttons are polled
  in the rAF loop, not events; mappings vary. Count the controllers first.
- **SpeechRecognition**: Chrome and Safari only; Chrome sends the audio to
  Google, so it needs internet.
- **EyeDropper**: Chrome / Edge only.
- **Vibration**: Android only.
- **Notifications**: OS focus modes swallow them; flaky in a classroom.
- Every group should handle "Block" on the permission prompt: a good moment
  to talk about fallbacks.

## Game jam · `page = render(state)`

Standalone games, not the market. One small game per group, built from an
empty `index.html` + `style.css` + `script.js`. The point is Lecture 5's loop
on something new: the whole game lives in one `state` object, every event
goes listen · change the state · redraw, and the DOM is output only. No game
logic reads the page (`cell.textContent === 'X'` is the L4 habit to break).
Closing line: a game is a state, rules and a render. So was the market.

Needs Lecture 5 (objects, arrays, `map` / `filter`, `render()`, `state`,
`localStorage`). Not taught yet and needed here: 2D grids (`grid[r][c]`) and
timers (`setTimeout` / `setInterval`). One hint line each in the briefs is
enough; if Async comes first, timers are covered.

Every brief shows the same shape and nothing more:

```js
const state = { /* everything the game needs to know */ };

function render() { /* draw the whole board from state */ }

board.addEventListener('click', (event) => {
  // find which cell, change state, then:
  render();
});

render();
```

### Format · 45 minutes

| Minutes | Phase |
| --- | --- |
| 0–5 | Plan: write the state shape on paper. What is stored, what is derived? |
| 5–15 | **Render works**: a hard-coded state draws the board. No clicks yet |
| 15–35 | Rules: events change the state, render redraws. Win / lose last |
| 35–42 | Verify: the edge cases in the brief, a reload, a restart mid-game |
| 42–45 | Rehearse the demo |

Minute 15 is the checkpoint: change the state in the console, call
`render()`, the board follows. A group that can't do that is patching the
DOM. Show & tell: each group opens DevTools, shows `state` first, then plays.
6 groups × 3 min ≈ 20 min, so the whole block is about 70 minutes.

Briefs in the lean L4 jam format: "done means" as outcomes, edge cases to
test, hints and traps folded. Written: `programming-interactivity-5-data/game-jam/`
(index + 6 briefs + 2 spares), starter in `project/game-jam/` (+ zip).
Hints are questions only, traps are symptoms only: no algorithms, no fixes.
Wordle and 2048 carry a spec table of expected results instead.
Timers get one "new tool" line with an MDN link (Memory, Snake, Simon).

### The class set

| Group | Game | Done means |
| --- | --- | --- |
| 1 | **Memory** ★☆☆ | flip two cards, a match stays, a miss flips back after a delay, move counter, win screen |
| 2 | **Tic-tac-toe** ★☆☆ | turns alternate, win and draw detected, restart, score across rounds |
| 3 | **Wordle** ★★☆ | six rows, green / yellow / grey per letter, physical keyboard input, the on-screen keys coloured too |
| 4 | **Minesweeper** ★★☆ | reveal, numbers, flood-fill on zero, flag on right-click, win and lose |
| 5 | **2048** ★★★ | arrow keys slide and merge, a new tile after each move, score, game over |
| 6 | **Snake** ★★★ | a tick moves the snake, arrows steer, food grows it, wall and self collision, restart |

Shared stretch, same for everyone:

- **Undo**: keep an array of past states. Works only if nothing mutates the
  old ones, which is the "copy, don't change" payoff.
- **Save**: the game survives a reload (`localStorage` + JSON).
- **Best score**, kept separately from the game.

Spares: **Lights Out** ★☆☆, **Hangman** ★☆☆, **Connect Four** ★★☆,
**Simon** ★★☆ (timers), **15-puzzle** ★★☆ (shuffle must stay solvable).

### Traps to plan for

- **Reading the DOM for logic.** The most common one. Rule in every brief:
  the page is output; ask `state`, not the cell.
- **Shallow copies of grids.** `[...grid]` copies the outer array only, so
  undo shows the new board. `grid.map((row) => [...row])` or
  `structuredClone(state)`.
- **`Array(3).fill([])`** puts the same row object in every slot.
- **Listeners inside `render()`** pile up or die with the replaced cells (the
  L5 quiz). One listener on the board, `event.target.closest('[data-index]')`.
- **Arrow keys scroll the page**: `event.preventDefault()` in the `keydown`.
- **Clicks during a delay** (Memory's flip-back, Simon's playback): a
  `state.locked` flag.
- **Stacked intervals** (Snake): restart without `clearInterval` doubles the
  speed.
- **Minesweeper's first click** should never lose: place mines after it.
- **2048 merges**: each tile merges once per move. Write one direction, rotate
  the grid for the other three.
- **Randomness hides bugs**: a debug toggle that shows the mines / the
  word / the next tile.
- **Wordle's word list**: give 50 five-letter words in the brief; no
  dictionary hunting.
- **Sets in the state** don't survive `JSON.stringify` (the L5 trap again).

## Lecture 8 · "Over the wire" (written)

Data fetching and sending, on the market. Written:
`programming-interactivity-8-fetch/` (deck, 5 exercises, 3 playgrounds, API
reference, team briefs, run sheet). Assumes Lecture 5. Teaches asynchronous
JavaScript itself in Act 2 (the run sheet says how to shorten it to a recap if
Lectures 6–7 covered it).

| Act | Content | Practice |
| --- | --- | --- |
| 1 · HTTP | request and response as text, URL and origin, methods, status codes, headers, Network panel | Ex 1: probe the API with the request lab |
| 2 · Async & fetch | one thread, the event loop (step-through lab), promises `.then` / `.catch` / `.finally`, `async` / `await`; two awaits, Response, 404 resolves, `getJSON` + `HttpError`, URLSearchParams | event loop quiz; Ex 2: load the market, filter on the server |
| 3 · Async UI state | loading / ready / error / empty in one `status`, failure modes, aria-busy | Ex 3: loading, error, retry |
| 4 · Sending data | POST JSON, 400 / 415 / 422, render the 201, field errors, double submits, PUT / PATCH / DELETE | Ex 4: leave a review |
| 5 · Origins & races | same-origin policy, CORS + preflight (live), out-of-order responses, AbortController | Ex 5: search without races |
| Team build · 45 min | connect the Lecture 5 market to the API (github.com/nlopin/harbour-market-starter, handed in as a PR); six briefs after it | demos next class |

Infrastructure: `project/server/api-core.js` is the API's logic (no I/O),
shared by the course server (harbour-api.lopin.me: a Cloudflare Worker in
`worker/`, one Durable Object per student's GitHub username, chaos and reset
per market), the local Node server (fallback, CORS demo), the exercise editors
(fake `fetch` + Network tab, `data-api` in kit.js) and the request/race/loop
labs. One set of rules everywhere. Students fork
github.com/nlopin/harbour-market-starter and hand in pull requests.

Not covered, candidates for later: WebSockets / server-sent events (brief 2
polls instead), caching headers in depth, service workers and offline,
authentication flows (login, cookies, sessions), deploy.

## Lecture 9 · "Draw, measure, do less" (deck written)

Act 4 (Borrow) moved to Lecture 10: the deck is now Acts 1–3, about 2 h, in
`programming-interactivity-9-draw-measure/`.

Deck: `programming-interactivity-9-draw-measure/slides.html` (65
slides), hook demo `demos/sales-log.html`. Still to write: the five
exercises, `index.html` (lesson notes), cheatsheet, run sheet. The original
plan follows; where the deck differs, the deck wins.

Measured on the demo page (MacBook, headless Chrome): first keystroke ≈ 2.5 s
(filter 5 ms, building 87 554 rows ≈ 0.8 s, layout ≈ 1.6 s, `topItems()` ≈
80 ms). Layout thrashing can't share that page: it grows with the square of
the row count (1 000 bars 156 ms vs 6 ms batched, 2 000 bars 683 ms vs 13 ms,
100 000 rows: minutes). So Exercise 2 is three pages, one slowdown each: the
sales log (rows + `topItems`), a takings chart with 1 000 thrashing bars, a
search box with heavy synchronous work.


Day 1 of the final-project run-up, after Friday's animation class. About an
hour of theory, the rest practice. Goal: a student can pick a drawing surface,
find out *why* a page is slow instead of guessing, knows the patterns that make
big things fast, and can load someone else's code from a CDN knowing what that
costs, and what the next courses replace it with.

Not taught: how to use any particular chart / map / 3D library. One catalogue
slide names what exists; the docs do the rest.

Running data: the market's night as numbers (visitors per 15 minutes, takings,
100 000 rows of sales and reviews for the big-list parts).

| Act | Theory | Practice |
| --- | --- | --- |
| 1 · Draw | ~12 min, slides 5–15 | Ex 1 three ways to draw |
| 2 · Measure | ~16 min, slides 16–28 | Ex 2 profile it |
| 3 · Do less | ~13 min, slides 29–39 | Ex 3 a hundred thousand rows |
| 4 · Borrow | ~19 min, slides 40–58 | Ex 4 fix the imports; Ex 5 bring a library |

Time: ~60 theory + ~75 exercises + 15 break ≈ 2.5 h. The 45-minute
mini-explorable jam fits only in a longer day; otherwise it moves to Day 2.

### Opening · slides 1–4

1. **Title** · Draw, measure, do less.
2. **Hook** · the market's sales log, 100 000 rows, rendered as a list: type
   in the search box, the page freezes. "Where does the time go?"
3. **Thesis** · Put things on screen, find out what's slow before fixing it,
   and don't write what someone else has already written well.
4. **Four acts, five exercises.**

### Act 1 · Draw · slides 5–15

5. Divider.
6. **Three surfaces** · HTML/CSS boxes, SVG, canvas. Same bar chart in all
   three, code side by side.
7. **You already draw with HTML** · bars as `div`s, a grid of cells with
   `grid`. Enough for grids, bars, rows of bits.
8. **SVG** · XML-based markup for vector graphics; inline in HTML, every shape is a DOM element: Elements panel, CSS, events per
   shape. `viewBox` is a coordinate system; y grows downwards.
9. **Six elements and a mini-language** · `rect`, `circle`, `line`, `path`,
   `text`, `g`; `path d`: `M`, `L`, `Z`. A line chart is one path.
10. **Quiz: nothing is drawn, no error** · `createElement('circle')` →
    `HTMLUnknownElement`. `createElementNS(SVG_NS, …)` or markup inside the
    `<svg>`.
11. **A canvas holds a bitmap** · `getContext('2d')`, every call paints pixels,
    nothing remembers the shapes. Render = `clearRect`, then draw everything
    from state.
12. **Trap: the blurry canvas** · CSS size ≠ bitmap size, `devicePixelRatio`.
13. **A number becomes a pixel** · one line of maths, domain → range, y
    flipped. Libraries call it a scale (hint, nothing more).
14. **Pictures need words** · SVG `<title>` + `role="img"`, canvas fallback
    content, a data table as the honest alternative.
15. **Which surface?** · 8×8 grid of bits · 50 000 particles · chart with
    hover · photo filter. Answers in `<details>`; the rule: how many things,
    events per thing, pixels.

**Ex 1 · Three ways to draw** (15 min): one array of takings as HTML bars,
SVG bars, canvas bars. Stretch: 50 000 dots in SVG vs canvas, which keeps up?
(Sets up Act 2.)

### Act 2 · Measure · slides 16–28

16. Divider.
17. **"It's slow" is a real bug report; investigate** · reproduce, record, form one hypothesis, change
    one thing, measure again (Lecture 5's debugging loop).
18. **One thread, again** · your JS, style, layout, paint and input share the
    main thread (Lecture 8). A frame is 16.7 ms at 60 Hz, 8.3 at 120.
19. **One frame** · JS → style → layout → paint → composite. Which property
    changes cost what; `transform` / `opacity` skip layout (Friday).
20. **The Performance panel** · record, the main track, the summary
    (scripting, rendering, painting), frames. Screenshot with marks.
21. **Your laptop is not the projector's** · CPU throttling 4× / 6×; record
    with it on.
22. **Reading a flame chart** · x is time, y is the call stack; wide = slow.
    Bottom-up tab: which function has the self time.
23. **Long tasks** · over 50 ms, red corner. Input waits for them: that's the
    freeze from slide 2.
24. **Live demo** · record typing in the hook's search; find `render` and
    10 000 `createElement`s in the flame chart.
25. **Measure in code** · `performance.now()`, `console.time`,
    `performance.mark` / `measure` show up in the Timings track.
26. **Trap: layout thrashing** · write a style, read `offsetHeight`, in a
    loop → "Forced reflow" in purple. Read everything, then write everything.
    Quiz: which version is slow?
27. **Performance monitor** · live CPU, DOM nodes, JS heap, layouts per
    second. Nodes or heap only ever climbing → a leak (listeners in
    `render()`, the game-jam trap).
28. **Network panel, briefly** · waterfall, size, throttling to "Fast 4G".
    Returns in Act 4.

**Ex 2 · Profile it** (20 min): one market page, three slowdowns (layout
thrashing in a loop, heavy synchronous work on every keystroke, re-rendering
the whole list on every change). For each: the screenshot of where it shows
up in the Performance panel, the cause in one sentence, then the fix, then the
recording again. Fixes come from Act 3, so this exercise straddles it, or the
fix half moves after slide 39.

### Act 3 · Do less · slides 29–39

29. Divider.
30. **Four ways to do less** · less often, fewer things, elsewhere, later.
31. **Less often: debounce and throttle** · search input waits for a pause;
    `pointermove` / `scroll` at most once per interval. Six lines each, a
    timeline diagram.
32. **Less often: one render per frame** · many state changes, one
    `requestAnimationFrame` render (a `scheduled` flag).
33. **Fewer things: virtualisation** · 100 000 rows, ~20 visible. A spacer
    for the scrollbar, `scrollTop / rowHeight` → which rows, render only those.
    Diagram in a `<pre>`.
34. **What virtualisation costs** · fixed row heights, `Ctrl+F` finds nothing
    off-screen, screen readers need `aria-rowcount` / `aria-rowindex`. When a
    list is a few hundred rows, don't.
35. **Fewer things, cheaper** · pagination / "load more" (Lecture 8's brief);
    `content-visibility: auto` lets the browser skip off-screen work.
36. **Elsewhere: a Web Worker** · heavy computation on another thread,
    `postMessage` in and out, `type: 'module'`. A second track in the
    Performance panel; the page stays responsive.
37. **Later: lazy** · `loading="lazy"`, `IntersectionObserver` (load or
    animate when visible), `await import()` for a heavy module.
38. **Remember results** · a pure function with the same input → cache the
    output (memoise). Works because the model has no DOM in it.
39. **Symptom → pattern** · table: input lags → debounce / worker; scroll
    janks → virtualise / fewer nodes; first load slow → lazy / smaller
    dependencies; slower over time → leak.

**Ex 3 · A hundred thousand rows** (20 min): the sales log as a virtual list.
Before / after in the Performance monitor (DOM nodes) and the panel (frame
time while scrolling). Stretch: the search debounced, the filtering in a
worker.

Break here.

### Close · slides 59–61

59. **Three questions before you go** · which surface, what will be slow and
    how you'll know, which dependencies (plumbing or idea?).
60. **Homework** · for the final project: the surface, the import map with
    pinned versions, the `AGENTS.md` lines; one Performance recording of the
    first prototype.
61. **Closing** · the title, answered.

## Lecture 10 · "Borrow" (deck written)

Deck: `programming-interactivity-10-borrow/slides.html`, Lecture 9's Act 4
moved as Act 1 (~23 min). Still to write: Ex 4 and Ex 5, and whatever else
the class holds.

### The original plan (Lecture 9 slides 40–58)

40. Divider.
41. **What's out there** (hints only) · charts: Observable Plot, Chart.js,
    uPlot, ECharts, D3 · maps: Leaflet, MapLibre · 3D: three.js · physics:
    Matter.js · sound: Tone.js · maths and data: mathjs, simple-statistics ·
    colour: culori · animation: Motion, GSAP. Docs and examples are the
    tutorial.
42. **Borrow the plumbing, write the idea** · the mechanism your project
    explains is your code. (Final-project policy, needs a decision.)
43. **An external dependency** · code you didn't write, on a server you don't
    run: it can be down, slow, changed, malicious, and it sees your visitors'
    IP addresses.
44. **What a CDN is** · npm packages mirrored on servers near the user:
    jsDelivr, unpkg, esm.sh, cdnjs. URL anatomy with `<mark>`:
    `https://cdn.jsdelivr.net/npm/culori@4.0.1/+esm` (CDN · package ·
    version · file).
45. **Way 1: `<script src>`** · a global (`window.Chart`); order matters,
    names clash (the Lecture 5 "already declared" bug).
46. **Way 2: import from a URL** · only in `type="module"`; named, default
    and namespace imports depend on what the package exports. Trap:
    `SyntaxError: Cannot use import statement outside a module`.
47. **Way 3: bare names** · `import { … } from 'culori'` →
    `TypeError: Failed to resolve module specifier "culori". Relative
    references must start with either "/", "./", or "../".`
48. **Import map** · name → URL, every version in one place, before the first
    module script.
49. **Which file?** · ESM, UMD, CommonJS builds; the README's CDN section,
    `exports` / `module` / `main`, the jsDelivr file listing. `require`
    doesn't run in a browser.
50. **What it costs** · Network panel: requests, transfer size, the
    dependency waterfall. Performance panel: parse and compile time on the
    main thread. Look before you choose.
51. **Versions** · semver MAJOR.MINOR.PATCH; no version = latest (may change
    before demo day), `@4` floats, `@4.0.1` is pinned.
52. **AI trap: the wrong major** · `d3.scale.linear()` is d3 v3 (2016) →
    `TypeError: Cannot read properties of undefined (reading 'linear')`.
    Compare the version the code assumes with the one you load.
53. **AI trap: the package that isn't** · invented names, or names someone
    registered after models started inventing them. Check the npm page:
    repository, weekly downloads, last publish.
54. **It runs with your page's rights** · DOM, `localStorage`, `fetch`;
    `integrity` + `crossorigin` on `<script src>`; pin first.
55. **Demo day: vendor it** · download into `vendor/`, import relatively:
    offline, frozen. CSS files too.
56. **From URLs to packages** · bridge table, today ↔ the next courses:
    import map ↔ `dependencies` in `package.json`; pinned URL ↔ lockfile;
    `vendor/` ↔ `node_modules`; the CDN's `+esm` ↔ a bundler resolving bare
    names; `<script>` order ↔ the dependency graph.
57. **What npm and a bundler add** · `npm install`, `package-lock.json`
    committed, `^` / `~` ranges; Vite: dev server, bundling, minifying,
    tree-shaking, TypeScript. The output is still static files, like today.
    Your own code as packages (workspaces, publishing) is where the next
    courses start.
58. **Tell your AI** · `AGENTS.md`: no build step, libraries via the import
    map in `index.html`, exact versions, vendored, ask before adding a
    package.

**Ex 4 · Fix the imports** (15 min): six broken pages, one symptom each: no
`type="module"`, a bare name, the import map after the script, a CommonJS
file, default vs named, AI code for the wrong major.
**Ex 5 · Bring a library** (10 min): pick one from slide 41 that the final
project might use; import map, pinned, vendored; its cost in the Network and
Performance panels.

## Open questions

- Is the next class Friday of week 1 or Monday of week 2?
- How much JavaScript does the group really know (Python background?)?
- Gamepads available in class? How many?
- Which lecture hosts the Web API jam?
- Which lecture hosts the game jam? Two jams in one week may be one too many.
