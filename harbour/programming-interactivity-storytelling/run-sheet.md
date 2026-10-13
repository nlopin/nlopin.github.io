# Let them touch it · run sheet

Three hours: a 5-minute opening, 20 minutes of Act 1, a 20-minute dissection
exercise, 14 minutes of Act 2 (with a worked storyboard), a 14-minute
storyboard, a 15-minute break, 20 minutes on playgrounds, 12 minutes of
engineering, a 40-minute build ending in a silent test, 15 minutes on showing
it with three 90-second demos, 5 minutes of close.

Each block below has a clock time. If you're behind at a block's start, use
the cuts at the end.

**Audience:** adult programmers. Lecture 5 (`render(state)`, modules), Lecture
9 (SVG and canvas, `requestAnimationFrame`) and Lecture 11 (Pointer Events)
are assumed. Act 3's sandboxed iframe and `postMessage` are explained in two
slides; if Lecture 12 came first, say "as in Lecture 12" and move on.

## Before class

- [ ] Serve the lecture folder over `http://localhost` (the demos use module
      scripts): `npx live-server --port=8080` in this folder.
- [ ] Open the ten gallery pieces once on the classroom network and a
      classroom laptop. Ciechanowski's two pages (WebGL) are the heaviest; if
      they stutter, swap their groups to the spares.
- [ ] Print: one dissection card per group (`print/dissection-card.html`),
      one storyboard sheet per student (`print/storyboard.html`), plus spares.
      Optionally a few copies of `print/storyboard-example.html`. Bring blank
      paper as a fallback.
- [ ] Both checks pass: `node --test demos/token-bucket/test/claims.test.mjs`
      (every number the demo's text states) and `node --test test/*.test.mjs`
      (deck, run sheet, plan and briefs agree).
- [ ] Check `pomax.github.io/bezierinfo` loads, and find the de Casteljau
      section.
- [ ] Note the projector laptop's time zone: the playground's starter prints
      three times in *that* zone. Outside Central Europe, the "everyone sees
      09:00" line reads differently; the bug is the same.
- [ ] Open in tabs: the deck (`p` for presenter view), the gallery page,
      `demos/token-bucket/index.html`, `demos/playground/index.html`.
- [ ] Decide the groups of three for Exercise 1 and the piece each gets.

Keys in the deck: `→ ←` move · `p` presenter view · `m` menu · `n` notes ·
`f` fullscreen · `t` clock.

## The story in one paragraph

The same idea twice, a formula and a draggable curve, shows that interaction
is an argument. Act 1 names the shape of good explanations: Victor's active
reader, Nicky Case's three steps (a question, the ladder of abstraction, a
question at the end), the "but / therefore" rule, do/show/tell, gates, and
Amit Patel's rule that the page must work without interaction, with the
critics' case that most readers never click. Groups dissect one explorable
each. Act 2 names what they found: five formats, one control at a time,
linked views, defaults as argument, failures, disagreement, accessibility,
and shows the token bucket's own storyboard. Everyone storyboards one idea.
After the break, Act 3 treats code as the control: Victor's "show the data",
a playground that tells the same story (a recognisable bug, one marked line,
a predicted surprise), errors in words, reset, a link that reproduces the
code, and why the code runs in a fresh sandboxed frame. Act 4 opens the token
bucket's folders: a tested model, several views, pointer and keyboard input,
steps as data, seeds, the URL. Everyone builds frames 2–4 and tests on a
neighbour in silence. Act 5 applies the same shape to a live demo, and three
volunteers give a 90-second one.

## Opening · 0:00–0:05 · slides 1–5

1. Title.
2. The plan. Name the running example: a token bucket. Ask who has hit an
   HTTP 429.
3. **The textbook paragraph.** Read it aloud once. "Hands up if you could
   now draw this curve."
4. **Pomax, live.** De Casteljau section. Drag a control point, scrub *t*.
   Then the question on the slide (step reveal).
5. Thesis: interaction is an argument.

## Act 1 · The shape of an explanation · 0:05–0:25 · slides 6–18

6. Act divider.
7. Victor's three forms. One sentence each.
8. Case's three steps.
9. **Quiz:** two openings for Trust. Ask, then reveal.
10. The ladder. Point at the three cards: the token bucket's steps follow it.
11. **But / therefore.** Left column first; ask which beat could become a
    "but". Reveal the right.
12. End with a question. Give the answer to the bucket question only if
    asked (1.05 tokens/s evenly spaced; four at once never pass a bucket of 3).
13. Do, show, tell.
14. Gates.
15. The explorable is not the explanation.
16. The counter-argument. Don't rush it; it's the honest half.
17. **Quiz:** which medium? Ask row by row, then reveal.
18. What to look for. Form groups of three while this is up.

## Exercise 1 · Take one apart · 0:25–0:45 · slides 19–20

19. Start the timer (20 min). Assign pieces by number.
20. Leave the card up from minute 12.

- Minute 5: is everyone in their piece?
- Minute 12: stop reading, start the card.
- Minute 18: one sentence per group ready.

## Act 2 · Patterns and failures · 0:45–0:59 · slides 21–30

21. Act divider.
22. **Report back** (3 min timer), one sentence per group. Board in three columns: formats, order,
    views.
23. Five formats. Map the board onto them.
24. One control at a time.
25. **Live:** token bucket 02 embedded. Drag time, drag a request, then Tab
    to a request and move it with the arrow keys.
26. Defaults.
27. Failures. Ask which ones they met.
28. Disagreements.
29. Accessibility.
30. **Six frames, filled in:** the token bucket's storyboard. One minute:
    frames 3 and 5 each bring in one control, with a but / therefore.

## Exercise 2 · Six frames · 0:59–1:13 · slide 31

31. Timer 14. Hand out the sheets. Check idea sentences in the first two
    minutes. Swap at minute 8.

## Break · 1:13–1:28 · slide 32

## Act 3 · Playgrounds · 1:28–1:48 · slides 33–41

33. Act divider.
34. Playgrounds you know. Ask what they saw first.
35. Learnable programming.
36. **Live: the playground, five minutes.** Add `timeZone: person.timeZone`;
    the checks go green. Delete a bracket: output greys, error with line
    number. Challenge 2: the room predicts first, then change the date to 27
    October; New York moves, the others don't. Type `while (true) {}`:
    stopped after 1.5 s. Kolkata only if there's time.
37. A playground tells a story too (its notes cover a first screen that runs).
38. Output and errors (the share link is in the notes).
39. A demonstration, not an IDE.
40. How it runs. *(L12: a recap if Lecture 12 came first.)*
41. **Quiz:** why not `eval`? Three reveals. *(L12)*

## Act 4 · Engineering an explorable · 1:48–2:00 · slides 42–49

Open `demos/token-bucket/` beside the deck. Twelve minutes: show, don't type.
Behind at 1:54? Slides 47 and 48 join slide 49 as "read after class": say one
sentence each and go to the exercise.

42. Act divider.
43. A pure model (01), and the claims test. Run it in a terminal.
44. One state, several views (01).
45. Direct manipulation, pointer and keyboard (02).
46. Steps as data (03). Click through the steps; read the first words aloud.
47. Seeded randomness (05). Click "Unseeded" twice, then back to seed 7.
48. State in the URL (06). Click both links, press Back, try
    `?cap=99&rate=abc`.
49. Scroll and time (04, 07): one minute, "read them after class".

## Exercise 3 · Build three frames · 2:00–2:40 · slides 50–51

50. Timer 40. Starters on the brief page.
51. At 2:33: the silent test (timer 7), swap after three and a half minutes.
    Name the three volunteers for Show three now; nothing else for them yet. The watcher writes
    three things: where they hesitated, whether they reached the surprise,
    the sentence the author wanted to say.

- Minute 10: does everyone have a figure that redraws from state?
- Minute 20: is the second control hidden at step 1?
- Note three pages for the show: one explorable, one playground, one
  unfinished with a clear first touch.

## Act 5 · Showing it · 2:40–2:55 · slides 52–55

52. Act divider.
53. A live demo follows the same rules. While 53–54 are up, the three
    volunteers copy their folder or URL to the projector laptop (only the
    first plugs in, if there's one cable).
54. Prepare the run.
55. **Show three** (timer 10). 90 seconds each: one sentence of pain, the
    surprise live, a closing sentence. The room names the point.

## Close · 2:55–3:00 · slides 56–58

56. Three questions.
57. Reading list.
58. Thanks.

## Cuts, in order

1. Slide 49 (scroll and time), then 47–48 (seeds, URL): "the folders are there".
2. Slide 28 (disagreements).
3. Slides 40–41 if Lecture 12 came first: one sentence.
4. Exercise 2's swap: storyboard only, 10 min.
5. Show three becomes show two.

Never cut: the silent test. It's the only playtest of the day.
