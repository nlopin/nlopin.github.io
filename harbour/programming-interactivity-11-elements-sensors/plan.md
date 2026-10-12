# Lecture 11 · "Tags that listen" · plan

Teacher-facing structure. Not student-facing. The original plan: the deck
(`slides.html`), the demo (`demos/green-room/`), the exercise and the jam are
built, and `run-sheet.md` is the guide for class. Where this file differs from
them, they win.

Two halves: write your own HTML element, then give it senses. The first half
teaches custom elements and shadow DOM; the second is the Web API jam (sound,
camera, voice, pointer, devices), where every group ships its toy as a custom
element. The close: each group demos its tag over Zoom.

**Assumes:** Lecture 5 (`render(state)`, modules), Lecture 4 (events,
delegation, FormData), Lecture 2 (forms, focus). Lecture 10's import maps for
the Lit aside.

**Running example:** a video call's green room (camera preview, mic level,
device picker, Join). Act 1 builds its tags on fake data, Act 2 plugs them
into the real camera and microphone. Ex 1 is the post-call rating form.
GitHub's `<relative-time>` opens and closes the class. Scene-by-scene story
in `plot.md`; where this file and `plot.md` differ, `plot.md` wins.

## The story in one paragraph

HTML has a fixed vocabulary, but `customElements.define` lets a page add
words to it. A custom element is a class the parser instantiates whenever it
meets the tag: it has a lifecycle, it is configured through attributes and
properties, it reports through events, and with shadow DOM it keeps its markup
and styles to itself. With `ElementInternals` it takes part in a `<form>` like
a native `<input>`. That's Lecture 5's `render(state)` packaged behind a tag
name. Then the tags get senses: the browser exposes audio, camera, speech,
pointers and devices behind a permission model. Each group builds one sensing
toy, as a tag with attributes and events, and demos it from its own laptop.

## Timing · 3 hours

| Min | Block |
| --- | --- |
| 5 | Opening |
| 35 | Act 1 · Your own element |
| 20 | Ex 1 · `<star-rating>` in the post-call form |
| 25 | Act 2 · Plug in the world (live green room, four gates) |
| 15 | Break |
| 45 | Jam · one sensing tag per group |
| 25 | Show & tell over Zoom |
| 5 | Close |

## Opening · 5 min

- **Hook:** view source on github.com: `<relative-time datetime="…">`,
  `<tool-tip>`, `<details-menu>`. Unknown tags, working page. What makes a
  tag "real"?
- **Thesis:** an element is a class with a tag name. You can register your
  own.

## Act 1 · Your own element · 35 min

1. **Unknown tags are legal** · `<foo-bar>` parses as `HTMLElement`
   (with a hyphen) vs `HTMLUnknownElement` (without). The hyphen rule is
   why custom names never collide with future HTML.
2. **Define** · `class StarRating extends HTMLElement`,
   `customElements.define('star-rating', StarRating)`. Upgrade: tags parsed
   before the definition become instances once it arrives. `:defined`,
   `customElements.whenDefined()`.
3. **Lifecycle** · `constructor`, `connectedCallback`,
   `disconnectedCallback`, `attributeChangedCallback` +
   `static observedAttributes`, `adoptedCallback`. What not to do in the
   constructor (read attributes, add children). Cleanup in
   `disconnectedCallback` (listeners on `window`, timers, streams).
4. **Attributes vs properties** · attributes are strings in markup,
   properties are typed values on the object. Reflection: a `value`
   getter/setter backed by the attribute. Boolean attributes.
5. **State in, events out** · attributes and properties go in,
   `CustomEvent` comes out (`detail`, `bubbles`, `composed`). The parent
   doesn't reach inside.
6. **Render inside** · the element owns a subtree; `render()` from its own
   state, Lecture 5's loop at a smaller scale.
7. **Shadow DOM** · `attachShadow({ mode: 'open' })`, encapsulated markup
   and styles. Demo: page CSS `button { … }` doesn't leak in, the element's
   CSS doesn't leak out.
8. **Styling across the boundary** · `:host`, `:host([disabled])`,
   `::slotted()`, `::part()` + `part="…"`, custom properties inherit
   through. A theming API is a list of parts and variables.
9. **Slots** · light DOM children projected into `<slot>`, named slots.
   Content stays the page's (searchable, styleable, accessible).
10. **Declarative shadow DOM** · `<template shadowrootmode="open">`: shadow
    roots without JavaScript, server-rendered.
11. **Events across the shadow boundary** · retargeting: `event.target` is
    the host outside; `composed: true` to escape; `event.composedPath()`.
12. **Form-associated elements** · `static formAssociated = true`,
    `attachInternals()`, `setFormValue`, `setValidity`, `formResetCallback`.
    The element appears in `FormData` and blocks submit when invalid.
13. **Accessibility** · `internals.role`, `ariaLabel` via internals, focus
    with `tabindex` / `delegatesFocus`, keyboard handling is still yours.
    Trap: `aria-labelledby` can't point across a shadow root.
14. **Custom states** · `internals.states.add('checked')`, styled with
    `:state(checked)`.
15. **Who uses this** · GitHub (`<relative-time>`), YouTube, Photoshop on
    the web, Firefox's own UI. Lit as the thin layer over the same API
    (reactive properties, templates), loaded from a CDN with an import map.
16. **Quiz · when not to** · a layout wrapper, a one-off section,
    something that needs SEO-critical text inside a closed shadow root.
    Answers in `<details>`.

### Ex 1 · `<star-rating>` in a form · 20 min

The post-call screen: "How was the call quality?", a form with a plain
`<input type="number">`. Replace it with
`<star-rating name="quality" max="5" required>`.

Done means:

- `new FormData(form).get('quality')` returns the value
- `required` blocks submit with nothing selected; reset clears it
- arrow keys change the value, Tab reaches it once
- the page styles the stars through `::part(star)` or a custom property
- a `change` event bubbles out of the element

Stretch: `readonly` attribute; half stars; declarative shadow DOM for the
initial render.

Material to build: `exercises/01-star-rating/` (starter form, checks in the
brief), solution in `private/`.

## Act 2 · The browser's senses · 25 min

1. **The browser is a sensor platform** · audio in and out, camera, speech,
   pointer pressure and tilt, gamepads, device motion, files, clipboard,
   screen.
2. **Secure contexts** · `localhost` and HTTPS only; a phone on
   `http://192.168…` gets nothing.
3. **The permission model** · prompt, grant, block; Block is final for the
   page; ask in context, not on load; `navigator.permissions.query` to pick
   the screen; one-time grants; revocation mid-use (`change`, track `ended`).
4. **User activation** · `navigator.userActivation`; required for audio,
   fullscreen, clipboard writes, EyeDropper.
5. **Permissions Policy** · an `<iframe>` needs `allow="camera; microphone"`;
   the `Permissions-Policy` header turns features off for your own page.
6. **Four gates** · secure context → policy → activation → permission; the
   table of which jam API needs which (plot Scene 18).
7. **Streams and loops** · `MediaStream` → `<video>` or canvas; Gamepad and
   `AnalyserNode` are polled in `requestAnimationFrame`, not events.
8. **A sensor as a tag** · the jam contract (below), shown on one finished
   example.

## Jam · one sensing tag per group · 45 min

Briefs from `course-notes.md` (Web API jam), with one constraint added: the
toy is a custom element in its own module.

The tag contract, the same for every group:

- one file, `<tag-name>.js`, that defines one element
- configured by at least two attributes
- reports what it senses as at least one `CustomEvent` with a `detail`
- reads the permission state first, asks only after the user asks for
  the feature
- starts only after a user gesture, stops in `disconnectedCallback`
  (tracks, `AudioContext`, rAF)
- handles a blocked permission with visible content that says how to undo it
- reacts to the permission being revoked while running

| Group | Tag | APIs |
| --- | --- | --- |
| 1 | `<theremin-pad>` ★☆☆ | Web Audio, Pointer Events, canvas |
| 2 | `<colour-thief>` ★★☆ | EyeDropper, Clipboard, `localStorage` |
| 3 | `<photo-booth>` ★★☆ | `getUserMedia`, canvas, download |
| 4 | `<voice-command>` ★★☆ | SpeechRecognition, SpeechSynthesis |
| 5 | `<gamepad-car>` ★★★ (or `<clap-switch>` ★★☆) | Gamepad, rAF / microphone, `AnalyserNode` |
| 6 | `<window-pong>` ★★★ | BroadcastChannel, rAF |

Format as in `course-notes.md`: 0–5 plan, 5–15 the API works (raw data on
screen), 15–35 the toy, 35–42 verify (block the permission, reload, reset it from the address
bar, revoke it while running, remove
the element from the DOM in the console), 42–45 rehearse.

Minute 15 checkpoint: the tag renders and logs raw sensor data.

## Show & tell · 25 min

- 6 groups × 3 min, each from its own laptop, sharing its screen in Zoom.
  Nothing handed in.

## Close · 5 min

- **Three questions:** what does the element expose (attributes, properties,
  events, parts)? What does it clean up? What happens when the user says no?
- **Homework (optional):** use your tag in a second page without changing
  its file.

## Materials to build

- `slides.html` (59 slides)
- `demos/green-room/` — the green room in stages, one file per scene that
  changes code (wish markup, defined meter, shadow DOM, form-associated
  picker, live mic, live camera, the camera-light bug, the fix), so the live
  coding can jump to a known-good state
- `exercises/01-star-rating/` + brief + zip
- `jam/` — six briefs + two spares, lean L4 format, adapted to the tag
  contract
- `private/` — star-rating solution
- `index.html` lesson notes, cheatsheet, run sheet

## Traps to plan for

- Constructor reads attributes → empty on `createElement`; read in
  `connectedCallback` or `attributeChangedCallback`.
- `define` called twice (module loaded twice, hot reload) →
  `NotSupportedError`. Guard with `customElements.get`.
- Listeners added in `connectedCallback` and never removed: moving the
  element in the DOM doubles them.
- Shadow DOM hides the element from page CSS and from `document.querySelector`.
  Students debug by searching the light DOM.
- Form-associated: forgetting `setFormValue` → the field is silently
  missing from `FormData`.
- Every jam trap from `course-notes.md` (secure context, autoplay policy,
  Gamepad polling, SpeechRecognition needs Chrome + internet, EyeDropper is
  Chromium-only).

## Open questions

- Gamepads available in class? Decides group 5.
- Customized built-ins (`is="…"`): mention as Safari-unsupported, or skip?
- Lit: one slide, or a stretch in Ex 1?
