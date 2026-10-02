# Lecture 5 — Data in, page out · run sheet

Three hours, one 15-minute break, all JavaScript (the deck is in the "wire"
look from Lecture 4's second half, one signal colour per act). The Harbour
Night Market's vendor list stops being HTML and becomes data: an array of
objects, drawn into the page by a `render()` from one `state` object,
remembered in `localStorage`, split into modules, debugged with breakpoints.
About 78 minutes of teaching, 83 of students working (six exercises), 15 of
break, 4 of buffer.

**Audience:** adult programmers, background languages vary; JavaScript syntax
is new. Act 1 is the JavaScript they need (a syntax table and a slide of JS
gotchas, language-neutral); it is not a JS course.

## The story in one paragraph

The market jam ended with two bugs with one cause: the new stall that the
filter can't see, and two features that both hide cards and undo each other.
Both times the page itself was the only record of what was going on, and
several scripts edited it. **Today's idea: keep the truth in data, draw the
page from it: `page = render(state)`.** Act 1 makes the market data (objects,
arrays, `map`/`filter`/`find`, copy don't change). Act 2 draws it (a
`<template>`, `card(stall)`, `render(list)`). Act 3 puts every choice in one
`state` object: an event changes the state, then render redraws everything,
so nothing can fight. After the break, Act 4 makes the state outlive a reload
(JSON + `localStorage`), Act 5 splits the 200-line script into modules (the
jam's "already declared" error was a symptom of one global scope), and Act 6
finds bugs with the debugger. The cliffhanger: the stalls are typed by hand;
next week they come from a server, and only `data.js` changes.

Lecture 4's loop was find · listen · change the page. Today's is listen ·
change the **state** · redraw. Slide 3 says it once; every act uses it.

## Before class

- Serve the folder (`npx live-server`). Presenter view, live editors,
  modules and the State lab need `http://`, not `file://`.
- `p` opens presenter view (notes, next slide, per-act clock).
- Students need: editor, browser, the exercises repo
  (github.com/nlopin/programming-interactivity-exercises → `05-data/`).
  `git pull` before class; slide 4 asks again.
- Exercise 5 (modules) and Exercise 6 (bug hunt) happen in their **own
  copies**, served by `npx live-server`: `project/starter/` and
  `project/bug-hunt/`. The break slide tells them to set it up.

## Timeline

50 slides. T = theory minutes, P = practice minutes.

| Clock | Part | T | P | Students do | Materials |
| --- | --- | --- | --- | --- | --- |
| 0:00 | **Prologue** (1–4) — title, the two jam bugs, `page = render(state)`, the day in six acts | 6 | | `git pull` | |
| 0:06 | **Act 1 · Data structures** (5–12) — a card is an object, the market is an array (syntax table), map / filter / find, Array lab (type along), quiz: `sort`, six JavaScript gotchas (truthiness, `===` and identity, `const`, strings from forms, `?.` `??`, `({ })`), copy don't change | 17 | | type along in the Array lab | `playgrounds/array-lab.html` |
| 0:23 | **Ex 1 · Stock-take** (13) — cases 1–5 | | 9 (8 + 1) | five functions on data | `exercises/01-stock-take.html` |
| 0:32 | **Act 2 · Rendering** (14–18) — `<template>`, `card(stall)` (the `toggle(name, undefined)` trap), `render(list)` with `replaceChildren`, live: the page follows the data | 10 | | | |
| 0:42 | **Ex 2 · Render the market** (19) — cases 1–3 | | 14 (12 + 2) | card, render, sold out + price | `exercises/02-render.html` |
| 0:56 | **Act 3 · Single source of truth** (20–26) — where is the truth (L4 vs today), the state object, event → state → render, render draws the controls too, State lab, quiz: dead listeners after render | 14 | | | `playgrounds/state-lab.html` |
| 1:10 | **Ex 3 · Single source of truth** (27) — cases 1–3 | | 16 (14 + 2) | filter, search, ♡ from state | `exercises/03-one-source-of-truth.html` |
| 1:26 | **Break** (28) — copy `project/starter/` and `project/bug-hunt/` out, serve both | | | | |
| 1:41 | **Act 4 · Persistence** (29–34) — client-side storage options (localStorage, sessionStorage, cookies, IndexedDB, Cache API, URL, server), the localStorage API, JSON basics, serialising (the Set trap), save / load / `update()` | 10 | | | |
| 1:51 | **Ex 4 · Remember my night** (35) | | 10 (8 + 2) | save + load, survive broken JSON | `exercises/04-remember.html` |
| 2:01 | **Act 5 · ES modules** (36–40) — the jam's "already declared", a module, four rules, one job per file | 8 | | | |
| 2:09 | **Ex 5 · Split into modules** (41) — in their own copy | | 20 (18 + 2) | market.js → five modules | `exercises/05-split-it-up.html`, `project/starter/` |
| 2:29 | **Act 6 · Debugging** (42–45) — the Sources panel (mock, then live on the bug hunt), four ways to stop, the recipe | 9 | | | `project/bug-hunt/` |
| 2:38 | **Ex 6 · Bug hunt** (46) — pairs | | 14 (13 + 1) | 3 of 5 bugs in class | `project/bug-hunt/` |
| 2:52 | **Wrap** (47–50) — today in one slide, cliffhanger (fetch), homework, thanks | 4 | | | |
| 2:56 | *4 minutes of buffer* | | | | |

**Decision point at the break (1:26):** if Act 3's exercise ran long, shorten
Exercise 5 to steps 1–3 (data, state, storage) and leave render/main for
homework. Never drop the bug hunt: it's the debugger's only practice.

If you run late, cut in this order: the recipe (45: say "hypothesise, break,
inspect"), the module rules slide (39: the Exercise 5 page has the same
table of errors), the "copy, don't change" slide (12: one sentence instead).
Don't cut slide 11 (JavaScript gotchas): two of its six cards are bug-hunt bugs.
Act 1 is the densest act: if it runs past 0:25, make slide 12 (don't mutate
your inputs) one sentence. The buffer is only 4 minutes since the storage and
JSON slides were added: if Act 4 is tight, slide 30 (storage options) can be
read as a reference in 1 minute rather than walked row by row.

Note for future edits: like Lectures 2–4, this deck deliberately does **not**
follow `harbour/CLAUDE.md` (own engine in `assets/`, per-deck styles, live JS
components). Don't "fix" it back.

## Pre-class checklist

1. Rehearse the live slides: 9 (Array lab: run the presets in order, the
   `sort` preset shows the warning row), 18 (add a stall in the editor, mark
   one sold out, then `render(stalls.filter(…))`), 25 (State lab: Food, type
   "ta", ♡, All). `Esc` leaves an editor so the arrows work again.
2. Slide 43 is a mock of DevTools paused in `render()`; right after it, do it
   live on `project/bug-hunt/`: breakpoint on the first line of `render`,
   click a filter, step over and into `visibleStalls`. Don't fix anything on
   the projector. Practise once so the panel layout doesn't surprise you.
3. Run each exercise's solution once (the 🏳/Solution details). Exercise 4's
   checks reload the preview: give them two seconds.
4. Exercise 5: do the split yourself once against `project/solution/` so you
   know the error messages in the order students meet them.
5. Open `project/bug-hunt/` and `project/bug-hunt-solution/`, press "Run the
   checks": 0 of 5 and 5 of 5. The checks run on demand in hidden copies with
   their own storage key, so they never pause a student's debugger or touch
   the real saved data. If a report won't turn green, diff against the
   solution.

## Answer keys

**Ex 1 · Stock-take.** 1 `list.map((s) => s.name)`. 2 `list.filter((s) =>
s.tag === tag)` (a single `=` assigns: every stall matches, and every tag is
rewritten; the "stalls is unchanged" check catches it). 3 `list.find((s)
=> s.id === id)`. 4 `list.filter((s) => !s.soldOut).length`. 5 `[...list].sort((a,
b) => a.price - b.price)`: the check "stalls keeps its own order" catches a
bare `sort`, the 10/9/100 check catches a missing compare function.
Homework: 6 destructuring + template literal + ternary; 7
`[...new Set(list.map((s) => s.tag))]`. Every check calls the function on a
second market, so hard-coded answers fail.

**Ex 2 · Render.** 1 clone `template.content.firstElementChild`, fill tag /
h3 / p with `textContent`, `li.dataset.id = stall.id`. The XSS check fails
on `innerHTML`. 2 `list.replaceChildren(...stallsToShow.map(card))` + count
with a ternary for "1 stall"; `append` instead of `replaceChildren` fails
"3, not 11". 3 `classList.toggle("sold-out", stall.soldOut)` on the article,
`badge.hidden = !stall.soldOut`, both via `Boolean(stall.soldOut)`: a
missing key is `undefined` and `toggle(name, undefined)` flips the class (the
check tries a stall without the key), price `"free"` / `` `from €${price}` ``.
Bonus: tags via Set, one section per tag, `filter` inside.

**Ex 3 · Single source of truth.** 1 `state.tag = button.dataset.filter;
render()`, `visibleStalls` filters by tag, `render` sets `aria-pressed` on
every button. The check counts `<li>`s, so hiding with `hidden` fails. 2
`query` in state, `input` listener, second `filter` with `toLowerCase()`,
count `"3 of 8 stalls"`. 3 `saved: new Set()`, one listener on
`.vendor-list`, `closest(".fav")` → `closest(".stall").dataset.id`, toggle,
render; pass `state.saved` to `drawCards`, `"♥ 2"`. Per-button listeners
fail "still saved after Music → All". Bonus: `onlySaved` + `change` event.

**Ex 4 · Remember.** `save()`: `JSON.stringify({ tag, saved: [...state.saved]
})` under `"my-night"`; `update()` = `render(); save();`, called from every
listener (the end of `render()` also passes, but it mixes drawing and storing).
`load()`: `try { JSON.parse(getItem) … if (!data) return; tag ?? "all"; new
Set(saved ?? []) } catch {}`; call before the first `render()`. The checks
reload the preview three times (saved state back, broken JSON, empty
storage); each check clears the key first, so an earlier broken attempt can't
fail the current one. Common misses: saving the Set itself (`{}`), loading
after rendering. Bonus (Clear my night): reset state, `update()`, and
`render()` writes `state.query` back into the search box (slide 24).

**Ex 5 · Split into modules.** Reference: `project/solution/js/`. `data.js` exports
`stalls`; `state.js` imports it, exports `state`, `visibleStalls`,
`toggleSaved`; `storage.js` imports `state`, exports `save`, `load`;
`render.js` imports `stalls`, `state`, `visibleStalls`, exports `render`;
`main.js` has `update()`, the listeners, the menu, the form, the start.
Each module looks up the elements it needs itself (render.js and main.js
both `querySelector(".filters")`: fine, module scope). The proof: `stalls` in
the console is a ReferenceError (in the classic version it answers, because
top-level `const` in classic scripts is global).

**Ex 6 · Bug hunt.** `project/bug-hunt/app.js`, fixed in
`project/bug-hunt-solution/app.js` (search `FIX`). Students press "Run the
checks" after deactivating breakpoints (the checks run `app.js` in hidden
copies with their own storage key, so breakpoints would fire there too).
1. `(stall.tag = state.tag)` in the filter: assignment, truthy, and it
   rewrites every tag. → `===`.
2. `food + tip.value`: a string from the select, 14 + "2" = "142".
   → `Number(tip.value)`.
3. `load()` destructures `data.choices`, but `save()` writes the choices
   flat: TypeError, swallowed by the `try … catch`, defaults, no console error.
   Pause on caught exceptions shows it. → `const { … } = data`.
4. `event.target.dataset.id`: the target is the `<span class="heart">` inside
   the button. → `event.target.closest(".save")?.dataset.id`.
5. The summary reads `const saved = state.saved;`, a shorthand that still
   points at the old empty Set after `load()` replaces `state.saved`. Two ♥,
   "Save a stall to plan your night". Needs 3 fixed to reproduce. The Scope
   panel shows two different Sets. → `state.saved` in the summary.

Bugs 1, 2 and 4 were warned about earlier in the day (slides 11 and 26):
finding *where* is still the exercise. 3 and 5 weren't, so pairs start with
those (the page and slide 46 say so). The check for 5 runs the real path
(stored data → `load()` → `render()`), so any fix passes: reading
`state.saved` in the summary, refilling the existing Set in `load()`, or
making the shorthand a `let` that `load()` updates. Re-syncing the shorthand
once after start-up (`load(); saved = state.saved;`) stays red, fairly: the
check calls `load()` again, and so would any later feature. Exception pauses: with
"Pause on caught exceptions" ticked, the hidden check copies can pause too,
so students untick it before running the checks (the page says so).

The live editors keep each student's code as a draft in localStorage (per
page and editor), so a reload doesn't lose work; ↺ reset goes back to the
starter and clears the draft. Drafts are keyed to the starter code: don't
edit an exercise's starter while students are working on it, or their drafts
stop loading (they stay in storage, invisible).

## Things students ask, and short answers

- **"Isn't redrawing everything slow?"** Not for hundreds of items. For
  thousands, libraries (React, Vue, Svelte, Lit) do the same idea and only
  touch what changed. The honest cost: a redraw loses focus inside the list.
- **"Why not `innerHTML` with a template string?"** Fine for your own data,
  XSS for anyone else's (speaker note on slide 17). Next week's data comes from a server.
- **"`var`?"** Old; function-scoped; don't. `const` by default, `let` when
  you reassign.
- **"Should the search query be saved?"** A design choice: we don't, because
  nobody expects it back tomorrow. Store choices people expect to persist.
- **"Where do I put `save()`?"** In `update()`, which every listener calls.
  Not in `render()`: drawing shouldn't have side effects outside the page.
- **"`toSorted`?"** Baseline 2023, in every current browser. `[...list].sort`
  works everywhere.

## Files

```
slides.html                 the deck (p = presenter, m = menu, n = notes)
index.html                  the hub page for students
cheatsheet.html             one A4 page
exercises/                  01 stock-take · 02 render · 03 one source of truth ·
                            04 remember · 05 split it up (instructions page)
playgrounds/                array-lab · state-lab (also embedded on slide 25) · xss-lab
                            (XSS demo, linked from slide 16)
project/starter/            the market drawn from data, one classic market.js
                            (Exercise 5 + homework); starter.zip is the same
project/solution/           the modules version (teacher only, not synced)
project/bug-hunt/           Exercise 6: five bugs, self-testing reports
project/bug-hunt-solution/  fixed (teacher only, not synced)
assets/                     deck.js · deck.css · kit.js (+ ArrayLab) · kit.css
```
