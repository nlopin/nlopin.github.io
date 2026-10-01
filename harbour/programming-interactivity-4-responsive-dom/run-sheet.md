# Lecture 4 — Fits every pocket, talks back · run sheet

Three hours, one 15-minute break. **Part 1 is CSS** (responsive: media
queries and fluid values), **Part 2 is JavaScript** (the DOM, events, forms),
and the deck changes its whole look between them: paper-and-ink for CSS, a
dark "wire" circuit-board theme for JS. The break sits after the events act;
after it come forms and the **market jam**: five groups build five small
features (HTML + CSS + JS each) for 30 minutes, then present them.
66 minutes of teaching, 84 minutes of students working (exercises 39, jam 45),
15 minutes of break, 15 minutes of buffer.

Cut from this lecture (on the reading-list slide, 23): container queries,
feature queries, viewport units (svh/lvh/dvh), scrollburglars. Act 2 (fluid)
has no exercise of its own: the live demos and the calculator are the
practice. Exercise 4 (the ticket form) is homework.

**Prerequisite:** students have written code before, in any language. Slide
27 is the whole JavaScript syntax needed for the exercises; slide 52 (the jam
toolbox) adds what the jam needs. Someone who has never programmed: pair
them up for Exercises 2–3 and the jam.

## The story in one paragraph

Lecture 3 ended with a floor plan, drawn on a laptop. Open it on a phone and
it breaks; press Reserve and nothing listens. Those are the two halves.
**Part 1's question: who are you asking?** A media query asks the window
(Act 1, small screens); `clamp()` asks nobody, it's maths (Act 2, fluid).
Two more askers are on the reading list (23): the slot (`@container`) and
the browser (`@supports`). Fewest questions wins: fluid first.
The cliffhanger (24): CSS can fold a menu, but it
can't read what someone typed into the ticket form.
**Part 2's loop: find · listen · change.** Act 3 finds and changes (the
DOM), Act 4 listens (events, with the phone menu on slide 43 as the smallest
whole loop). After the break, Act 5 is the same loop on the form: the
cliffhanger answered. Then **the market jam** puts both halves in the
students' hands: every group's feature needs new HTML, a CSS decision (a
query, a variable, a `:has()`) and a find · listen · change loop, and every
group explains which was which on stage. The wrap (slide 56) names the
contract between the halves: a class, an attribute, a CSS variable.

The showcase page (`project/showcase/`, keys 0–4) is the progress bar:
0 Lecture 3 · 1 small screens · 2 fluid · 3 components · 4 + JS (step 3 uses
container queries: reading-list material). It's shown in phone frames on
slides 1, 2, 5, 43 and 58.

## Before class

- Serve the folder (`npx live-server`). Presenter view, live editors and the
  JS checks need `http://`, not `file://`.
- `p` opens presenter view (notes, next slide, per-act clock).
- Students need: editor, browser, the exercises repo
  (github.com/nlopin/programming-interactivity-exercises → `04-responsive-dom/`).
  Ask them to `git pull` before class; slide 2 asks again.
- For Exercise 1 case 0 and the homework, students **copy**
  `project/starter/` out of the repo (or unzip `starter.zip`). For the jam,
  one laptop per group copies `project/jam/` (or unzips `jam.zip`).

## Timeline

58 slides. T = theory minutes, P = practice minutes.

| Clock | Part | T | P | Students do | Materials |
| --- | --- | --- | --- | --- | --- |
| 0:00 | **Prologue** (1–3) — title, Lecture 3's page on a phone (4 problems, the 4th is "it doesn't listen"), the day in seven parts | 5 | | `git pull` | `project/showcase/` |
| 0:05 | **Act 1 · Small screens** (4–13) — the 980px lie, testing, anatomy of a media query, live query with presets, mobile first, breakpoints from content (rem!), other queries (point, don't read), variables in queries, quiz: queries add no specificity | 11 | | | `playgrounds/devices.html` |
| 0:16 | **Ex 1 · Pocket check** (14) — cases 0–3 in class | | 14 (12 + 2) | viewport tag in own starter; wrap the menu; gate the featured stall; redraw the map | `exercises/01-pocket-check.html` |
| 0:30 | **Act 2 · Fluid** (15–22) — jump vs slide (+ one line on `vw`), values built from parts, min/max/clamp, responsive typography, fluid typography, the calculator (let them call out numbers), fluid design (30 s) | 13 | | | `playgrounds/fluid.html` |
| 0:43 | **Go deeper** (23, 30 s) + the cliffhanger: who reads the form? (24) | 2 | | | |
| 0:45 | **Part 2 opener** (25–27) — boot screen (ask: "change any site's h1 in DevTools: who else sees it?"), find · listen · change, JS crib | 3 | | | |
| 0:48 | **Act 3 · Find it, change it** (28–36) — DOM lab (type along), getElementById / getElementsByTagName, querySelector / null / closest, textContent vs innerHTML (XSS), classList / setProperty, attributes / dataset, createElement / append, quiz: `defer` | 11 | | type along in DevTools | `playgrounds/dom-lab.html` |
| 0:59 | **Ex 2 · Night Shift** (37) — messages 1–5 | | 9 (8 + 1) | the DOM game | `playgrounds/night-shift.html` |
| 1:08 | **Act 4 · Listen** (38–44) — addEventListener in four steps, [event monitor (40): skipped], bubbling (predict first), delegation, the phone menu, debugging in one slide (+ the `hidden` trap) | 10 | | | `playgrounds/events.html` |
| 1:18 | **Ex 3 · Wire it up** (45) — cases 1–3, case 3's solution shown in the debrief | | 16 (14 + 2) | menu, ♡ save, filter with one listener | `exercises/03-wire-it-up.html` |
| 1:34 | **Break** (46) — groups form now: count off 1–5, one laptop per group with the jam starter served | | | | `project/jam/` |
| 1:49 | **Act 5 · The conversation** (47–50) — the form's default action, submit vs click (validation order), FormData (predict typeof), the cliffhanger answered. Ex 4 is homework | 5 | | | |
| 1:54 | **Market jam** (51–54) — title, **the toolbox** (52: eight tools the briefs use but the lecture didn't teach), how the group works (plan together, one drives, the rest review and verify), the clock, deal the five tasks | 6 | | | `jam/index.html` |
| 2:00 | **Market jam: build** (53, 30-minute timer) | | 30 | one feature per group, HTML + CSS + JS | `project/jam/`, `jam/0N-….html` |
| 2:30 | **Market jam: show & tell** (55) — 2½ min per group, one question each | | 15 | five demos | |
| 2:45 | **Wrap** (56–58) — the page is a conversation, homework | 2 | | | |
| 2:47 | *13 minutes of buffer* | | | | |

The buffer is big on purpose: the jam is the part that overruns. If you're
on time at 2:00, give the build 35 minutes instead of 30.

**Decision point at 0:45** (start of Part 2): if Part 1 ran over, take it out
of Act 3 and Act 4 (skip the crib, 27, and the debugging slide, 44, which the
jam briefs repeat), never out of the jam.

Homework is split: **Part 1 (responsive.css) for tomorrow**, **Part 2
(market.js, Ex 4, Night Shift 6–16) by the next JS lecture**. Optional:
finish the jam feature.

If you run late, cut in this order: the crib (28: point at it, it's on the
cheat sheet), the fluid design slide (22: say "a page with zero breakpoints"),
the debugging slide (44: the jam briefs repeat it). The event monitor (40)
is already skipped. If the jam starts late, shorten the build to 25 minutes,
never the show & tell: presenting is half the point.

Note for future edits: like Lectures 2 and 3, this deck deliberately does
**not** follow `harbour/CLAUDE.md` (own engine in `assets/`, per-deck styles,
live JS components). That was the brief — don't "fix" it back.

## Pre-class checklist

1. Rehearse the live slides on the projector: 8 (presets 📱 ▭ 🖥, then delete
   the query to make the 🦝 appear), 12 (DevTools → Rendering →
   prefers-color-scheme: dark), 16, 21, 22, 29 (DOM lab presets), 41 (ask
   for a prediction first), 43 (click Menu inside the phone), 49 (predict
   typeof, then press Reserve), 54 (🎲 deal the tasks).
   `Esc` leaves an editor so the arrows work again.
2. Slide 30: also have the showcase open in a second tab to change its h1 in
   the real DevTools console.
3. Play Night Shift 1–5 once. Know level 3 (the badge must be found inside
   the churros card: the check puts another sold-out stall first).
4. Test the JS exercises in your browser: a `while(true)` in a live editor
   freezes the tab (same thread). If someone does it, reload the page.
5. The day before: send "git pull + copy the starter out of the repo".
   Say that the jam needs one laptop per group with a working
   `npx live-server`.
6. Open `project/jam-reference/` once: all five jam features on one page.
   It's the answer key for the jam (teacher only: it isn't synced to the
   student repo). Know the two traps every group can hit: a second
   `const stalls`/`form`/`nav` next to market.js (SyntaxError, nothing runs),
   and hiding stalls with `hidden` while the filter also uses `hidden`. Five
   groups get tasks 1–5; a sixth group (or a fast one) gets a spare: live
   search (easy) or register a stall (hard).

## Tools built for this lecture

- **Live CSS editor, new options** (`assets/kit.js`): `data-presets="360,800,1200"`
  (width buttons next to the slider), `data-burglars` (outlines the outermost
  box that sticks out past the window and shows a 🦝 badge with how many px
  too wide), and checks that run **at several widths at once** in hidden
  frames: `{"at": [360, 1200], "expr": …}` and `{"noScroll": [320, 360]}`.
- **Live JS editor** (`.live-js`): script.js + index.html tab + a preview you
  can click + a console that formats elements, lists and FormData and
  explains the common errors in plain words (null, forEach on an element,
  typos, const). Re-runs 0.9 s after typing stops or on ⌘/Ctrl + Enter.
  Checks run in fresh hidden frames and act like a user: `click()`,
  `type()`, `submit()`, `key()`, `logs()`. A form that would reload the page
  is stopped and the console says why. `data-role="before"` code runs first
  (used to count listeners for the delegation check).
- **DOM lab** (`.dom-lab`): a page, its live element tree (changed lines
  flash), and a console input with history; click a tree line for `$0`.
- **Event lab** (`.event-lab`): a click animates up the bubbling path;
  listeners, `stopPropagation` and `closest("li")` are toggles; generated
  code shows what the configuration means.
- **Event monitor** (`.event-monitor`): every form event in order
  (focus, keydown, input, change, blur, click, submit).
- **Fluid calculator** (`.fluid-calc`): two sizes at two widths → `clamp()`,
  with a graph and a zoom test (does the text reach 2× at any zoom ≤ 500%?).
- **Night Shift** (`playgrounds/night-shift.html`): 16 DOM levels as text
  messages from the organiser. Checks also run on a modified page (an extra
  card added before the student's script), so hard-coded answers fail.
  Progress in localStorage.
- **Viewport lab** (`playgrounds/devices.html`): the showcase on three phones,
  viewport tag on/off, showcase step 0–4, your own DPR.

## Answer keys

**Ex 1 · Pocket check.** 0 add `<meta name="viewport" content="width=device-width, initial-scale=1">`.
1 `flex-wrap: wrap` on `.site-header` and `.main-nav ul` (+ a row gap).
2 `@media (width >= 34rem) { .featured { grid-column: span 2 } }` — found by
dragging (two 15rem columns + 1rem gap + 2rem padding = 33rem, plus slack).
Anything from 33rem up passes; an earlier breakpoint scrolls sideways at
500px and fails.
3 inside `@media (width >= 50rem)`: `grid-template-columns: 1fr 2fr 1fr` and
the four-row areas.
4 wrap `.vendor-card:hover` in `@media (hover: hover)`, `scroll-behavior` in
`@media (prefers-reduced-motion: no-preference)`.
5 `:root { --gutter: 1rem }`, `@media (width >= 50rem) { :root { --gutter: 2.5rem } }`, use it for body padding and the gap.

**Ex 2 · Night Shift.** Every level has 💡 and 🏳 buttons with an answer.
In class 1–5. Common: 1 any dash works, the date is what's checked;
3 the badge via `churros.querySelector(".badge")`, not `document`;
4 `querySelectorAll` + `for…of`; 7 build `span` + `h3`, `card.append(…)`,
then `list.append(card)`; 8 `card.remove()` in a loop.

**Ex 3 · Wire it up.** 1 toggle `aria-expanded` between the strings `"true"`/`"false"`.
2 loop over `.fav`, each listener flips its own `aria-pressed` and text.
3 one listener on `.filters`, `event.target.closest("button")`, set
`aria-pressed`, `card.hidden = tag !== "all" && card.dataset.tag !== tag`.
4 `document.addEventListener("keydown", e => { if (e.key === "Escape") … })`.
5 count `!card.hidden`, write `` `${shown} of ${cards.length} stalls` ``.
6 `document.documentElement.style.setProperty("--accent", button.dataset.color)`.

**Ex 4 · Tickets, please (homework).** 1 `form.addEventListener("submit", e => { e.preventDefault(); console.log(form.elements.name.value) })`.
A click listener on the button fails the third check: it runs on an empty form.
2 FormData, `Number(data.get("guests"))`, `1 person` / `n people` (any separator), build with
createElement + textContent, `result.replaceChildren(ticket)`.
3 `message.addEventListener("input", …)`: `counter.textContent = `${message.maxLength - message.value.length} characters left``. The starter calls the output element `counter`, so copying the counter from the forms slides can't shadow it.
4 (bonus) `setCustomValidity(/\p{L}/u.test(v) ? "" : "A name needs at least one letter.")` on input.
5 replace the `innerHTML` template with createElement + textContent.

**Market jam.** Reference implementations, one CSS + one JS file per task:
`project/jam-reference/css/{theme,saved,schedule,search,map}.css` and
`js/…` (task 4 is `wizard.css/js`; the spares are `search` and `register`). Key moves: 1 three radios in a fieldset drawn as one switch
(`label:has(input:checked)`), `html[data-theme="light"]` redefines the
outfit's variables; JS keeps the *choice* (light/auto/dark, in
`localStorage`, auto = removed) apart from what's *shown* (`data-theme`:
light/dark), and in auto listens to `matchMedia(…)`'s `change`; 2 one listener on `.vendor-list`, a `Set` of names in
`localStorage` as JSON, `body.saved-only` + `:has()` to hide; 3 hours after
midnight count as 24+, `.now` on the last started row, `attr(data-label)`
cards below 40rem; 4 (wizard) three `<fieldset class="step">`s, `showStep(i)`
sets `hidden` and `aria-current`, Next validates only that step
(`step.elements` + `checkValidity` / `reportValidity`), the review is built
from `FormData` with `textContent`, the `reset` event returns to step 1.
market.js still books the ticket on `submit`. The traps: Next/Back need
`type="button"`; Enter submits from step 1 unless the submit button is
`disabled` until the last step (verified: no enabled submit button, no
implicit submission); fieldsets break Lecture 3's form grid. 5 zones become `<button>`s (`font-family: inherit`), one
listener on the map, a fixed bottom sheet below 40rem, Escape closes.
Spare tasks. Search: `input` event, own class `search-miss` (not `hidden`),
stalls looked up inside the listener, status via `textContent`. Register a
stall: `submit` + `FormData`, a duplicate-name rule with `setCustomValidity`,
a card built with `createElement` in the existing structure; the trap is
that market.js took `querySelectorAll(".stall")` once at load (a static
snapshot), so the filter never sees the new stall; the reference's market.js
asks again inside the click handler.

**Exit ticket** (removed from the deck for the jam; ask it orally if time). 1 white: the query matches, but `.main-nav a` (0,1,1)
beats `nav a` (0,0,2) wherever it is; a query neither adds nor removes
specificity. 2 `querySelector` returns one element: loop `querySelectorAll`, or one
delegated listener on the parent. 3 `event.preventDefault()`: the form
submitted and the page reloaded.

## Talking points worth not skipping

- No viewport tag → no media query will ever see a small screen.
- Breakpoints in `rem`: they follow the user's default font size.
- A media query adds no specificity (slide 13). It's why mobile first puts
  the queries after the base rules.
- Every fluid value needs a `rem` part: `vw` alone can't be zoomed.
- `querySelector` returns `null` when nothing matches: the #1 error.
- Their words go in `textContent`; `innerHTML` is for your own HTML (XSS).
- JavaScript flips a class or an attribute; CSS draws it. `aria-expanded`
  is state *and* accessibility.
- Listen for `submit` on the form, never `click` on the button. Not because
  of Enter (Enter fires a click on the submit button too) but because the
  click comes *before* validation and the submit *after* it.
- Every form value is a string.
- `hidden` loses to any author `display`: `[hidden] { display: none !important }` (slide 44).
- "It doesn't work": red error → read the line · nothing happens → log first
  · it blinks → preventDefault (slide 44).

## Interpretation notes (syllabus → slides)

- Cut for time, on the reading list (slide 23) and the cheat sheet (box 6):
  *Viewport Units*, *Scrollburglars*, *Container Queries*, *The Killer
  Pattern*, *An Important Note*, *Feature Queries*. One line on `vw` stays
  on slide 16, because fluid values need it. The fluid exercise is cut too:
  Act 2 is practised through its live demos and the calculator. The 🦝 detector in the live
  editors still flags sideways scrolling.
- The cliffhanger is the **form**, not the menu: CSS can fold a menu
  (`<details>`, `popover`, `:has(:checked)`), and master's students will say
  so. The notes on slide 24 tell you to agree.
- *Fluid Calculator* is a real tool (`playgrounds/fluid.html`, slide 21).

## Files

```
slides.html                 the deck (p = presenter, m = menu, n = notes)
index.html                  hub for students
cheatsheet.html             one page, prints on A4 landscape
project/starter/            index.html (no viewport tag, on purpose), css/outfit.css,
                            css/layout.css (Lecture 3), css/responsive.css + js/market.js (tasks)
project/showcase/           same HTML, switcher 0–4: layout-l3 · layout (mobile first) ·
                            fluid · components · states + js/market.js
exercises/                  01 pocket check · 03 wire it up · 04 tickets, please
                            (Exercise 2 is Night Shift, in playgrounds/)
playgrounds/                night-shift (game, = Ex 2) · devices · fluid · dom-lab · events
jam/                        the market jam: index (roles, clock, presenting) + five task briefs
project/jam/                the jam starter: today's finished page + empty css/feature.css, js/feature.js
project/jam-reference/      all five jam features on one page (teacher only, not synced)
assets/                     kit.css/js (components), deck.css/js (slide engine, wire theme)
images/                     hub screenshots
```
