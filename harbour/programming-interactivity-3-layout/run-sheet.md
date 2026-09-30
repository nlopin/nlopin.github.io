# Lecture 3 — Layout · run sheet

Three hours, one 15-minute break. Pitched at **master's students**: the basics go fast and the time goes into the
mechanics underneath (intrinsic sizing, formatting contexts, the full
containing-block rule, stacking contexts, the flex algorithm with numbers, grid
track sizing, subgrid). About half theory, half practice: 89 minutes of
teaching, 76 minutes of students typing. The Harbour Night Market page from Lecture 2 continues: it has an outfit, but it
looks like a receipt. Its three problems are the three new acts.

## The story in one paragraph

Every box on a page is placed by **one layout algorithm**. Students already know
one without having a name for it: **normal flow** (Act 1, the recap). Flow can't
say "put this there", so we meet three more: **position** (Act 2, pin it),
**flexbox** (Act 3, line them up), **grid** (Act 4, draw the floor plan). One
question comes back in every act — **"who decides the width?"** — and the
answers are collected in the synthesis table at the end: flow = the parent,
absolute = the content, flex = content then grow/shrink, grid = the track. Two
payoffs from Lecture 2: the "layout magic" line gets decoded in Act 4, and the
`margin-inline: auto` from Act 1 comes back in Act 3 as the flex push trick.

The showcase page (`project/showcase/`, keys 0–4) is the progress bar of the
day: Acts 2, 3 and 4 open with it at their step, "here's where this act is going".

## Before class

- Serve the folder (`npx live-server`). Presenter view and live editors need
  `http://`, not `file://`.
- `p` opens presenter view (notes, next slide, per-act clock). Main window on
  the projector (`f` fullscreen).
- Students need: editor, browser, the exercises repo
  (github.com/nlopin/programming-interactivity-exercises → `03-layout/`).
  Ask them to `git pull` before class; slide 2 asks again, so nobody
  is still downloading when Exercise 1 starts.
- For the finale, students **copy** `project/starter/` out of the repo into
  their own folder (or unzip `starter.zip`). Editing inside the clone makes
  the next `git pull` conflict. The Ex 5 slide and page both say so.
- Optional: students bring last time's `style.css` to swap in for
  `css/outfit.css`.

## Timeline

64 slides. Theory (T) and practice (P) minutes per part. The sum is honest:
T 91 + P 76 + break 15 = 182: **2 minutes over**. Drop at least one item of
the cut order below before class; "Watch the magic line" is the safe default. Deeper slides
carry "Deeper" in their kicker; their notes have spec pointers for questions.

| Clock | Part | T | P | Students do | Materials |
| --- | --- | --- | --- | --- | --- |
| 0:00 | **Prologue** (4 slides) — nice, but a receipt: three problems, the receipt (showcase 0 → 4 → 0), four ways to place a box | 5 | | `git pull` the repo now | `project/showcase/` |
| 0:05 | **Act 1 · Flow** (8 + bridge) — layout duel (cascade), how wide / how tall, *width flows down, height grows up*, **intrinsic sizes** (min/max/fit-content), **min-/max- limits** (live, with `clamp()`), auto margins, box-model traps (+ BFC, as theory) | 18 | 12 | **Ex 1** Flow detective, cases 1–4 (10′ + 2′) | `exercises/01-flow-detective.html` |
| 0:35 | **Act 2 · Pin it** (16) — goal, five values, **one slide per value** with a live example (static, relative, the flying-stamp bet → absolute, fixed, sticky), Position lab (all five together + **transform traps fixed**), **z-index in three steps** (paint order → `z-index` → stacking contexts), the containing block precisely, absolute width, **stacking contexts** (9999 loses to 10) | 22 | 14 | **Ex 2** Pin it, core 1–3 + 5, bonus 4 + 6 (12′ + 2′) | `exercises/02-pin-it.html`, `playgrounds/position.html` |
| 1:11 | **Break** — between position and flexbox. Teaser mystery: why does `margin-top: auto` work in flex but not in flow? | | | | |
| 1:26 | **Act 3 · Line them up** (13, uninterrupted) — goal, one line on the parent, two axes, Flex lab, the axis trap | 9 | 10 | **Ex 3a** Stall Setter flex 1–8 (8′ + 2′) | `playgrounds/stall-setter.html?set=flex` |
| 1:45 | **Act 3, continued** — the wobbly links, **flex tricks** (shorthand, order & a11y; the mystery is solved on the wobbly-links slide), **the flex algorithm with numbers** (weighted shrink), **the automatic minimum** (`min-width: 0`), where flex ends, **go deeper: flexbox** (links, CSS-Tricks guide first) | 13 | 12 | **Ex 3b** Line them up, cases 1–3 + 6 (10′ + 2′) | `exercises/03-line-them-up.html` |
| 2:11 | **Act 4 · Draw the floor plan** (11) — goal, tracks & fr (+ **blowout**), decode the magic line (+ auto-fit vs auto-fill), watch it, lines not cells, the map in words, **subgrid**, who decides (grid, + the percentage-height payoff), flex or grid?, **go deeper: grid** (links, CSS-Tricks guide first) | 17.5 | 13 | **Ex 4** Floor plan, cases 1–4 (11′ + 2′) | `exercises/04-floor-plan.html`, `playgrounds/grid.html` |
| 2:41 | **Finale · Open the market** (7) — the build, *who decides?* synthesis, exit ticket, `@media` + `@container` preview (only if time), homework | 6.5 | 15 | **Ex 5** the recap: rebuild the lecture in layout.css, act by act, from memory; check against the showcase step. Acts 1–3 + the magic line in class | `exercises/05-open-the-market.html`, `project/starter/` |
| 3:02 | *2 minutes over — cut one item* | | | | |

If you run late, cut in this order: the @media preview (after the exit ticket;
the finale page explains it), the goal slides of Acts 3 and 4 (say one sentence instead), "Watch the magic line" (drag the width once on the decode slide instead). Never cut the finale
build below 12 minutes: it's where everything lands in their own project.

Note for future edits: like Lecture 2, this deck deliberately does **not**
follow `harbour/CLAUDE.md` (own engine in `assets/`, per-deck styles, live JS
components). That was the brief — don't "fix" it back.

## Pre-class checklist

1. Rehearse the live editors on the projector (slides 7, 9–10, 18–19, 21–24, 26–29, 34, 36, 39, 42–43, 48, 50–54, 62): `Esc` leaves an editor so the arrows work again; check the
   preview text is readable from the back row.
2. Try the goal slides (16, 33, 47): click inside, press 0–4, scroll. Know
   where the Churros stamp (4th card) and the map are. At step 2 the sticky
   header is tall on purpose — the menu is still a list; Act 3 fixes it.
3. The day before: send "git pull + copy the starter out of the repo". Keep
   `starter.zip` on a USB stick for broken clones.
4. Serve over `http://` (`npx live-server`) and test presenter view (`p`) on
   the real two-screen setup. Live editors and checks fail on `file://`.
5. Play Stall Setter flex 1–8 once. Know level 4 (`align-items`) and level 7
   (the axis trap) for walking around.
6. Keep the cut order on paper and use it: @media (62) → goal slides 33 and
   47 → "Watch the magic line" (50) → trim the Position lab (24) to one
   demo, since slides 18–23 cover each value. The finale build never
   drops below 12 minutes.
7. Check the "Deeper" demos in your browser version (slides 29 stacking, 42
   min-width, 53 subgrid): they rely on current engine behaviour.

## Tools built for this lecture

- **Live editor overlays** (`assets/kit.js`): `data-measure` (blue size labels),
  `data-grid` (DevTools-style grid lines, numbers, area names), `data-flex`
  (main/cross axis arrows), `data-resizable` (a window-width slider — makes
  `auto-fill` and `@media` visible), and a `solution` script that renders a
  hidden twin: the **◌ target** button draws its boxes as red chalk outlines,
  and `match` checks compare layout boxes (transforms ignored: a rotated stamp
  still passes, but positioning with `translate` doesn't count).
- **Flex lab** and **Position lab**: button-per-declaration labs. The position
  lab draws the containing block (yellow) and the relative "seat" (blue).
- **Stall Setter**: a layout game. Two stacked iframes: the chalk marks
  (rendered from the level's solution) and the student's CSS. Any CSS that
  lands every stall on its mark wins. 6 position + 13 flex + 10 grid + 6 "Deep cuts" levels (weighted shrink, grid
  blowout, auto-fit, dense, named lines, trapped fixed). In class, flex 1–8: `display`, `flex-end`,
  `space-between`, `align-items`, dead centre, column, the axis trap, `margin-left: auto`.
  Progress is kept in localStorage.

## Answer keys

**Ex 1 · Flow detective.**
1 `input { box-sizing: border-box }` (or the universal reset).
2 `main { max-width: 36rem; margin-inline: auto }`.
3 `.hero { min-height: 100vh }` — `height: 100%` is ignored because the parent's
height is `auto`. Also valid: `html, body { height: 100% }` (give the parents a
height, then 100% works) — worth mentioning as the other fix.
4 `.b { margin-top: 50px }` — margins collapse, the bigger one wins.
5 add `display: inline-block` to `.button`.
6 `main section .card { max-width: none }` (tie, later wins) — or two classes,
e.g. `.vendor-card.card` (0,2,0). Same fight as the warm-up slide.
7 `.tag { display: block; width: fit-content }` (`max-content` passes too).

**Ex 2 · Pin it.**
1 `.vendor-card { position: relative } .badge { position: absolute; top: -12px; right: 16px }`.
2 `.site-header { position: sticky; top: 0; z-index: 1 }` — the stamp is
positioned and later in the HTML, so it painted over the header.
3 `.market-map { position: relative } .you-are-here { position: absolute; left: 16px; bottom: 16px }`.
4 `.to-top { position: fixed; right: 24px; bottom: 24px }`.
5 `.vendor-card { position: relative; z-index: 11 }` — the card's transform makes
it a stacking context; lift the context, not the dropdown. `z-index: 10` also
wins (tie → later in the DOM).
6 `.shell { transform: none }` — a transformed ancestor is the containing block
of fixed descendants. In real projects: render overlays outside animated
wrappers, or use `<dialog>` (top layer).

**Ex 3b · Line them up.**
1 `.site-header { display: flex; justify-content: space-between; align-items: center } .main-nav ul { display: flex; gap: 1.5rem }`.
2 `.vendor-card { display: flex; flex-direction: column; align-items: flex-start } .card-link { margin-top: auto }`.
3 `.hero { display: flex; flex-direction: column; justify-content: center; align-items: flex-start }`.
4 `.site-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem }`.
5 `.subscribe { display: flex; gap: 0.5rem } .subscribe input { flex: 1 }`.
6 `.info { min-width: 0 }` — the flex item's automatic minimum is its
min-content, which a `nowrap` child makes the whole sentence. `overflow: hidden`
on `.info` also works (scroll containers have no automatic minimum).

**Ex 4 · Floor plan.**
1 `.vendor-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 1rem }`.
2 `.featured { grid-column: span 2 }`.
3 `grid-template-areas: "stage stage pier" "food table pier" "food crafts drinks" "gate gate gate"`.
4 `.vendor-card { display: grid; grid-row: span 4; grid-template-rows: subgrid }`.
5 `.ticket-form { display: grid; grid-template-columns: max-content 1fr; gap: 0.8rem 1.5rem; align-items: center } .ticket-form button { grid-column: 2; justify-self: start }`.
6 `.hero { display: grid } .photo, .caption { grid-area: 1 / 1 } .caption { align-self: end }`.

**Ex 5 · the finale = the recap.** Project work sits at the end on purpose: students rebuild each act from memory in their own page (retrieval practice), then check against the showcase step; the exercise pages are the fallback. The reference is `project/showcase/css/flow.css`,
`position.css`, `flex.css`, `grid.css` — one file per act, the same split as the
showcase switcher.

**Stall Setter.** Every level has 🏳 Show an answer. Level 3 of Position forbids
touching `.churros`: the fix is `.pier { position: relative }`.

**Exit ticket.** 1 it scrolls away with the card: a transformed ancestor is the
containing block of fixed descendants.
2 `justify-content` (in a column the main axis is vertical). 3 160 · 240 · 200 (overflow 150, shrink weighted by basis 200 : 300 : 250 →
−40, −60, −50).

## Talking points worth not skipping

- *Width flows down, height grows up.* It explains `height: 100%`, vertical
  centring, and why `min-height: 100vh` works.
- `position: relative` with no offsets doesn't move anything. Its real job is
  "measure from me".
- Flex only affects **direct children**. The most common flex bug is
  `display: flex` on the wrong element.
- `justify` = along the main axis, `align` = across. In a column they swap.
- `align-items: stretch` is why flex cards are the same height.
- Auto margins eat free space: in flow sideways only, in flex in every direction.
- Grid numbers are **lines**. An invalid `grid-template-areas` (uneven rows,
  L-shapes) fails silently — the whole declaration is dropped, and the named
  zones pile into one extra cell in the corner ("where did my map go?").
- `flex: 1` and `1fr` aren't equal when content is long: items won't shrink
  below their longest word. `min-width: 0` / `minmax(0, 1fr)`.
- Finale gotchas (all hinted in `layout.css`): outfit margins on cards/zones/
  labels fight `gap`; the form's checkbox label and button need
  `grid-column: 2`; `.featured` needs `grid-column: auto` on phones.

## Files

```
slides.html                 the deck (p = presenter, m = menu, n = notes)
index.html                  hub for students
cheatsheet.html             one page, prints on A4 landscape
project/starter/            Night Market v2: index.html, css/outfit.css, css/layout.css (+ starter.zip)
project/showcase/           same HTML, layout split per act, switcher 0–4
exercises/                  01 flow detective · 02 pin it · 03 line them up · 04 floor plan · 05 open the market
playgrounds/                stall-setter (game) · position · flex · grid
assets/                     kit.css/js (components), deck.css/js (slide engine)
images/                     showcase screenshots for the hub
```
