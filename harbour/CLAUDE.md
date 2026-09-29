# Slide decks

Instructions for working on lecture slide decks in `lessons/`.

## Layout

```
lessons/
  assets/slides.css      shared theme — every deck links it
  assets/slides.js       shared navigation — every deck links it
  _template/slides.html  starting point for a new deck
  <lesson-name>/
    slides.html          the deck
    index.html           the written lesson notes
    images/              every image used by that deck
```

A deck is one static `slides.html`: no build step, no framework, no
dependencies. Each `<section class="slide">` is one slide. Open the file in a
browser and it works.

## Writing a deck

Start from `_template/slides.html`. Copy it into `lessons/<lesson-name>/` and
replace the content. Keep the `<head>`, the `.deck-progress` / `.deck-counter`
divs, the `<main class="deck">` wrapper, and the `<script>` tag as they are.

Keep it simple and minimal:

- **Text and code only.** Plain prose, short lists, `<pre>` blocks. No
  animations, no transitions, no decoration that doesn't carry meaning.
- **Few words per slide.** A kicker, a heading, and either one short paragraph
  or a list of up to ~6 items. If a slide needs more, split it.
- **No inline `style` attributes and no per-deck `<style>` block.** Use the
  classes in `assets/slides.css`. A pattern needed by more than one deck goes
  into `assets/slides.css`; a pattern needed by one deck is a sign the slide is
  too elaborate.
- **No JavaScript in a deck.** Navigation lives in `assets/slides.js`.

## Arrange slide content vertically

Prefer stacking content top to bottom in the slide's normal flow — a heading
followed by a paragraph or a list. Vertical content reads in one pass, scales
down to a phone unchanged, and stays legible in overview mode (`o`).

Use a horizontal split (`.cols`, `.stat-grid`, `.logo-row`) only when the
content is genuinely parallel and the comparison is the point — two options
side by side, a row of figures. Never use it to fit more onto one slide;
split the slide instead.

## Images

Every image a deck uses lives in that lesson's own `images/` directory and is
referenced relatively:

```html
<img src="images/stripe.svg" alt="Stripe">
```

No shared image directory, no absolute paths, no hotlinking to remote URLs — a
deck must render offline. Duplicate a file into a second lesson's `images/`
rather than reaching across directories. Every `<img>` gets an `alt`.

## Available classes

From `assets/slides.css`:

| Class | Use |
| --- | --- |
| `.slide` | one slide (required on every section) |
| `.slide.title` | title slide — left-aligned, larger |
| `.slide.center` | centered single-idea slide |
| `.kicker` | small uppercase label above the heading |
| `.muted` | secondary text on a `<p>` or `<li>` |
| `.byline` | muted line that hugs the heading above it |
| `.cols` | two equal columns |
| `.cols.cards` | two columns as bordered cards |
| `<pre>` inside a `.cols.cards` card | one-line code sample in a card — smaller type, never wraps |
| `.cols.media` | two columns, vertically centred — text beside an image |
| `<figure>` + `<figcaption>` (+ `.bare`) | framed image with a caption; `.bare` drops the frame |
| `pre.big` | enlarged code block — a short snippet that is the focus of the slide |
| `.big-link` | a URL as the content of the slide |
| `.stat-grid` + `.stat-card` + `.num` | row of figures |
| `.week-list` + `.week-row` + `.week-num` | labelled rows |
| `table.table` (`<th>` label + `<td>` value, one row per group) | grouped reference table — label column auto-aligns across rows |
| `.logo-row` + `.logo-chip` (+ `.current`) + `.logo-arrow` | logo sequence |
| `.timeline` > `.timeline-rows` (radio + `label` with `.year`) + `.timeline-detail` (one `div` per row) | clickable vertical timeline, detail on the right; max 8 rows |
| `<kbd>` | a keyboard key drawn as a keycap — `<kbd>Enter</kbd>` |
| `<mark>` inside a `<pre>` | highlight part of a code block — "what is this part called?" |
| `<details data-no-nav>` + `<summary>` | click-to-reveal answer under a question or prediction |

`_template/slides.html` is a gallery with one slide per pattern above — copy the
directory, delete the slides you don't need, and replace the text.

Type sizes are `clamp()`-based and already responsive. Don't set font sizes.

## Navigation (from `assets/slides.js`)

Arrows / space / page keys move between slides, `Home` / `End` jump to the
ends, `f` toggles fullscreen, `o` toggles the overview grid, clicking within 100px of the left edge goes
back and within 100px of the right edge goes forward. Clicks anywhere else do
nothing. The slide number is
kept in the URL hash, so `slides.html#7` opens on slide 7.

Interactive elements inside a slide need `data-no-nav` (or to be an `a`,
`button`, `input`, `textarea`, `select`, `label` or `iframe`) so a click on
them doesn't advance the deck.

## Checking a deck

Open `lessons/<lesson-name>/slides.html` in a browser, press `o`, and check
that no slide overflows its thumbnail. An overflowing slide has too much on it.

## Running a local server

When a server is needed, check `localhost:8731` first and reuse it if it
answers. If it doesn't, start one:

```
pnpx live-server --port=8731 --no-browser
```

Don't start a server on any other port.
