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

Every response carries `Access-Control-Allow-Origin: *`; preflights are
answered. Limits per namespace: 500 reviews, 500 orders, 60 stalls, 100 kB
bodies. The free plan covers a class comfortably (100,000 requests a day).
