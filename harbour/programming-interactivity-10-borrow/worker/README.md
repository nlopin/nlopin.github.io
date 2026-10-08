# fleet · the live delivery server

The live server for Lecture 10, Act 3, on Cloudflare Workers: https://fleet.lopin.me.
Couriers connect over a WebSocket and send their positions. Order trackers and
the dispatcher map listen over SSE. One Durable Object holds the whole class.
State lives in memory only, so a redeploy forgets every courier and order.

```sh
npm install
npm test             # runs the Worker in Node with fake WebSocketPair and Durable Object bindings
npm run dev          # wrangler dev on localhost:8787; put TEACHER_KEY=… in .dev.vars
npm run dry-run      # bundles it, checks the bindings, deploys nothing
npx wrangler login   # once
npx wrangler secret put TEACHER_KEY   # once; the Lecture 8 key works: ../../programming-interactivity-8-fetch/.private/teacher-key.txt
npm run deploy       # the Worker, the Durable Object class, the custom domain
npm run routes       # rebuilds src/routes.json from the public OSRM router (only if the stops change)
```

## Pages

- `/`: the dispatcher map, for the projector. Every courier, once a second, over SSE.
- `/teacher`: bots (0–30), **drop all connections**, reset. Asks for the teacher key.

## The simulation

`src/routes.json` holds two delivery loops through Barcelona (Eixample · Gràcia,
Ciutat Vella · Poblenou). Each has six stops that alternate restaurant and
customer, with bike routes between them, one point every 10 m. An order goes
from the previous customer to a restaurant (pickup), then to the next customer
(dropoff). The next order starts where the last one ended, so a courier can
deliver forever.

Everything runs at one route point per second: 10 m/s, about 3× a real bike.
A client that replays its route at that rate matches the server's ETA, which
is the number of remaining points in seconds.

The server works out the status from the position: `to_pickup`, then
`picked_up` within 20 m of the restaurant, then `delivered` within 20 m of the
customer. Three seconds after a delivery the courier gets its next order.
Bots (`BOTS` in wrangler.toml, 6 at start) drive the same loops server-side.
The clock runs only while someone is connected.

## Courier · WebSocket `/courier`

JSON text messages. The first message must be a `hello`; a connection without
one is closed after 10 s (1008).

Client → server:

```js
{ "type": "hello", "name": "Ana" }                       // a new courier
{ "type": "hello", "courierId": "c_…" }                  // resume: same order, same progress
{ "type": "position", "lat": 41.3871, "lon": 2.1702 }    // ignored if sent less than 150 ms after the last
{ "type": "message", "text": "Two minutes away" }        // to the order's trackers
"ping"                                                   // answered with the text "pong"
```

Server → client:

```js
{ "type": "welcome", "courierId": "c_…", "name": "Ana", "resumeAt": 0,
  "order": { "id": "8VUA", "pickup": {…}, "dropoff": {…}, "route": [[lat, lon], …], "pickupIndex": 211, "status": "to_pickup" } }
{ "type": "status", "orderId": "8VUA", "status": "picked_up" }   // or "delivered"
{ "type": "order", "order": {…} }                                // the next order, 3 s after a delivery
{ "type": "message", "orderId": "8VUA", "from": "customer", "text": "Door code is 4721.", "at": … }
{ "type": "error", "error": "hello_first", "message": "…" }
```

Close codes: 1012 when the teacher drops every connection, 4000 when the same
courier opens a newer connection, 1008 without a hello, 1013 when the fleet is
full (150 couriers).

## Trackers · SSE

- `GET /orders`: the active orders, JSON, and those delivered in the last 2 minutes.
- `GET /orders/:id`: one order: route, status, position, ETA, messages. The id is case-insensitive.
- `GET /orders/:id/events`: SSE. The stream starts with `retry: 2000`. A first connection gets one
  `order` event (the whole state). After that it gets `position` (`lat`, `lon`, `etaSeconds`),
  `status`, `message` (`from`, `text`) and `courier` (`online`). Every event has an `id`. A reconnect
  with `Last-Event-ID` (EventSource sends it by itself) replays only the missed events, from the
  last 120; further behind than that, it gets a fresh `order` event.
- `POST /orders/:id/messages` `{ "text": "…" }`: the customer writes to the courier. Returns 201,
  422 for an empty or long text, 409 once delivered.
- `GET /fleet/events`: SSE, one `fleet` event a second: every courier's name, position, status and
  ETA. Courier ids are shortened here, because the full id resumes a courier.

A comment line (`: heartbeat`) goes to every stream every 15 s.

Teacher routes need `Authorization: Bearer <TEACHER_KEY>`: `POST /_drop`,
`POST /_reset`, `PUT /_bots { "count": n }`, `GET /_stats`.

```sh
K=$(cat ../../programming-interactivity-8-fetch/.private/teacher-key.txt)
curl -X POST -H "Authorization: Bearer $K" https://fleet.lopin.me/_drop
```

Every response carries `Access-Control-Allow-Origin: *`. Routes: OSRM bike
profile on OpenStreetMap data, © OpenStreetMap contributors, ODbL.
