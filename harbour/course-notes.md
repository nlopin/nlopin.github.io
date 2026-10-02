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

## Open questions

- Is the next class Friday of week 1 or Monday of week 2?
- How much JavaScript does the group really know (Python background?)?
- Gamepads available in class? How many?
- Which lecture hosts the Web API jam?
- Which lecture hosts the game jam? Two jams in one week may be one too many.
