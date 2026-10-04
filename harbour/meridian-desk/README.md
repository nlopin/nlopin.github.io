# Meridian front desk · setup

Homework CTF. Students check in here (`index.html`), hunt for 13 codes on the
hotel site (`../meridian/`) and hand them in here, one field for every code.
You watch progress on `dashboard.html`.

Answers and hints are not in this repo: they live in the database, imported
from `.private/import.json` (gitignored), and the rules stop any browser from
reading them.

## One-time setup

1. **Create a Firebase project** at console.firebase.google.com (Spark plan is
   enough). No Analytics needed.
2. **Authentication** → Get started → Sign-in method → enable **Google**.
   Settings → Authorized domains → add `nlopin.github.io`
   (`localhost` is there already).
3. **Realtime Database** → Create database (europe-west1) → start in locked
   mode.
4. **Rules** tab → paste `database.rules.json` → Publish.
5. **Data** tab → ⋮ → Import JSON → `.private/import.json`. Imports at the
   root, so do it before anyone signs in.
6. **Project settings** → Your apps → add a Web app → copy `apiKey`,
   `authDomain`, `databaseURL`, `projectId`, `appId` into `firebase.js`.
7. Open `dashboard.html`, sign in. It shows your uid. In the Data tab add
   `admins/<uid>` = `true` (boolean), reload.

## Dates

Hints unlock and the deadline are set in two places, which must match:

- `stamps.js`: `HINTS_FROM`, `DEADLINE` (ms since epoch)
- `database.rules.json`: the number in `hints/.read`

Hints are enforced by the rules, so nobody can read them early. The deadline
isn't enforced: late hand-ins are accepted and shown in red on the dashboard.

## How validation works

**Check-in.** On sign-in the desk writes `students/<uid>/tails`: one
4-character tail per personal stamp, cut from the student's own uid. The rule
checks `auth.uid.contains(tail)`, so nobody can copy someone else's tails.
The desk caches them in `localStorage` (`meridian.card`), where the hotel's
`card.js` reads them. Same origin, so the hotel needs no sign-in.

**Hand-in.** The single field is tried against every stamp still open: a
write to `students/<uid>/solves/<stamp>` with `{ code, at }`. The rule
accepts it only if `code` equals `answers/<stamp>`, plus the student's tail
for stamps listed in `personal`. At most one stamp matches; the rest come
back as permission errors.

**Personal stamps:** 3, 4, 6, 7, 9, 10, 12, 13. **Shared:** 1, 2, 5, 8, 11
(static HTML, letter tiles or a data answer, where a tail has nowhere to go).
