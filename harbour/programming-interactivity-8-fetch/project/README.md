# Lecture 8 project · teacher copy

Students don't use this folder. They fork
https://github.com/nlopin/harbour-market-starter (Lecture 5's static market),
point it at their own market on the course server
(https://harbour-api.lopin.me/<github-username>/api), and hand it in as a
pull request.

This folder keeps:

- `server/api-core.js`: **the API**, the single source of its rules. The
  course server (`../worker/`), the local server below, the exercise editors
  and the labs (`../assets/kit.js`) all use it. After changing it, redeploy
  the Worker: `cd ../worker && npm test && npx wrangler deploy`.
- `server/server.js`: the local Node server, no dependencies. The fallback for
  a dead classroom network and the server for the Act 5 CORS demo (CORS off
  unless `--cors`).
- The reference solution of "Connect the market" is in `../.private/solution/`
  (gitignored: this repository is the public site). The local server serves it
  when it exists. It talks to the local server (`API = "/api"`); to try it
  against the course server, set `API` in its `js/api.js` to your market's URL.

```sh
cd server
npm start            # the solution + the API on http://localhost:3000
npm run chaos        # 1.2 s latency, 30 % of API requests answer 503
```
