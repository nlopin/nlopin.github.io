# Lecture 2 — CSS fundamentals · run sheet

Three hours, one 15-minute break. Theory and practice alternate roughly every
15 minutes. One running project — the **Harbour Night Market** page — ties it
all together: students see it dressed five ways in minute two and dress it
themselves in the last twenty.

Act 4 is built around a mystery: **the stubborn button**. It opens the act,
right after the break, when students can already read selectors (Act 3). Both
rules are on screen — `#tickets a` (blue, line 12) and Marta's later
`.ticket-button` (tomato) — so the puzzle is fair: everyone has the
information, nobody has the rule yet. The act is the investigation; the id
wins on specificity. The break slide teases it ("Marta found a bug").

## Before class

- Serve the repo locally (`npx live-server` or any static server). Presenter
  view and the live editors need `http://`, not `file://`.
- Open `slides.html`, press `p` for the presenter window, drag it to your
  laptop screen. The main window goes on the projector (`f` for fullscreen).
- Students need: a code editor, a browser, and the exercises repo
  (github.com/nlopin/programming-interactivity-exercises, folder
  `02-css-fundamentals`). Everything else runs in the browser.
- Chrome: check the fonts load (Bricolage Grotesque, Instrument Serif). The
  deck falls back to system fonts offline.

## Timeline

55 slides. Blocks: 6 + 22 + 14 + 33 + 30 + 30 + 19 = 154 minutes of teaching
+ 15 break = 169, leaving 11 minutes of buffer. The makeover's 15 minutes are
on the clock. Deliberately
homework, not class: Arena levels 7–15, Ex 4 rounds 4–6, the units playground,
the specificity calculator and duel.

| Clock | Part | Students do | Materials |
| --- | --- | --- | --- |
| 0:00 | **Prologue** (5 slides, 6′) — five outfits, the brief, the map | Guess how many HTML files | `project/showcase/` |
| 0:06 | **Act 1 · Plug it in** (7, 22′) — browser defaults, three ways, paths, DevTools (2′ projected), spot the crime (quick pass) | **Ex 1** get the repo, link `css/style.css` (10′) | github.com/nlopin/programming-interactivity-exercises → `02-css-fundamentals/` |
| 0:28 | **Act 2 · Speak CSS** (4, 14′) — anatomy + grammar, silent failure | **Ex 2** bug hunt (7′ + 2′ debrief) | `exercises/02-bug-hunt.html` |
| 0:42 | **Act 3 · Point at things** (10, 33′) — tester, basics, the expensive space → **Ex 3a**, then combinators, `:hover`/`:focus-visible`/`:nth-child`, `:not()`/`:has()`, `::before`/`::after` → **Ex 3b** | **Ex 3a** Arena 1–6 (6′ + 1′) at ≈0:55, **3b** live-checked selectors, tasks 1–6 core (8′ + 2′) | `playgrounds/selector-arena.html`, `exercises/03-market-selectors.html` |
| 1:15 | **Break** — 15-minute timer on the slide | | |
| 1:30 | **Act 4 · Settle the fight** (11, 30′) — the stubborn button (bets), order, tournament, specificity + scoring strip, **verdict**, fixes, inheritance | **Ex 4a** rounds 1–2 (4′ + 1′), **Ex 4b** round 3 (4′ + 2′) | `exercises/04-win-the-fight.html` |
| 2:00 | **Act 5 · The toolbox** (12, 30′) — Marta's four complaints in order: contrast, type & units, boxes, custom properties; then draw the brief | **Box your cards** (3′), brief (2′), **Ex 5a** three decisions for the brief (8′) | `playgrounds/color.html` (pair checker) |
| 2:30 | **Finale · Dress the market** (5, 19′) — makeover 15′, exit ticket + homework 4′ | **Ex 5b** makeover = the reply to Marta | `exercises/05-dress-the-market.html` |
| 2:49 | *buffer 11′* | | |

Presenter view (`p`) shows minutes left in the current part. Deeper material
lives in speaker notes: the round-1 origins ladder and `@layer` (notes on the
tournament), `:is()`/`:not()` scoring (notes on the specificity score), em
compounding (notes on the units table), oklch (notes on colour). If you run
late, cut in this order: the typography demo
(show one change), the block-vs-inline demo (say it, don't type it). Never cut
the makeover below 12 minutes.

Note for future edits: this deck deliberately does **not** follow
`harbour/CLAUDE.md` (own engine in `assets/`, per-deck styles, live JS
components). That was the brief for this lecture — don't "fix" it back.

## Answer keys

**Ex 1b — five crimes.** A: no `rel`. B: `href="style.css"` — file is in
`css/` (404). C: `<style src>` doesn't exist. D: `<style>` tags pasted into the
.css file — first rule dies, the rest works (page not yellow but says
"connected"). E: `Style.css` vs `style.css` — works on macOS, breaks on Linux
hosting.

**Ex 2 — bug hunt.** 1 missing `;` after `papayawhip` (also kills `border`),
2 `border-radius: 16` needs a unit, 3 `colour` → `color`, 4 `-0.02 em` → no
space, 5 `padding: 4px, 10px` → no comma, 6 `upper-case` → `uppercase`,
7 `.card:hovr` kills the whole paragraph rule.

**Ex 3b — market selectors.**

```css
.main-nav ul { list-style: none; }
.main-nav a { text-decoration: none; }
.main-nav a::before { content: "→ "; }
.featured h3 { color: tomato; }
.sold-out { opacity: 0.5; }
.vendor-card:has(.badge) { border: 2px dashed; }
.schedule tbody tr:nth-child(even) { background: #f4efe6; }
.schedule th { text-transform: uppercase; }
[type="email"]:focus-visible { outline: 3px solid tomato; }
```

**Ex 4 — win the fight.** 1 `.hero h1 { color: tomato }` (tie → later wins).
2 `#promo p` or `#promo .lead` (only an id beats an id). 3 `.card p` (direct
beats inherited). 4 `a { color: tomato }` (`:where()` is zero). 5 add
`!important` to the starting line (only `!important` beats inline).
6 `.button { background: tomato }` (unlayered beats layered).

**Ex 5a — prep.** The skeleton is commented out at the top of the starter's
style.css. Their decisions: a palette whose pairs pass 4.5 : 1 (pair checker
in `playgrounds/color.html`), a font stack and rem sizes, a `ch` measure.

**Stubborn button fixes.** Bad: `!important`, `#tickets .ticket-button`.
Good: change line 12's selector from `#tickets a` to `.ticket-button` — it now
matches only the button at (0,1,0), and Marta's later rule wins on order.
Advanced variant: `:where(#tickets) a` zeroes the id's weight.
Epilogue: white on `tomato` is 2.95 : 1 and fails even for large text; the
contrast slide calls it back and fixes it with dark text (6.2 : 1).

**Exit ticket.** `.nav li:first-child > a::before` = (0,2,3) · blue (`.page .card` targets the card; the h3 only inherits red) · 244px (`border: 2px solid`; without `solid` the width computes to 0 → 240px).

## Talking points worth not skipping

- Specificity only compares rules that match the *same* element — inherited
  values have no specificity. (Exit ticket Q2 checks this.)
- `:focus-visible` and never removing outlines without a replacement — ties
  back to the keyboard exercise in Lecture 1.
- `rem` for text respects the reader's font-size setting; page zoom scales px
  too, the setting doesn't.
- Contrast 4.5 : 1 — white on `tomato` is 2.95 : 1: fails everything, including Marta's button.
- Block vs inline — `width` and vertical margins do nothing on `<a>`/`<span>`; the #1 makeover bug.

## Files

```
slides.html                 the deck (p = presenter, m = menu, n = notes)
index.html                  hub for students: every link in one place
cheatsheet.html             one-page summary, prints on A4 landscape
project/starter/            the Night Market HTML + empty css/style.css (also starter.zip)
project/showcase/           same HTML + swiss / brutal / neon / zine themes
exercises/                  01 broken links · 02 bug hunt · 03 selectors · 04 cascade · 05 makeover (5a lives in the starter)
playgrounds/                selector arena · selector tester · nth-child · specificity · colour · box model · units
assets/                     kit.css/js (components), deck.css/js (slide engine)
images/                     screenshots of the five outfits
```
