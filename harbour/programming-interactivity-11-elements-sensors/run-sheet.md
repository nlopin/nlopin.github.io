# Lecture 11 — Tags that listen · run sheet

Three hours: 35 minutes of Act 1, a 20-minute exercise, 25 minutes of Act 2, a
15-minute break, a 45-minute jam, 25 minutes of demos over Zoom, 5 minutes
of wrap. The class is one live build: the green room of a video-call
app (Parley), in thirteen steps. Every step is a complete, working folder in
`demos/green-room/`, so you can type the change live or open the next folder
when time is short.

Each step below has a clock time. If you're behind at a step's start time, open
the next folder instead of typing, and use the cuts at the end.

**Audience:** adult programmers. Lectures 2 (forms, focus), 4 (events,
delegation, FormData), 5 (`render(state)`, modules) and 10 (import maps,
geolocation, "Plan for no") are assumed.

## Before class

- [ ] Serve the lecture folder over `http://localhost` (module scripts and the
      camera need it): `npx live-server --port=8080` in this folder. Check
      that `127.0.0.1:8080` also answers; step 13 uses it as a second origin.
- [ ] Chrome, not Firefox, on the projector: `moveBefore`,
      `document.featurePolicy`, `getEventListeners` and the permission UI in
      the slides are Chrome's.
- [ ] Reset camera and microphone for `localhost:8080` (site controls next to
      the address bar → Reset permissions) so the first prompt in class is real.
- [ ] macOS: System Settings → Privacy & Security → Camera and Microphone:
      Chrome is allowed. Otherwise every page gets `NotAllowedError`.
- [ ] Close Teams and Meet, and keep Zoom closed until the demos: on
      Windows a camera held elsewhere is `NotReadableError`.
- [ ] Optional: a phone on the same Wi-Fi, for step 9's secure-context moment.
- [ ] Count gamepads in the room: with pads, offer the spare `<gamepad-car>` as
      a seventh task.
- [ ] A Zoom meeting for the demos, its link ready to share at the jam.
- [ ] Open in tabs: the deck (`p` for the presenter view), github.com on any
      repository with commit dates, `demos/green-room/index.html`.

Keys in the deck: `→ ←` move · `p` presenter view · `m` menu · `n` notes ·
`f` fullscreen · `t` clock.

## The story in one paragraph

GitHub's `<relative-time>` updates itself when you edit an attribute: something
is attached to that one tag. Act 1 writes three such tags for a green room, the
screen before a video call: first the markup we wish HTML had, then a class per
tag, attributes vs properties, a stylesheet collision that motivates shadow
DOM, slots for the app's own text, a picker the form can't see until it becomes
form-associated, and the keyboard and roles a custom element doesn't get for
free. Act 2 connects the same tags to the real microphone and camera, behind
four gates (secure context, Permissions Policy, user activation, permission),
and ends on a privacy bug: the camera light stays on after the user leaves the
screen, fixed in `disconnectedCallback`. The jam applies the same contract to
other senses, and each group demos its tag over Zoom.

## Prologue · 0:00–0:05 · slides 1–4

1. Title. One sentence: today HTML gets new tags, and the tags get senses.
2. The plan.
3. **Cold open, live.** github.com → a repository → a commit date → right-click
   → Inspect. Show `<relative-time datetime="…">`. Double-click the
   `datetime` value, change the day to yesterday, Enter: the text says
   "yesterday". Ask: who did that? Don't answer.
4. The green room. Ask who used one this week (all of them).

## Act 1 · Your own tags · 0:05–0:40 · slides 5–28

Open `demos/green-room/` in the editor and the browser side by side. For each
step: show the diff from the previous folder, type the core lines live if
there's time, otherwise open the folder.

### Step 1 · the wish · 0:05–0:07 · slides 6–7

- Open `01-wish/index.html`. Point at the markup first, then the page: a Join
  button, a dashed box, nothing else.
- Console: `document.querySelector("level-meter").constructor.name` →
  `"HTMLElement"`. `document.createElement("levelmeter").constructor.name`
  → `"HTMLUnknownElement"`. That's the quiz on slide 7; ask before running.
  Keep this tab open.

### Step 2 · define · 0:07–0:12 · slides 8–11

- **Slide 8.** Open `02-define/`: the meter alone on a bench page, with its
  own `level-meter.css` (classes `.bar`, `.bar.on`). Remember that file. Walk
  through `level-meter.js`: `extends HTMLElement`, `connectedCallback`
  building ten spans, `customElements.define`.
- **Slide 9, upgrade live, back on the `01-wish` tab.** Console:
  1. `const meter = document.querySelector("level-meter")`
  2. `meter.constructor.name` → `"HTMLElement"`
  3. Paste the class from `02-define/level-meter.js` and the `define` line.
  4. `meter.constructor.name` → `"LevelMeter"`: the same object, upgraded.
     Ten `<span class="bar">` appear inside it, and they show up as wide
     striped rows: the app's own `.bar` rule (its header) styles them. Say
     "remember this" and move on; it's step 4's problem.
- **Slide 11 quiz:** predict, then run in the console:

  ```js
  class Bad extends HTMLElement {
    constructor() {
      super();
      console.log(this.getAttribute("bars"));
      this.append(document.createElement("span"));
    }
  }
  customElements.define("bad-one", Bad);
  document.body.insertAdjacentHTML("beforeend", '<bad-one bars="20"></bad-one>');
  document.createElement("bad-one");
  ```

  From markup it logs `"20"`. From `createElement` it logs `null`, then
  Chrome reports `NotSupportedError: … The result must not have children`.

### Step 3 · attributes and properties · 0:12–0:16 · slides 12–14

- Open `03-attributes/`. Two meters, one with `bars="20"`.
- Slide 13's quiz: in `index.html` change the script to
  `level-meter-before.js` (attributes only, no property). Reload. Console:
  - `const meter = document.querySelector("level-meter")`
  - `meter.value = 0.8` → nothing (slide 13's question).
  - `meter.setAttribute("value", 0.8)` → the bars move.
- Switch back to `level-meter.js`, reload, define `meter` again:
  `meter.value = 0.8` works now. `meter.getAttribute("value")` is still
  `"0.3"`, the value in the markup: the property doesn't write the attribute.
  Same for any `<input>`.
- Drag the "Fake microphone" slider: a property, up to 60 times a second.
  That's the argument on slide 14.

### Step 4 · the page breaks it · 0:16–0:18 · slide 15

- Open `04-in-the-app/`: the meter dropped into the app. The header has
  collapsed into a narrow grey column, the bars are fat. Both stylesheets have
  `.bar`. Point at both files.
- Console: `document.querySelectorAll(".bar").length` → 11: the app's header
  and the meter's ten spans, mixed.

### Step 5 · shadow DOM · 0:18–0:23 · slides 16–18

- Open `05-shadow/`. Same `.bar` names, both work. Elements panel: expand
  `#shadow-root (open)`.
- Console: `document.querySelectorAll(".bar").length` → 1.
- Click "Dark theme": the meter changes colour through `--meter-color` and
  `--meter-off`, set in `app.css`. Show the rule and `level-meter::part(bar)`
  (round bars).

### Step 6 · slots · 0:23–0:26 · slides 19–20

- Open `06-slots/`. The preview shows the page's "Your camera is off."
- Tick "Pretend the camera is blocked": the `slot="blocked"` paragraph shows.
  It's still in the page's DOM (Elements panel, light DOM children).
- Untick "Mirrored": the 👋 flips; the property wrote the attribute, CSS read
  it.
- Slide 20 (declarative shadow DOM): talk only. Open
  `06-slots/declarative.html` only if you're ahead.

### Step 7 · the form · 0:26–0:31 · slides 21–23

- Open `07-form/`. Show the problem first: in `index.html` change the script
  to `device-picker-before.js` (the same picker, not form-associated). Reload,
  pick a device, Join: `{}`, and `required` blocks nothing.
- Switch back to `device-picker.js`, reload. Pick "USB Audio Interface", Join:
  `{ "mic": "usb" }`. Reset: cleared.
- Reload, click Join with nothing picked: nothing is sent, no bubble, and the
  console says `An invalid form control with name='mic' is not focusable.`
  Leave it hanging: next step.

### Step 8 · keyboard and roles · 0:31–0:36 · slides 24–25

- Unplug the mouse (Lecture 2): Tab from the top. In `07-form` Tab skips the
  picker; in `08-keyboard` it stops once, arrows move and select.
- Join with nothing picked: focus lands on the picker, the browser's bubble
  says "Choose one."
- Pick "Bluetooth Headset", then click the "Microphone" label: focus goes to
  the checked option (form-associated elements are labelable; the picker
  sends delegated focus to its tab stop).
- DevTools → Elements → Accessibility pane on an option: role radio, checked
  state. On the meter: role meter, value.

### When not to, who ships tags · 0:36–0:40 · slides 26–27

Talk only, 2 minutes. Two minutes of buffer before the exercise.

## Exercise 1 · After the call · 0:40–1:00 · slide 28

- 18-minute timer (0:40–0:58), then a 2-minute debrief.
- Pairs. Link on the slide. Starter: `exercises/01-star-rating.zip`. Three core
  done-means (FormData, required + reset, `change`); keyboard, shadow DOM and
  theming are "if there's time", with the green room's picker as reference.
- Minute 8: walk round, ask who has the value in `FormData`.
- Minute 15: who has `required` blocking an empty submit?
- Solution: `private/exercise-1-solution/` (not published). Debrief, 2 min:
  open it, show `star-rating:state(rated)` in the console
  (`document.querySelector("star-rating").matches(":state(rated)")`):
  custom states come back in step 10.

## Act 2 · Plug in the world · 1:00–1:25 · slides 29–48

Act 2 is the tightest block. The plan below is already trimmed: the phone
demo, the autoplay page, the headphones, the console checks in step 10, the
live revoke and frame C are "if ahead"; slides 40, 44 and 47 get one sentence
each.

### Step 9 · the microphone · 1:00–1:10 · slides 30–38

- **Slide 31, secure context:** say it. (If ahead: on a phone open
  `http://<laptop-ip>:8080/demos/green-room/09-microphone/`; the status says
  the microphone needs HTTPS or localhost and names the origin.)
- Laptop, `09-microphone/`: status "Parley will ask for your microphone…".
  Click "Test your mic" → the prompt. **Click "Never allow"** (older Chrome:
  "Block"). The status shows the `NotAllowedError` sentence.
- **Slide 34, block is final.** Click the button again: instant error, no
  prompt. Reload: same. Then reset in the site controls, reload, click,
  **"Allow while visiting the site"**. Speak: the meter moves. The meter's
  file is the same as step 8's.
- **Slide 37, autoplay:** the quiz on the slide, talk only. (If ahead: copy
  the URL of `09-microphone/autoplay.html`, paste it into a **new tab**, not
  a link click, since Chrome counts earlier clicks on the same site; don't
  touch the page: `context.state: suspended`; click: a beep, `running`.)

### Step 10 · the camera and real devices · 1:10–1:13 · slides 39–40

- Reset permissions, open `10-camera/`. Before clicking: both pickers show
  "Device names appear after you allow access."
- Click "Start camera and microphone", allow both. The preview goes live, the
  pickers fill with real names and the chosen microphone is marked. Slide 40:
  one sentence ("no names before access").
- If ahead:
  - `await navigator.mediaDevices.enumerateDevices()` before and after the
    grant: empty ids and labels, then names, plus a `"default"` alias the
    picker leaves out.
  - `const preview = document.querySelector("camera-preview")`, then
    `preview.matches(":state(live)")` → `true`; `preview.state = "blocked"`
    changes nothing, it's a getter only.
  - Plug in headphones: the microphone list updates (`devicechange`).

### Step 11 · the light stays on · 1:13–1:16 · slide 41

- Open `11-light-stays-on/`: the lobby. "Get ready to join" → the green room.
  Start the camera.
- Click "← Back to the lobby". The page looks fine. **Point at the camera
  light**, the tab's recording dot, the macOS microphone indicator.
- Go back and forth three times, then in the console:
  `getEventListeners(navigator.mediaDevices)` → several `devicechange`
  listeners (Chrome DevTools console only).
- Reload the page to release the camera before moving on.

### Step 12 · cleanup · 1:16–1:19 · slides 42–44

- Open `12-cleanup/`, same moves: Back turns the light off.
- Show the `disconnectedCallback`s and the `AbortController` in
  `device-picker.js` (slide 42). Slide 43: the call counter in
  `camera-preview.js` has been there since step 10 (two quick picks); what's
  new is that `disconnectedCallback` calls `stop()`, so leaving during the
  prompt is covered too. Slide 44 (`moveBefore`): one sentence.
- If ahead, **revoke live (slide 36's promise):** start the camera, then in
  the site controls switch the camera permission off while it runs: the
  camera stops and the preview shows its blocked message ("The camera is
  blocked…" in the status line). The preview watches its own permission and
  its track.

### Step 13 · embedded · 1:19–1:22 · slide 45

- **Reset camera and microphone for `localhost:8080` first.** In Chrome a
  cross-origin frame's permission belongs to the top-level page: if
  `localhost` still has the camera allowed or blocked from step 12, frame B
  silently follows that.
- Open `http://localhost:8080/demos/green-room/13-embedded/` (localhost, not
  127.0.0.1: the frames use the other one as a second origin).
- Frame A (other origin, no `allow`): "The page embedding Parley doesn't allow
  it…", button disabled. Frame B (`allow="camera; microphone"`): click Start;
  the prompt names `localhost:8080`, the top-level page, not the frame. Click
  **"Allow while visiting the site"**.
  (Frame C, same origin with `'none'`: refused. Point at it only if ahead.)

### Gates and the contract · 1:22–1:25 · slides 46–48

Slide 46 is the whole act as one diagram: walk it left to right, one
sentence per box, and point at the red boxes: no prompt, so the page has to
say it. The table (slide 47) shown, not read; the contract. The contract is
the jam brief.

## Break · 1:25–1:40 · slide 49

Put `jam/index.html` on the second screen.

## Jam · 1:40–2:25 · slides 50–53

- Groups of 3–4, two minutes to choose. Two groups on one tag is fine.
- Starter: `jam/starter.zip` (a page that logs the events you list, an empty
  class).
- Or the fix-it version, per task: `jam/NN-<tag>-fix.html` hands out the
  finished tag with three planted bugs, described only by the users'
  reports. Same API, same demo. Good for a group that would rather debug
  than build, or one stuck by minute 15. Answer key:
  `jam/NN-<tag>-solution/bugs.md` (not linked anywhere).
- Minute 15 for a fix-it group: all three reports reproduced on screen.
- Minute 15: every group shows raw data from its sense. Common blockers:
  `file://` instead of a server; a phone on HTTP; an `AudioContext` created on
  load; SpeechRecognition without network (Chrome sends audio to a server);
  EyeDropper in Firefox or Safari (Chromium only).
- Minute 35: walk round with the brief's checks: block, reset, revoke, remove
  the element in the console.
- By 2:20 (minute 40): post the Zoom link. Each group joins from the laptop
  that runs its tag and tests a screen share with sound.

## Stage · 2:25–2:50 · slide 54

- Six groups × 3 minutes, each from its own laptop, sharing its screen in
  Zoom. The next group is ready to share while one presents; the handover is
  the extra minute. The group drives its tag, shows it in the Elements panel,
  removes it in the console. Refusals were checked at minute 35. More than six
  groups: 2 minutes each. Two groups on one tag: both present, the second
  shows only what it did differently.
- Zoom traps: share the screen, not one window (window pong needs two
  windows, and DevTools may be undocked); tick **Share sound** for the
  theremin and the voice command; on Windows, the photo booth group turns its
  Zoom video off first (a camera held elsewhere is `NotReadableError`).

## Wrap · 2:50–2:55 · slides 55–59

- Back to `<relative-time>`: the class on slide 55 is what the students wrote.
- Three questions. Reading. Done.

## If time runs short

- Act 1: skip typing, open each folder and show the diff (~10 min). Skip
  `composedPath` on slide 23; slides 26–27 in one sentence each.
- Act 2, in this order: slide 44 (`moveBefore`) and slide 40 (empty names)
  to the notes; slide 36 (a grant doesn't last) in one sentence; slide 47
  (the table) shown, not read; step 13 as frame A vs frame B only, no reset
  (frame B then follows whatever `localhost` has). Up to ~6 min. If you did
  the live revoke in step 12, reset anyway.
- Act 1: slide 20 (declarative shadow DOM) to the notes.
- Jam: drop the verify phase to 5 minutes, keep the removal check.

## Files

| Path | What |
| --- | --- |
| `slides.html` | the deck, 59 slides, with speaker notes |
| `demos/green-room/01-wish` … `13-embedded` | the live build, one working folder per step; `03-attributes/level-meter-before.js` and `07-form/device-picker-before.js` are the "before" versions for slides 13 and 21 |
| `demos/green-room/index.html` | the step list, with what each step changes |
| `exercises/01-star-rating.html` + `.zip` | Exercise 1 brief and starter |
| `private/exercise-1-solution/` | Exercise 1 solution (git-ignored) |
| `jam/index.html`, `jam/0N-*.html` | jam overview and seven briefs |
| `jam/starter.zip` | jam starter |
| `plan.md`, `plot.md` | planning notes, not student-facing |
