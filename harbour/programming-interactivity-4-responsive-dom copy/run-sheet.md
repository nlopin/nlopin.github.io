# Lecture 4 — Fits every pocket, talks back · run sheet

Three hours, one 15-minute break. Two halves with a hard border at the break:
**Part 1 is CSS** (responsive), **Part 2 is JavaScript** (the DOM, events,
forms), and the deck changes its whole look at the border: paper-and-ink
before the break, a dark "wire" circuit-board theme after it. About half
theory, half practice: 81 minutes of teaching, 80 minutes of students typing,
4 minutes of buffer.

**Prerequisite:** students have written code before, in any language. Slide
39 is the whole JavaScript syntax needed tonight. Someone who has never
programmed: pair them up for Exercises 5–7.

## The story in one paragraph

Lecture 3 ended with a floor plan, drawn on a laptop. Open it on a phone and
it breaks; press Reserve and nothing listens. Those are the two halves.
**Part 1's question: who are you asking?** A media query asks the window
(Act 1, small screens), `clamp()` asks nobody, it's maths (Act 2, fluid), a
container query asks the slot and `@supports` asks the browser (Act 3,
components). The synthesis slide (34) says it as a table: fewest questions
wins. The cliffhanger (35): the phone menu is folded away and CSS can't open
it, and above all CSS can't read what someone typed into the ticket form.
**Part 2's loop: find · listen · change.** Act 4 finds and changes (the
DOM), Act 5 listens (events, with the phone menu on slide 53 as the smallest
whole loop), Act 6 is the same loop on the form: the cliffhanger answered. The halves meet in the middle: a class, an
attribute, a CSS variable is the contract between script and stylesheet
(slide 62).

The showcase page (`project/showcase/`, keys 0–4) is the progress bar:
0 Lecture 3 · 1 small screens · 2 fluid · 3 components · 4 + JS. It's shown in
phone frames on slides 1, 2, 5, 53 and 65.

## Before class

- Serve the folder (`npx live-server`). Presenter view, live editors and the
  JS checks need `http://`, not `file://`.
- `p` opens presenter view (notes, next slide, per-act clock).
- Students need: editor, browser, the exercises repo
  (github.com/nlopin/programming-interactivity-exercises → `04-responsive-dom/`).
  Ask them to `git pull` before class; slide 2 asks again.
- For Exercise 1 case 0 and the homework, students **copy**
  `project/starter/` out of the repo (or unzip `starter.zip`).
- Students who don't know JavaScript syntax: slide 39 is the whole crib
  (const/let, arrow functions, template literals, `for…of`, `===`). The
  exercises never need more.

## Timeline

65 slides. T = theory minutes, P = practice minutes.

| Clock | Part | T | P | Students do | Materials |
| --- | --- | --- | --- | --- | --- |
| 0:00 | **Prologue** (1–3) — title, Lecture 3's page on a phone (4 problems, the 4th is "it doesn't listen"), the day in seven parts | 5 | | `git pull` | `project/showcase/` |
| 0:05 | **Act 1 · Small screens** (4–13) — the 980px lie (viewport tag, CSS px vs device px), testing, anatomy of a media query, live query with presets, mobile first, breakpoints from content (rem!), other queries (table: point, don't read), variables in queries (+ prefers-color-scheme), quiz: queries add no specificity | 12 | | | `playgrounds/devices.html` |
| 0:17 | **Ex 1 · Pocket check** (14) — cases 0–3 in class, 4–5 bonus | | 14 (12 + 2) | viewport tag in own starter; wrap the menu; gate the featured stall; redraw the map | `exercises/01-pocket-check.html` |
| 0:31 | **Act 2 · Fluid**, first half (15–20) — jump vs slide (live), values built from parts (calc + variable fragments), svh/lvh/dvh, min/max/clamp, scrollburglars (live, 3 burglars) | 10 | | | |
| 0:41 | **Ex 2 · Scrollburglars** (21) | | 7 (6 + 1) | six burglars at 360px | `exercises/02-scrollburglars.html` |
| 0:48 | **Act 2**, second half (22–25) — responsive typography (rem, zoom, WCAG 1.4.4), fluid typography (two points make a line), the calculator (live), fluid design: a page with no breakpoints | 7 | | | `playgrounds/fluid.html` |
| 0:55 | **Ex 3 · Fluid market** (26) — cases 1–3 in class | | 10 (9 + 1) | clamp headline, fluid gutter, `min()` column | `exercises/03-fluid-market.html` |
| 1:05 | **Act 3 · Components** (27–32) — the card that can't tell (showcase step 3), container queries (live, two slots), the killer pattern, an important note (0px container, live), feature queries | 7 | | | |
| 1:12 | **Ex 4 · A card that knows its place** (33) — cases 1–2 | | 8 (7 + 1) | slot containers; the sidebar card at 700px; the 0px container | `exercises/04-know-your-place.html` |
| 1:20 | **Who are you asking?** (34) + the cliffhanger: who reads the form? (35) | 2 | | | |
| 1:22 | **Break** (36) — mystery: change any site's h1 in the console | | | | |
| 1:37 | **Part 2 opener** (37–39) — boot screen, find · listen · change, JS crib | 3 | | | |
| 1:40 | **Act 4 · Find it, change it** (40–46) — DOM lab (type along, then on a real site), querySelector / All / null / closest, textContent vs innerHTML (XSS), classList / attributes / dataset / setProperty, createElement / append, quiz: `defer` | 13 | | type along in DevTools | `playgrounds/dom-lab.html` |
| 1:53 | **Ex 5 · Night Shift** (47) — messages 1–3, then 4–5 if they can (fast students: 6–8) | | 9 (7 + 2) | the DOM game | `playgrounds/night-shift.html` |
| 2:02 | **Act 5 · Listen** (48–54) — addEventListener anatomy in four steps (who, what, the callback, the event object), [event monitor (50): skip by default], bubbling (event lab, predict first; stopPropagation only mentioned), delegation (30 seconds: case 3's debrief teaches it properly), the phone menu: the smallest whole loop, debugging in one slide (+ the `hidden` trap) | 10 | | | `playgrounds/events.html` |
| 2:12 | **Ex 6 · Wire it up** (55) — cases 1–2 solo, case 3 tried solo, then live-coded together in a 5-minute debrief | | 19 (14 + 5) | menu, ♡ save, filter with one listener | `exercises/06-wire-it-up.html` |
| 2:31 | **Act 6 · The conversation** (56–60) — the form's default action, submit vs click (validation order), FormData (live, predict typeof), let HTML validate + `:user-invalid` + the `input` counter, showing the answer: the cliffhanger answered | 7 | | | |
| 2:38 | **Ex 7 · Tickets, please** (61) — cases 1–3 | | 13 (11 + 2) | preventDefault, the ticket, the counter | `exercises/07-tickets-please.html` |
| 2:51 | **Finale** (62–65) — the page is a conversation, exit ticket, homework, the booked ticket on the phone | 5 | | | |
| 2:56 | *4 minutes of buffer* | | | | |

**Decision point at 0:31** (start of Act 2): if Act 1 + Ex 1 ran over,
apply cut #1 (slide 25) right away instead of hoping to catch up later.

Homework is split: **Part 1 (responsive.css) for tomorrow**, **Part 2
(market.js, Night Shift 6–16) by the next JS lecture**.

If you run late, cut in this order: the fluid design slide (25: say "a page
with zero breakpoints" and move on), the crib (39: point at it, it's on the
cheat sheet), the killer-pattern slide (30: Exercise 4 teaches it), the feature-queries
slide (32: one sentence, "@supports asks the browser"). The
event monitor (50) is already skipped by default; show it only if ahead. Never cut an
exercise below 2/3 of its time, and never cut the debriefs of Ex 6 and Ex 7.

Note for future edits: like Lectures 2 and 3, this deck deliberately does
**not** follow `harbour/CLAUDE.md` (own engine in `assets/`, per-deck styles,
live JS components). That was the brief — don't "fix" it back.

## Pre-class checklist

1. Rehearse the live slides on the projector: 8 (presets 📱 ▭ 🖥, then delete
   the query to make the 🦝 appear), 12 (DevTools → Rendering →
   prefers-color-scheme: dark), 16, 20, 24, 25, 29 (two slots: press 1000
   then 1300), 31, 41 (DOM lab presets), 51 (ask for a prediction first),
   53 (click Menu inside the phone), 58 (predict typeof, then press Reserve).
   `Esc` leaves an editor so the arrows work again.
2. Slide 41: also have the showcase open in a second tab to change its h1 in
   the real DevTools console.
3. Play Night Shift 1–8 once. Know level 3 (the badge must be found inside
   the churros card: the check puts another sold-out stall first) and 7
   (created but never appended; `innerHTML +=` fails because it rebuilds
   the other cards).
4. Test the JS exercises in your browser: a `while(true)` in a live editor
   freezes the tab (same thread). If someone does it, reload the page.
5. The day before: send "git pull + copy the starter out of the repo".
6. Check slide 32's claim against your browser: scroll-driven animations
   (`animation-timeline`) are in Chrome and Safari 26, not yet in Firefox.

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

**Ex 2 · Scrollburglars.** `.banner { width: auto }` ·
`.poster { max-width: 100%; height: auto }` · `.link { overflow-wrap: anywhere }` ·
`minmax(min(22rem, 100%), 1fr)` · `.ticker { overflow-x: auto }` ·
`.promo { overflow: clip }` (clip, not hidden: no scroll container).

**Ex 3 · Fluid market.** 1 `clamp(2.5rem, 1.13rem + 6.087vw, 6rem)`.
2 `--gutter: clamp(1rem, 0.22rem + 3.48vw, 3rem)` for padding-inline and gap.
3 `main { width: min(100% - 2rem, 40rem); margin-inline: auto }`.
4 `.hero { min-height: calc(100svh - 4rem) }`.
5 `--hue` per category, colours built with `hsl(var(--hue) 80% 65%)`.

**Ex 4 · A card that knows its place.** 1 `.slot { container-type: inline-size }`,
`@container (width >= 26rem) { .card { display: grid; grid-template-columns: 10rem 1fr; gap: 1rem } .pic { margin: 0 } }`.
At 700px both cards go wide (one column layout); at 1200 only the main one.
2 `.stamp-slot { display: block }` (or give it a width): size containment
makes a shrink-to-fit container collapse to 0.
3 `.card h3 { font-size: clamp(1.1rem, 0.6rem + 4cqi, 2.2rem) }` (a rem part: the check requires it).
4 `@supports selector(:has(*)) { .vendor-card:has(.badge) { border-color: #ff6b4a } }`.

**Ex 5 · Night Shift.** Every level has 💡 and 🏳 buttons with an answer.
In class 1–5. Common: 1 any dash works, the date is what's checked;
3 the badge via `churros.querySelector(".badge")`, not `document`;
4 `querySelectorAll` + `for…of`; 7 build `span` + `h3`, `card.append(…)`,
then `list.append(card)`; 8 `card.remove()` in a loop.

**Ex 6 · Wire it up.** 1 toggle `aria-expanded` between the strings `"true"`/`"false"`.
2 loop over `.fav`, each listener flips its own `aria-pressed` and text.
3 one listener on `.filters`, `event.target.closest("button")`, set
`aria-pressed`, `card.hidden = tag !== "all" && card.dataset.tag !== tag`.
4 `document.addEventListener("keydown", e => { if (e.key === "Escape") … })`.
5 count `!card.hidden`, write `` `${shown} of ${cards.length} stalls` ``.
6 `document.documentElement.style.setProperty("--accent", button.dataset.color)`.

**Ex 7 · Tickets, please.** 1 `form.addEventListener("submit", e => { e.preventDefault(); console.log(form.elements.name.value) })`.
A click listener on the button fails the third check: it runs on an empty form.
2 FormData, `Number(data.get("guests"))`, `1 person` / `n people` (any separator), build with
createElement + textContent, `result.replaceChildren(ticket)`.
3 `message.addEventListener("input", …)`: `counter.textContent = `${message.maxLength - message.value.length} characters left``. The starter calls the output element `counter`, so copying slide 59's `const left = …` can't shadow it.
4 (bonus) `setCustomValidity(/\p{L}/u.test(v) ? "" : "A name needs at least one letter.")` on input.
5 replace the `innerHTML` template with createElement + textContent.

**Exit ticket.** 1 white: the query matches, but `.main-nav a` (0,1,1)
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
- Never fix a scrollburglar with `body { overflow-x: hidden }`.
- A container can't query itself and can't size from its content.
- `querySelector` returns `null` when nothing matches: the #1 error.
- Their words go in `textContent`; `innerHTML` is for your own HTML (XSS).
- JavaScript flips a class or an attribute; CSS draws it. `aria-expanded`
  is state *and* accessibility.
- Listen for `submit` on the form, never `click` on the button. Not because
  of Enter (Enter fires a click on the submit button too) but because the
  click comes *before* validation and the submit *after* it.
- Every form value is a string.
- `hidden` loses to any author `display`: `[hidden] { display: none !important }` (slide 54).
- "It doesn't work": red error → read the line · nothing happens → log first
  · it blinks → preventDefault (slide 54).

## Interpretation notes (syllabus → slides)

- *The Killer Pattern* is taught as "a wrapper is the container, the
  component inside queries it" (slide 30), with the showcase's
  `.stall` / `.vendor-card`.
- The cliffhanger is the **form**, not the menu: CSS can fold a menu
  (`<details>`, `popover`, `:has(:checked)`), and master's students will say
  so. The notes on slide 35 tell you to agree.
- *An Important Note* is the containment gotcha: a container can't query
  itself and can't take its size from its content (slide 31, Ex 4 case 2).
- *Fluid Calculator* is a real tool (`playgrounds/fluid.html`, slide 24).

## Files

```
slides.html                 the deck (p = presenter, m = menu, n = notes)
index.html                  hub for students
cheatsheet.html             one page, prints on A4 landscape
project/starter/            index.html (no viewport tag, on purpose), css/outfit.css,
                            css/layout.css (Lecture 3), css/responsive.css + js/market.js (tasks)
project/showcase/           same HTML, switcher 0–4: layout-l3 · layout (mobile first) ·
                            fluid · components · states + js/market.js
exercises/                  01 pocket check · 02 scrollburglars · 03 fluid market ·
                            04 know your place · 06 wire it up · 07 tickets, please
playgrounds/                night-shift (game, = Ex 5) · devices · fluid · dom-lab · events
assets/                     kit.css/js (components), deck.css/js (slide engine, wire theme)
images/                     hub screenshots
```
