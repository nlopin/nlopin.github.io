# Lecture 11 · "Tags that listen" · plot

The class as one story, scene by scene. Teacher-facing. This file holds the
order of ideas and the reason each one appears when it does. The built deck
and `run-sheet.md` follow it; where details differ, they win.

## The running example

**A green room**: the screen every video-call app shows before you join.
Camera preview, a microphone level that moves when you speak, device
dropdowns, a Join button. Most people in the room have used one recently, and it
contains exactly the widgets HTML doesn't have: a live level meter, a camera
preview with a "blocked" state, a device picker that belongs in a form.

The first half builds those widgets as custom elements, fed by fake values
from the console. The second half plugs them into the real microphone and
camera. The widgets don't change when the data becomes real. That's the
point of the first half.

## Cold open · "Someone is listening to an attribute"

Open a GitHub repository page, DevTools, Elements. Next to a commit:
`<relative-time datetime="2026-10-09T14:12:00Z">2 days ago</relative-time>`.
Not an HTML tag. Edit the `datetime` attribute in the Elements panel to
yesterday: the text changes to "yesterday" on its own.

No framework re-rendered the page. Something attached to this one tag
noticed the attribute change and updated its own text. The question for
the next hour: what is attached to it, and how do you write one?

## Act 1 · Write the HTML you wish existed

### Scene 1 · The wish

The brief: a green room. Before writing any JavaScript, write the markup you
would write if HTML had the widgets:

```html
<form action="/join">
  <camera-preview mirrored></camera-preview>
  <level-meter></level-meter>
  <device-picker kind="audioinput" name="mic" required></device-picker>
  <button>Join</button>
</form>
```

Open it. A Join button and nothing else. No error either.

### Scene 2 · Unknown, but not wrong

In the console: `level-meter` is an `HTMLElement`. Rename it to `levelmeter`
and it becomes an `HTMLUnknownElement`. The hyphen is the whole rule: names
with a hyphen are reserved for authors, so no future HTML element can collide
with yours. The parser already accepts the tag. It has no behaviour yet.

### Scene 3 · A class with a tag name

`class LevelMeter extends HTMLElement`, `customElements.define('level-meter',
LevelMeter)`. In `connectedCallback`, render ten bars. They appear.

Move the `<script>` below the markup, then above it: it works both ways. The
tag sat in the DOM as a plain `HTMLElement` until the definition arrived,
then got **upgraded**. `:not(:defined)` hides the half-second before that;
`customElements.whenDefined()` waits for it in code.

Then the lifecycle: `constructor` (no attributes or children yet),
`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`.
`disconnectedCallback` gets one line now and becomes important in Act 2.

### Scene 4 · Make it move

`<level-meter value="0.3">`. Add `static observedAttributes = ['value']`;
`attributeChangedCallback` re-renders. In the console,
`meter.setAttribute('value', 0.8)` and the bars jump.

Then `meter.value = 0.8`. Nothing happens. The attribute is a string in the
markup; the property is a field on the object, and nothing connects them.
A getter and setter fix it. Like `<input>`, the setter doesn't write the
attribute back: the attribute is the starting value, the property the current
one.

Then the question that matters for later: in Act 2 the value arrives 60
times a second. Attribute or property? A property: no string conversion, no
DOM mutation. Attributes configure the element; properties carry data;
events report back. The relative-time tag from the cold open used the
attribute because a person or a server writes it once.

### Scene 5 · The page breaks it

Drop the meter into the call app. The app's top bar is `.bar`; the meter's
bars are `.bar` too, styled by the meter's own stylesheet. Both rules apply to
both: the header shrinks to 8 px and turns grey, the bars get the header's
padding.

This is the problem shadow DOM solves. `attachShadow({ mode: 'open' })`, the
same markup and styles inside the shadow root: neither side sees the other's
selectors.

Second problem: the app has a dark theme and can't recolour the bars, because
its selectors no longer reach them. The element needs a styling API:
custom properties (`--meter-color`), which inherit through the boundary, and
`part="bar"` for `::part(bar)`. Inherited properties like `color` and `font`
cross into the shadow root; selectors don't.

### Scene 6 · Content that belongs to the page

`<camera-preview>` needs a message for when the camera is blocked, and
the message is the app's text, not the component's: it's translated, and
written in the app's voice:

```html
<camera-preview mirrored>
  <p slot="blocked">Camera is off. Allow it in the address bar.</p>
</camera-preview>
```

Slots: light-DOM children projected into the shadow root. The paragraph stays
in the page's DOM, styled by the page, found by `Ctrl+F`. `::slotted()` for
the little styling the element applies. The `mirrored` boolean attribute is
the second attribute example: presence means true, `toggleAttribute` reflects
it.

Same scene, declarative shadow DOM in one slide: `<template
shadowrootmode="open">` gives a shadow root with no JavaScript, for markup
rendered on a server.

### Scene 7 · The form doesn't see it

`<device-picker>` renders a list of fake devices and fires `change` when one
is picked. Submit the form, log `new FormData(form)`: no `mic`. `required`
did nothing either; you can join with no microphone.

A native `<select>` takes part in its form, and a custom element doesn't
unless it opts in: `static formAssociated = true`, `attachInternals()`,
`setFormValue(id)` on every change, `setValidity({ valueMissing: true }, …)`
while empty. Now `FormData` has `mic`, the form refuses to submit, the
browser's own validation bubble appears, and `form.reset()` reaches the
element through `formResetCallback`.

The `change` event: `bubbles: true` so the form hears it. Inside a shadow
root it also needs `composed: true` to get out, and outside it, `event.target`
is retargeted to the host. Logging `event.composedPath()` from the page
shows the inside.

### Scene 8 · Tab doesn't reach it

Unplug the mouse, as in Lecture 2. Tab skips the picker entirely. A custom
element inherits none of `<select>`'s behaviour: focus (`tabindex`,
`delegatesFocus`), keys, role (`internals.role = 'listbox'`), label. The meter
gets `internals.role = 'meter'` and `ariaValueNow`. One trap: an
`aria-labelledby` inside the shadow root can't point at an id outside it.

This is also where the class says when *not* to write one: if a native
element does the job (a `<select>` with good CSS would do here), use it. The
picker earns its place only if it shows something `<select>` can't, like a
live level next to each microphone.

### Scene 9 · Who ships tags

GitHub (`<relative-time>` from the cold open), YouTube, Photoshop on the web,
Firefox's own interface. Lit as a thin layer over this exact API: reactive
properties, templates, the same lifecycle underneath. One slide, loaded with
an import map.

### Ex 1 · After the call

The call has ended. Every call app now asks "How was the call quality?".
Students build `<star-rating name="quality" max="5" required>` in a post-call
form: it submits with the form, blocks an empty submit, resets, works with
arrow keys and Tab, takes the app's theme through a part or a custom
property, and fires `change`. 20 minutes.

## Act 2 · Plug in the world

### Scene 10 · The meter is lying

So far the meter shows numbers typed into the console. Now connect the
microphone. A student opens the green room on a phone over the local
network (`http://192.168…`) and `navigator.mediaDevices` is `undefined`. No
prompt, no error, the API is missing.

Secure contexts: camera, microphone, motion sensors and the clipboard exist
only on HTTPS and `localhost`.

### Scene 11 · The prompt has three answers

`getUserMedia({ audio: true })`. The prompt appears. Allow, Block, or close
it. Allow resolves with a stream; Block and closing the prompt both reject
with `NotAllowedError`, and after repeated dismissals Chrome stops asking for
a while. Two more rejections:
`NotFoundError` (no microphone), `NotReadableError` (another app holds it).
On Block, the `blocked` slot from Scene 6 shows the app's message. Scene 6's
slot was written for this case.

### Scene 12 · Block is final

Click Block, then call `getUserMedia` again. It rejects
instantly. No prompt this time, and none on reload. The page can never ask
again. Only the user can undo it, in the site controls next to the address
bar. That's why the `blocked` slot from Scene 6 tells the user where to
click, not "please allow".

The consequence: a prompt that appears on page load, before the user knows
why, gets blocked, and that block is permanent. Real call apps ask in
context: the green room first shows "We'll need your camera and microphone"
with a button, and the browser prompt appears only after the click.

Choosing which screen to show takes the state without asking:
`navigator.permissions.query({ name: 'microphone' })` returns `granted`
(start immediately), `prompt` (show the explanation and the button) or
`denied` (show how to reset). Support for permission names varies between
browsers, so wrap it in `try`.

A grant doesn't last forever either. It can be one-time (Chrome's "Allow
this time"), last for the session, or persist, depending on the browser and
the user's choice. The user can revoke it mid-call from the address bar: the
`PermissionStatus` fires `change` and the track fires `ended`. The green room
listens to both and switches to the blocked view.

### Scene 13 · Silence until you click

Create an `AudioContext` on page load: `state` is `'suspended'`. The
autoplay policy: audio starts only after a user gesture. No prompt, no
setting: a second kind of gate, **user activation**. The browser tracks
whether the user has recently clicked, tapped or pressed a key
(`navigator.userActivation.isActive`), and some APIs work only inside that
window: audio, fullscreen, pop-ups, clipboard writes, EyeDropper. `getUserMedia` itself
needs no gesture, but the level meter's `AudioContext` does: the green room
creates it inside the "Test your mic" click.

`createMediaStreamSource(stream)` → `AnalyserNode`, a `requestAnimationFrame`
loop, `getFloatTimeDomainData`, root mean square, `meter.value = rms`.
Speak, and the meter moves.

`<level-meter>` itself didn't change. It was built and tested against fake
numbers, and real ones arrive through the same property.

### Scene 14 · The camera

`getUserMedia({ video: true })`, the stream into a `<video>` inside the
shadow root (`srcObject`, `muted`, `playsinline`). `mirrored` flips it with
one CSS transform, because a person looking at themselves expects a mirror and
the other participants don't.

### Scene 15 · Empty names

The device picker asks `enumerateDevices()` for real devices. Before
permission is granted, the labels are empty strings. The browser won't
describe your hardware to a page you haven't trusted (fingerprinting). Order
matters: ask, then list. Plug in headphones: `devicechange` fires, the list
updates.

### Scene 16 · The light stays on

The climax of the act. The green room lives in a single-page app. Click Back:
the app removes the green room from the DOM. The page looks fine. The camera
light on the laptop is still on, and the browser tab still shows the
recording indicator. The microphone is still captured.

Removing a `<video>` doesn't stop its stream. Nothing releases the camera
until a track is stopped. This is what `disconnectedCallback` is for: stop
every track, close the `AudioContext`, cancel the animation frame, remove
listeners on `window` and `navigator.mediaDevices`. The rule: whatever
`connectedCallback` acquires, `disconnectedCallback` releases.

Trap in the same scene: moving the element (`appendChild` elsewhere) calls
`disconnected` then `connected`. A component that stops the camera on
disconnect restarts it on connect, and it flickers. `moveBefore` +
`connectedMoveCallback` where supported; otherwise restart cheaply.

### Scene 17 · Embedded

The green room inside a partner's page, in an `<iframe>`: the camera is
refused before any prompt. Permissions Policy: `allow="camera; microphone"`
on the iframe. The embedding page decides what the frame may ask for. The
same policy works the other way as a response header:
`Permissions-Policy: camera=(), geolocation=()` turns a feature off for your
own page and everything it embeds, so a third-party script can't even ask.

### Scene 18 · What getUserMedia checks

Act 2 so far, on one slide: what `getUserMedia` checks, in order (Chrome).

1. **Secure context** · HTTPS or `localhost` (Scene 10). Fails silently:
   `mediaDevices` is missing.
2. **Permissions Policy** · this frame may use the camera (Scene 17).
   `NotAllowedError`, no prompt.
3. **A camera exists** · `NotFoundError`, no prompt.
4. **Permission of the top-level site** (Scenes 11–12). `"granted"` goes on;
   `"denied"` is `NotAllowedError` with no prompt, and only the user can undo
   it; `"prompt"` asks: Allow, Never allow, or close (`NotAllowedError`,
   still `"prompt"`).
5. **OS and hardware** · `NotAllowedError` from the OS, `NotReadableError`
   when the camera is busy.

Then the track is live until `stop()`, a revoke or an unplug ends it. Only
the prompt asks the user; every other "no" is silent. User activation
(Scene 13) is not on this path: it gates audio, fullscreen and pop-ups.

Not every API uses every gate. The jam's APIs:

| API | Secure context | User activation | Prompt |
| --- | --- | --- | --- |
| Camera, microphone | yes | no | yes |
| Web Audio playback | no | yes | no |
| Speech recognition | yes | no | microphone prompt |
| Clipboard write | yes | yes | no |
| EyeDropper | yes | yes | no, the picker is the consent |
| Gamepad | yes | a button press on the pad | no |
| Device orientation | yes | iOS: yes | iOS: yes (`requestPermission()`) |
| Pointer Events, BroadcastChannel | no | no | no |

Browsers differ in the details (clipboard and notifications especially);
the table is the Chrome baseline, MDN has the rest.

A sensor the page holds is visible to the user: the tab's recording
indicator, the camera light, the operating system's microphone dot. That's
deliberate, and it's the reason Scene 16's bug is a privacy bug, not a
cosmetic one.

### Scene 19 · The contract

What the green room's three tags have in common:

- one module defines one element
- attributes configure it, properties carry live data, events report
- it reads the permission state before asking, and asks only after the
  user asks for the feature
- it starts on a user gesture
- it handles a refusal with visible content that says how to undo it
- it reacts when the permission is revoked while it runs
- it releases everything in `disconnectedCallback`

This is the brief for the jam.

## Break

## Jam · Tags that sense something else

The browser has more senses than a camera and a microphone. Six groups, six
tags, each following Scene 19's contract (briefs in `course-notes.md`, Web
API jam, adapted):

`<theremin-pad>` (pointer → sound), `<colour-thief>` (EyeDropper,
Clipboard), `<photo-booth>` (camera → canvas → PNG), `<voice-command>`
(speech in and out), `<gamepad-car>` or `<clap-switch>`, `<window-pong>`
(BroadcastChannel).

Each brief names its gates from Scene 18's table, so a group knows
which failures to handle before writing code.

Minute 15 checkpoint: the tag renders and logs raw sensor data. Minutes
35–42: block the permission and reload; reset it from the address bar and
revoke it while the tag runs; remove the element in the console. If the
camera light stays on, that group has Scene 16's bug.

## Show & tell

Six demos, 3 minutes each, each group from its own laptop, sharing its
screen in Zoom: the toy, the tag in the Elements panel, the tag removed in
the console.

## Close · Back to the cold open

Return to `<relative-time>` on GitHub. Its `observedAttributes` includes
`datetime`, its `attributeChangedCallback` re-renders the text, and it
disconnects cleanly when the page changes. Students wrote the same kind of
element today.

Three questions:

- What does the element expose: attributes, properties, events, parts?
- What does it acquire, and where does it release it?
- Which gates does it pass, and what does the user see when one says no?
