# Lecture 8 — Over the wire · run sheet

Three hours, one 15-minute break, a 45-minute team build at the end. The
Harbour Night Market stops reading its vendors from `data.js` and becomes a
client of the Harbour Market API: HTTP, asynchronous JavaScript (the event loop,
promises, `.then` and `async`/`await`), `fetch`, async UI state, `POST` with
validation, CORS and race conditions. About 71 minutes of teaching, 49 of
exercises, 15 of break, 45 of team build.

**Audience:** adult programmers; JavaScript is recent for most of them. Lecture
5 (state, render, modules, `localStorage`) is assumed. Asynchronous JavaScript
is taught here, in Act 2 (slides 17–23): one thread, the event loop (with a
step-through lab), promises with `.then` / `.catch` / `.finally`, and the same
code with `async` / `await`. If Lectures 6–7 already covered it, run those
slides as a 6-minute recap (skip the second lab program) and give the time to
the team build.

## The story in one paragraph

Lecture 5 ended with a cliffhanger: the stalls are typed by hand; what if they
came from a server? **Today's idea: the server owns the data, the page holds a
copy and asks for it.** Act 1 reads HTTP as text (request line, headers, body;
status, headers, body), with methods, status codes and the Network panel. Act 2
first explains why that request can't block the page (one thread, the event
loop, promises, `.then` and `await`), then makes it from JavaScript: `fetch`,
the `Response` object, the fact that a 404 *resolves*, and one helper that
turns non-2xx statuses into errors.
Act 3 treats time and failure as state: one `status` field, four states
(loading, ready, error, empty), the failure modes, accessible async UI. After
the break, Act 4 sends data: `POST` with JSON, the three classic mistakes (400,
415, 422), rendering the server's copy after a 201, field errors after a 422,
double submits. Act 5 covers where requests may go (same-origin policy, CORS,
live demo) and when they come back (out-of-order responses, `AbortController`).
Then everyone connects the Lecture 5 market to their own market on the course
server, and hands it in as a pull request.

Lecture 5's loop was listen · change the state · re-render. Today it gets a
new source of events: a response arriving.

## The infrastructure (read once)

- **One API, three runtimes.** `project/server/api-core.js` is the API's
  whole logic: a plain function from a request object to a response object, no
  I/O. `project/server/server.js` wraps it in a Node HTTP server (no
  dependencies). `assets/kit.js` loads the same file into the exercise
  editors (a fake `fetch` inside each preview iframe) and into the request
  lab and race lab. Change a rule in one place and it changes everywhere.
- **Editors with `data-api`** get the fake server and a **Network** tab next to
  the console (method, URL, status, time; click a row for headers and bodies).
  The server restarts on every run. Checks run in hidden iframes with their own
  server config (`latency`, `fail`, `offline`, `force` a response for one
  route): see the comment above `mockFetchShim` in `kit.js`.
- **The course server**: https://harbour-api.lopin.me, a Cloudflare Worker
  (`worker/`) that wraps the same `api-core.js`. Every student has their own
  market at `/<github-username>/api/…` (one Durable Object each), persisted,
  isolated, resettable. Chaos is per market (`PUT /api/_chaos`) or per request
  (`?chaos=1`); the control page at the root sets both and resets. Every
  response sends `Access-Control-Allow-Origin: *`. `npx wrangler tail` in
  `worker/` shows everyone's requests live.
- **The local server** (`npm start` in `project/server`) is the fallback for a
  dead classroom network and the Act 5 CORS demo: it serves
  `.private/solution/` and `/api` on `http://localhost:3000`, CORS off unless
  started with `--cors`.

## Before class

- Serve the repository root over HTTP (`npx live-server` in the repo): the
  editors load `project/server/api-core.js` with a `<script>` tag, and the
  exercise pages load the race board's `../../race/race.js`.
- Students need: a GitHub account and Node (live-server) for the team build, an editor, a browser, the
  exercises repo (github.com/nlopin/programming-interactivity-exercises →
  `08-fetch/`). Slide 4 asks them to check `node --version`.
- `p` opens presenter view (notes, next slide, per-act clock).

## Timeline

61 slides. T = theory minutes, P = practice minutes. Each exercise slot
includes about a minute of debrief and transition.

| Clock | Part | T | P | Students do | Materials |
| --- | --- | --- | --- | --- | --- |
| 0:00 | **Prologue** (1–4) — title, Lecture 5's cliffhanger, client/server, the day | 5 | | `git pull`, `node --version` | |
| 0:05 | **Act 1 · HTTP** (5–14) — a request, a response, URL and origin, methods (safe, idempotent), status codes, JSON on the wire, request lab (live, 2 min), Network panel, quiz | 12 | | watch the request lab | `playgrounds/request-lab.html` |
| 0:17 | **Ex 1 · Read the wire** (15) — questions 1–6 | | 6 | probe the API with the request lab | `exercises/01-read-the-wire.html` |
| 0:23 | **Act 2 · Async & fetch** (16–28) — one thread, predict the order (quiz), event loop lab (4 min), what goes in which queue (table + quiz), promises `.then` / `.catch` / `.finally`, the same code with `async` / `await` (+ `Promise.all`), two awaits in fetch, quiz: 404 resolves, `getJSON` + `HttpError`, live fetch with Network tab, data.js → api.js | 19 | | predict, then step through | `playgrounds/loop-lab.html`, `playgrounds/fetch-sandbox.html` |
| 0:42 | **Ex 2 · Load the market** (29) — cases 1–3 | | 12 | fetch, response.ok, URLSearchParams | `exercises/02-load.html` |
| 0:54 | **Act 3 · Async UI state** (30–37) — four states, one status not three booleans, `loadStalls()`, `render()` for every status, failure modes, accessible async UI, quiz: the forever spinner | 9 | | | |
| 1:03 | **Ex 3 · Slow and broken** (38) — cases 1–3 | | 12 | loading, error, retry | `exercises/03-states.html` |
| 1:15 | **Break** (39) — a real break; prepare the CORS demo | | | | |
| 1:30 | **Act 4 · Sending data** (40–47) — a POST, three ways to get it wrong, FormData → JSON, render the server's copy (vs optimistic), 422 + validation on both sides, idempotency + double submits, PUT / PATCH / DELETE + auth header | 11 | | | |
| 1:41 | **Ex 4 · Leave a review** (48) — cases 1–3 | | 13 | POST, 422, disabled while pending | `exercises/04-post.html` |
| 1:54 | **Act 5 · Origins & races** (49–54) — same-origin policy, CORS + preflight, CORS live demo (3 min), race lab, AbortController | 11 | | | `playgrounds/race-lab.html` |
| 2:05 | **Ex 5 · Search without races** (55) — case 1 | | 6 | AbortController | `exercises/05-races.html` |
| 2:11 | **Wrap** (56–57) — today in one slide (incl. keys and tokens are public), homework | 2 | | | |
| 2:13 | **Team build intro** (58–59) — connect the market: the four steps (individually); then the homework: feature requests as GitHub issues, one PR for review, AI allowed | 2 | | | `team/connect.html` |
| 2:15 | **Team build** (60) — fork, clone, `npm start` in the first 5 minutes | | 45 | connect the market to the API, chaos on, a pull request | `team/connect.html`, the starter repo |
| 3:00 | end | | | | |

**The team build is the buffer.** If the first half runs 5 minutes late, the
build is 40 minutes: the four core items still fit; skip the chaos phase and
tell teams to run it at home. The full briefs are homework by design.

**Act 2 is the longest act** (19 minutes): async first (slides 17–23, about
10 minutes), then fetch. The event loop lab is the centre: predict on slide
18, step through on slide 19. If it runs over, skip the lab's second program
(the `await` one) and show it at home; slide 23 says the same in words.

**Act 1 is tight** (12 minutes, 10 slides). If it runs over, the status-code
table (slide 10) shrinks to its four Harbour rows (201, 404, 422, 503) and the
rest is "read it at home". REST-style resource naming is in `api.html`.

**Cut order if you run late:** slide 47 (PUT/PATCH/DELETE: "same shape,
different method"; brief 5 repeats it), slide 36 (accessible async UI: read the
six labels, 30 s), the request lab's last two presets, the second program of
the event loop lab. Don't cut slide 25 (404 resolves), slides 18–19 (the event
loop) or slide 42 (three ways to get a POST wrong): they're the ideas every
student needs tonight. The reference material cut from earlier drafts lives in
`api.html` (headers, resources) and the cheat sheet (Response readers).

## Pre-class checklist

0. **Deploy the course server** (once, and after any change to
   `project/server/api-core.js`): `cd worker && npm install && npm test &&
   npx wrangler deploy` (the first time: `npx wrangler login`). It creates
   `harbour-api.lopin.me` as a custom domain (lopin.me is on Cloudflare).
   Open https://harbour-api.lopin.me, type a username, press Check: 10 stalls.
1. Run the solution once: `cd project/server && npm start` (it serves `.private/solution/`), open
   `http://localhost:3000`. Ten vendors with ratings. Then `npm run chaos` and
   reload a few times: loading, the error box, Try again.
2. **Rehearse the CORS demo (slide 52)**, and set it up again during the break so it takes three minutes:
   - In `.private/solution/js/api.js` (the connected market, not shared with
     students) set `API = "http://localhost:3000/api"`.
   - Serve `project/solution` with live-server on another port (it'll say 8080
     or similar; use whatever it prints in the next step).
   - Server *without* CORS: `npm start`. Reload the live-server page: "no
     connection", the console shows "blocked by CORS policy", the Network panel
     shows "CORS error".
   - Restart with `node server.js --cors http://localhost:8080`: the origin
     exactly as the browser's address bar shows it. live-server often opens
     `http://127.0.0.1:8080`, which is a *different origin* from
     `localhost:8080`; use whichever the tab shows. Reload: ten vendors.
   - Optional: post a review from that page (via the console:
     `fetch("http://localhost:3000/api/stalls/taco-bike/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author: "Demo", rating: 5, text: "Preflight, then post." }) })`)
     and show the OPTIONS request before the POST.
   - **Set `API` back to `"/api"`** before you zip or push anything.
3. Rehearse the live slides: 12 (request lab: all stalls → 404 → POST → the
   two broken POSTs), 19 (event loop lab: both programs, every step; read the
   notes once so you can say each step in your own words), 27 (fetch sandbox:
   change `tag=food` to `tag=pizza`, then `/api/stalls/pizza`), 52 (race lab:
   Naive ▶, Ignore stale ▶, AbortController ▶, debounce). `Esc` leaves an editor so the arrows move slides again.
4. The exercise pages have no solutions. The reference code is in
   `.private/solutions.md` (teacher only, not linked from any page): paste a case's
   solution into its editor once and every check turns green. Ex 3's and Ex 5's checks
   take 3–5 seconds (they wait for slow responses on purpose).
5. Check Open-Meteo and Frankfurter answer from the classroom network (brief 6
   and spare 7): `curl -I "https://api.open-meteo.com/v1/forecast?latitude=41.38&longitude=2.18&hourly=temperature_2m"`.
   and `curl -I "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=GBP"`.
   If the network blocks them, hide brief 6 (and spare 7).

## Answer keys

**Event loop quiz (slide 18).** `A E D B C`: synchronous code first, then
microtasks (the resolved promise's callback), then one task (the 0 ms timer),
the network last. Common wrong answers: A B C D E (code order), A E B D C
(timers before promises).

**Which queue quiz (slide 21).** `C A G D F E B`: the `Promise` executor and
`button.click()` run synchronously (no queue), then G; microtasks D, F, then E
(queued by D while the queue drains); then the timer task B. Common wrong
answers: A last ("events are async"), C after G ("promises are async").

**Ex 1 · Read the wire.** 10 (`X-Total-Count`) · 404 · 3.7 (`GET
/api/stalls/mezcal`; reviews 4, 2, 5) · Churros Till Late (`?tag=food&sort=price`;
sold out but cheapest) · 201 · Location · 415 · GET, POST (a `DELETE` or `PUT`
on `/api/stalls` answers 405 with `Allow: GET, POST`). Answers are compared
loosely (case, spacing, "404 Not Found" all pass).

**Ex 2 · Load the market.** 1 `loadStalls` returns `(await fetch("/api/stalls")).json()`;
`loadStalls().then(render)`. A top-level `await` is a SyntaxError in these
classic-script editors (the hint says so). 2 `getJSON` reads the body with
`.json().catch(() => null)`, throws `new Error(\`${status} ${body?.message ??
statusText}\`)` when `!response.ok`. The checks call it with a 404 and with a
server that answers 503 to everything. 3 `stallsUrl(tag)` with
`URLSearchParams`, no parameter for `"all"` (the server answers 400 to
`tag=all`: the check "no 400 on the way" catches it); the listener calls
`press(tag)` then `render(await loadStalls(tag))`. Bonus 4: `sort` added to
the same params, re-load on `change`; the check verifies the server's order
(Churros first, Dumplings last for food by price).

**Ex 3 · Slow and broken.** 1 `loadStalls()` sets `"loading"`, renders,
awaits, sets `"ready"`, renders; `render()` sets `aria-busy` and the status
line. The checks use a 500 ms server and look at 150 ms and 800 ms. 2 `try …
catch` around the request; `catch` logs the error, sets `stalls = []`,
`error = describe(error)` (given: a sentence based on `error.status`),
`"error"`; `render()` writes `.error-text` (a `role="alert"` that is never
hidden, only emptied, so it's announced) and toggles the Try again button; the
status line is blank in the error state (the common miss: "Loading…" still
showing). Checked against 503s, a dead network (the message must not be the
raw "Failed to fetch"), and for no uncaught errors. 3 the click handler moves
focus to the status line (`tabindex="-1"`) and calls `loadStalls()`: the button
hides itself, and a check verifies focus didn't fall to `<body>`. Bonus 4:
empty is derived (`ready && stalls.length === 0`).

**Ex 4 · Leave a review.** 1 `Object.fromEntries(new FormData(form))`,
`rating: Number(data.rating)`, POST with `Content-Type: application/json` and
`JSON.stringify`; on `response.ok` read the body, prepend
`reviewItem(created)` (the check compares the `<li>`'s `data-id` with the id
in the response) and `form.reset()`. The body is read per branch: the 201's
review, or the 422's `{ fields }`. Three checks map to the three bugs of slide 42.
2 `showErrors(fields)` fills each `.field-error[data-for]`, toggles `hidden`
and `aria-invalid`; 422 → `showErrors(body.fields)`; other statuses and
`catch` → a sentence in `.form-status`; the form isn't reset on failure. The
checks force a 422, a 503 and a network failure on the POST route only. 3
`button.disabled = true` + "Posting…" before, `finally { button.disabled =
false }`. The double-click check submits twice 30 ms apart on a 300 ms
server.

**Ex 5 · Search without races.** `controller?.abort(); controller = new
AbortController();` before each request, `{ signal: controller.signal }`
passed through `getJSON`, `catch` returns on `error.name === "AbortError"`.
The server's search delay is `max(120, 1000 − 280 × q.length)` ms, so typing
t · ta · tac makes "t" arrive last. The checks: the list shows only Taco Bike,
two requests are canceled, nothing uncaught. A request-counter solution
("ignore stale") fixes the display but fails the "aborted" check, on purpose:
the exercise is about `AbortController`. Bonus: debounce 250 ms + keep the
abort.

## The team build

**Everyone does the same task first: connect the market** (`team/connect.html`).
Students fork **github.com/nlopin/harbour-market-starter**: `starter/`,
which is Lecture 5's market with hand-typed `data.js`, an `api.js` with the
signatures but no bodies and `API` waiting for their username, and
`css/fetch.css` already styling the loading message, the error box and the
ratings. `npm start` runs live-server on `localhost:8080`, so the page works
from minute one with 8 stalls; the API is their own market on
harbour-api.lopin.me (cross-origin, allowed). They work on a branch and hand
in a **pull request** against `main` (the README explains fork → branch → PR);
a brief from step 2 is a second branch and a second PR. Unfinished work: a
draft PR. The server stays yours: it isn't in the repository at all.
`.github/CODEOWNERS` assigns `package.json` and `.github/` to you, and a
GitHub Actions check ("Course files are read-only") fails a student PR that
touches them (your own PRs skip it). To make it binding: Settings → Branches →
`main` → Require a pull request + Require review from Code Owners, and the
check as a required status check.

The steps: `api.js` (`API`, `request`, `HttpError`, `describe`), the stalls
into `state` with `loadStalls()`, the status line + `role="alert"` error + Try
again, ratings, chaos on. Checkpoint at minute 12: in the console,
`(await import("/js/api.js")).getJSON("/stalls")` gives 10 stalls.

Reference: `.private/solution/` in this folder (not in the repository). `npm
start` in `project/server/` serves it against the local server. The API has
one source, `project/server/api-core.js`: the Worker, the local server, the
exercise editors and the labs all use it. After changing it, redeploy the
Worker.

Those who finish pick a brief: six briefs + two spares in `team/`, in the
game-jam format, each starting from a connected market. Four core items are
the minimum for the demo next class; the full feature (three lanes: requests ·
states · errors) is homework. Brief 6's point is the opposite of
`Promise.all`: two independent requests, neither waiting for the other.

| Brief | Core skill | Watch for |
| --- | --- | --- |
| 1 Review wall ★☆☆ | GET/POST/DELETE, 422 in a dialog | stale reviews from the previous stall (race), card rating not refreshed |
| 2 Order board ★★☆ | polling, stopping, 409 | stacked intervals, polling forever after 404 (market reset) |
| 3 Instant search ★★☆ | debounce + abort + URL state | `pushState` on every keystroke, Back not re-rendering, `visibleStalls()` still filtering by name on the client |
| 4 Saved on the server ★★☆ | optimistic UI + rollback, 204 | `json()` on a 204, rollback of the wrong ♥, on-off-on ordering |
| 5 Vendor admin ★★★ | Authorization, PATCH, 401 vs 403 (admin and vendor tokens), 409, 422 | `Bearer` typo, price as a string, filling the starter table (`admin.html`, `js/admin.js` are provided) |
| 6 Weather ★★☆ | third-party API, cache with expiry, independent requests | time zones, the vendor list waiting for the weather (`Promise.all`) |
| 7 Currency (spare) | third-party API, `Intl.NumberFormat` | float noise, converting twice |
| 8 Load more (spare) | pagination headers | `getJSON` hides headers; mixing two lists |

Minute 12 is the checkpoint: every team shows you one request of theirs in the
Network panel. A team that can't is stuck on setup: page opened from the file
system, wrong port, server not running. Demos open the next class (3 minutes
per team: happy path with the Network panel, chaos on, one request in code, one
bug).

## Things students ask, and short answers

- **"axios?"** A library that rejects on 4xx/5xx, serialises JSON for you and
  has interceptors. Everything it does is a few lines on top of `fetch`
  (today's `api.js`). Fine in a project; learn `fetch` first.
- **"Why not `XMLHttpRequest`?"** It's what `fetch` replaced: callbacks, no
  promises, no streams. You'll see it in old code and in upload progress bars.
- **"Is the fake server in the exercises real?"** The rules are: it's the same
  `api-core.js` as the Node server. Only the transport is faked.
- **"Can I call a real API from my project?"** If it sends CORS headers and
  needs no secret key (Open-Meteo, Frankfurter, PokéAPI): yes. If it needs a
  key, the key needs a server of yours in between.
- **"Why 422 and not 400?"** Both are common; 422 says "I understood the JSON,
  the values are wrong". Read each API's docs.
- **"401 or 403?"** 401: the server doesn't know who you are (no credentials,
  or invalid ones): log in again. 403: it knows, and the answer is no. The
  Harbour API has admin and vendor tokens to show both.
- **"Where do I store the token?"** In this course, `sessionStorage` (brief 5).
  In production, preferably an `HttpOnly` cookie set by the server at login.
- **"Is `async`/`await` slower than `.then()`?"** Same promises underneath.
- **"Is JavaScript multi-threaded?"** Your page's JavaScript runs on one
  thread. Web Workers run scripts on other threads, with no access to the DOM,
  talking to the page by messages. The browser itself (network, rendering
  parts, timers) uses many threads; that's where the waiting happens.
- **"Is `setTimeout(f, 0)` immediate?"** No: it queues a task, which runs after
  the current code and all microtasks. Browsers also clamp nested timers to
  ≥ 4 ms.
- **"WebSockets? Server-sent events?"** For push from the server. Polling
  (brief 2) is the simple version; mention `EventSource` if someone finishes
  early.

## Files

```
slides.html                 the deck (p = presenter, m = menu, n = notes)
index.html                  the hub page for students
api.html                    the Harbour Market API reference
cheatsheet.html             one A4 page
exercises/                  01 read the wire · 02 load · 03 states · 04 post · 05 races
playgrounds/                loop-lab · request-lab · fetch-sandbox · race-lab
team/                       index + 6 briefs + 2 spares, team.css
project/server/             server.js, api-core.js (the API, shared with kit.js), package.json
.private/solution/           the connected market (teacher only); npm start in project/server serves it
worker/                     the course server: Cloudflare Worker + Durable Objects (npm test, npx wrangler deploy)
(students)                  github.com/nlopin/harbour-market-starter: starter/
                            (Lecture 5's market, api.js skeleton, fetch.css, brief 5's admin starter)
.private/                   gitignored, local only: solutions.md (exercises + Exercise 1's answers),
                            solution/ (the connected market)
assets/                     deck.js · deck.css · kit.js (+ fake server, Network tab, labs) · kit.css
```
