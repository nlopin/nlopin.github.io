# harbour-api · the course server

The Harbour Market API on Cloudflare Workers: https://harbour-api.lopin.me.
One Durable Object per namespace (a student's GitHub username), so every
student has their own persisted, resettable market. The API's rules are
`../project/server/api-core.js`, bundled in at deploy.

```sh
npm install
npm test             # runs the Worker in Node against a fake Durable Object binding
npm run dry-run      # bundles it, checks the bindings, deploys nothing
npx wrangler login   # once
npm run deploy       # wrangler deploy: the Worker, the Durable Object class, the custom domain
npm run tail         # everyone's requests, live
```

Routes:

```
/                         the control page: your market's URL, chaos, reset
/<ns>/api/…               the Harbour Market API (api.html), per namespace
/<ns>/api/_chaos          GET / PUT { "latency": 0–5000, "fail": 0–1 }
/<ns>/api/_reset          POST: back to the seed data
?chaos=1                  1.2 s + 30 % 503s for one request
```

`RANDOM_500_RATE` (wrangler.toml, `"0.1"`) answers that share of every
market's API requests with a 500 before they reach the API; students can't
turn it off. Set it to `"0"` and redeploy to disable.

Teacher routes need `Authorization: Bearer <TEACHER_KEY>` (a wrangler secret;
the key is in `../.private/teacher-key.txt`, gitignored):

```sh
K=$(cat ../.private/teacher-key.txt)
curl -H "Authorization: Bearer $K" https://harbour-api.lopin.me/_markets          # every market: last seen, counts
curl -H "Authorization: Bearer $K" https://harbour-api.lopin.me/<user>/api/_dump  # one market's stored data
npx wrangler secret put TEACHER_KEY                                                # change the key
```

Every response carries `Access-Control-Allow-Origin: *`; preflights are
answered. Limits per namespace: 500 reviews, 500 orders, 60 stalls, 100 kB
bodies. The free plan covers a class comfortably (100,000 requests a day).
