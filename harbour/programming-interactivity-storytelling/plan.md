# Storytelling with demos and playgrounds · plan

Teacher-facing structure. Not student-facing. Deck written: `slides.html`
(58 slides, titled "Let them touch it"); clock times in `run-sheet.md`. Where
the deck and this plan differ, the deck wins.

How a page explains an idea by letting the reader touch it, and how a
programmer shows working code to a room. Read good explorable explanations,
take them apart, name the patterns, storyboard one, build its first frames,
then test it without speaking and show it out loud.

**Assumes:** Lecture 5 (`render(state)`), Lecture 9 (drawing surfaces,
"pictures need words", `requestAnimationFrame`), Lecture 11 (Pointer
Events). Act 3 uses `<iframe sandbox>` and `postMessage`: if this class
runs after Lecture 12, the two slides marked *(L12)* become a one-sentence recap.

**Running examples:** a token-bucket rate limiter (the explorable, built in
`demos/`), a minimal code playground for `Intl.DateTimeFormat`. No market.

## The story in one paragraph

A demo that shows a result impresses; a demo that shows a mechanism
explains. Good interactive explanations share a structure that Nicky Case
states in three steps: make the reader care about a question, climb from one
concrete example to the general rule, and end on a question the reader
answers in a sandbox. Each step follows from the last by "therefore" or
"but", never "and then". Interaction is used only where it beats text, a
picture or an animation, and the page still reads without it. A playground
is the same idea applied to code: a working starting point, the data made
visible, one obvious thing to change, a reset. Underneath, both are ordinary
programs: one state, several views rendered from it, inputs that change the
state. The craft is in the order of revelation, not the code. A live demo
follows the same rules: one point, a problem the room already feels, the
before beside the after.

## Timing · 3 hours

| Min | Block |
| --- | --- |
| 5 | Opening |
| 20 | Act 1 · The shape of an explanation |
| 20 | Ex 1 · Take one apart |
| 14 | Act 2 · Patterns and failures (+ a worked storyboard) |
| 14 | Ex 2 · Storyboard + pair critique |
| 15 | Break |
| 20 | Act 3 · Playgrounds |
| 12 | Act 4 · Engineering an explorable |
| 40 | Ex 3 · Build three frames + silent test |
| 15 | Act 5 · Showing it |
| 5 | Close |

## Structure

Slide numbers refer to `slides.html`; clock times and what to do live are in
`run-sheet.md`. This section keeps the design decisions.

- **Opening (slides 1–5)** · the same idea twice: a textbook paragraph on
  cubic Bézier curves, then Pomax's primer with a draggable point. Thesis:
  interaction is an argument.
- **Act 1 · The shape (6–18)** · Victor's active reader and three forms;
  Case's three steps (question, ladder, question); the ladder of
  abstraction; "but / therefore" shown on the token bucket's own outline;
  do/show/tell; gates; Patel's "the explorable is not the explanation"; the
  critics (most readers never click; Matuschak). A medium quiz.
- **Ex 1 · Take one apart (19–20)** · ten pieces, a nine-question card about
  the author's decisions, not the topic.
- **Act 2 · Patterns (21–30)** · a 3-minute report back feeds the board;
  five formats; one new control per step; linked views (live embed);
  defaults as argument; failures; disagreements (Pudding vs Patel vs Case);
  accessibility as implemented in the demo; then the token bucket's own
  storyboard, where frames 3 and 5 each bring in one control.
- **Ex 2 · Six frames (31)** · storyboard one idea, stated as a sentence
  with a verb; neighbour critique against four card questions.
- **Act 3 · Playgrounds (33–41)** · examples; Victor's *Learnable
  Programming*; the "Whose 09:00?" playground live for five minutes; a
  playground tells the same story (bug, one marked place, predict-first
  surprise, open ending; a first screen that runs); errors in words and a
  share link; CodeMirror vs Monaco;
  how it runs (fresh sandboxed frame, relay, watchdog); why not `eval`.
  The last two are marked *(L12)*: a one-sentence recap after Lecture 12.
- **Act 4 · Engineering (42–49)** · a pure model with its claims as tests;
  one state, several views; pointer and keyboard editing in one module;
  steps as data (the outline is tested); seeded randomness; state in the
  URL; scroll and time as "read after class".
- **Ex 3 · Build three frames (50–51)** · 40 minutes; explorable or
  playground starter, each with its own "done means"; the last 7 minutes
  are the silent test, with a three-line observation note.
- **Act 5 · Showing it (52–55)** · a live demo has the same shape: one
  point, the pain first, before beside after, prepare the run, end on
  purpose. Three volunteers give 90-second demos; the room names the point.
- **Close (56–58)** · three questions; reading list.

## Materials (built)

- `slides.html` · `index.html` (materials page) · `run-sheet.md`
- `exercises/01-take-one-apart.html`, `02-storyboard.html`, `03-build.html`;
  starters `03-starter.zip`, `03-playground-starter.zip` (rebuild with
  `exercises/make-zips.sh`)
- `print/dissection-card.html`, `print/storyboard.html` (A4)
- `demos/token-bucket/01-two-views` … `07-time`, one per Act 4 slide; 05–07
  build on 02
- `demos/playground/` — textarea + sandboxed iframe + console relay + reset
  + URL share, the `Intl.DateTimeFormat` starter and three challenges
- `demos/but-therefore.md` — the six-beat outline, before and after

## Traps to plan for

- Ciechanowski's pages are heavy (WebGL); check the classroom laptops.
- Ten groups opening the same site at once on a slow network.
- Students storyboard a topic instead of an idea. Enforce card question 1.
- Ex 3 eats itself in drawing code. Frame 2 may be a static picture with
  one working control; the surprise matters more than the polish.
- `srcdoc` iframes reload on every keystroke: debounce, or the console
  floods and focus jumps.
- The silent-author rule fails if the author grabs the mouse. Say it twice.

## Open questions

- Where in the sequence? After Lecture 12 shortens the *(L12)* slides to a recap; after
  Lecture 9 is the minimum.
- Gallery on paper cards (screenshot + URL) or projected list?
- Ex 3 track choice: free, or explorable for half the room and playground
  for the other half, so Act 5 shows both?

## Sources

- Nicky Case, *How I Make Explorable Explanations* ·
  blog.ncase.me/how-i-make-an-explorable-explanation
- Nicky Case, *Explorable Explanations* (workshop patterns: do/show/tell,
  gates, start small build big) · blog.ncase.me/explorable-explanations
- Nicky Case, *The Evolution of Trust: feetnotes* · ncase.me/trust/notes
- Bret Victor, *Explorable Explanations* ·
  worrydream.com/ExplorableExplanations
- Bret Victor, *Up and Down the Ladder of Abstraction* ·
  worrydream.com/LadderOfAbstraction
- Bret Victor, *Learnable Programming* · worrydream.com/LearnableProgramming
- Amit Patel, talk notes on interactive explanations ·
  redblobgames.com/x/2306-educ432
- Andy Matuschak, *Most dynamic representations developed for
  communication aren't very enabling* · notes.andymatuschak.org
- Josh Comeau, *A World-Class Code Playground with Sandpack* ·
  joshwcomeau.com/react/next-level-playground
- Russell Samora (The Pudding), *Responsive scrollytelling best practices* ·
  pudding.cool/process/responsive-scrollytelling
- PostHog, *24 tips for giving S-tier demos* ·
  posthog.com/newsletter/how-to-demo
- Hub of examples and tools · explorabl.es
