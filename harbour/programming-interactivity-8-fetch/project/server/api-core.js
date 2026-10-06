/* ==========================================================================
   Harbour Market API · the server's logic, and nothing else.

   A plain object in, a plain object out:
     handle({ method, path, query, headers, body })
       → { status, headers, body, delay }
   No sockets, no files. server.js wraps it in a real HTTP server; the
   exercise pages wrap it in a fake fetch() inside their preview frames
   (assets/kit.js). One implementation, so the rules are the same everywhere.

   The data lives in memory: restart the server and it's back to the seed.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HarbourAPI = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.0.0";
  // Two kinds of credentials. The admin token may change any stall; a vendor
  // token ("vendor-<stall id>") may only PATCH its own stall. Public on purpose:
  // this is a course server.
  const ADMIN_TOKEN = "harbour-admin-2026";
  const VENDOR_PREFIX = "vendor-";
  const TAGS = ["food", "music", "crafts", "drinks"];

  const STATUS_TEXT = {
    200: "OK", 201: "Created", 204: "No Content", 304: "Not Modified",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    405: "Method Not Allowed", 409: "Conflict", 415: "Unsupported Media Type",
    422: "Unprocessable Content", 429: "Too Many Requests",
    500: "Internal Server Error", 503: "Service Unavailable",
  };

  // Ten stalls: the eight from Lecture 5 plus two that only the server knows.
  const SEED_STALLS = [
    { id: "dumplings", name: "Dumpling Dynasty", tag: "food", price: 8, soldOut: false, featured: true,
      blurb: "Hand-folded xiaolongbao, steamed in front of you. The queue is part of the experience, and so is the chilli oil." },
    { id: "side-b", name: "Side B Records", tag: "music", price: 12, soldOut: false,
      blurb: "Crates of second-hand vinyl, sorted by mood instead of genre." },
    { id: "salt-ink", name: "Salt & Ink", tag: "crafts", price: 15, soldOut: false,
      blurb: "Risograph posters of the port, printed in two colours and signed while you wait." },
    { id: "churros", name: "Churros Till Late", tag: "food", price: 5, soldOut: true,
      blurb: "Crisp, sugared and dunked in thick chocolate." },
    { id: "plant-swap", name: "The Plant Swap", tag: "crafts", price: 0, soldOut: false,
      blurb: "Bring a cutting, take a cutting. Pots are free, advice is free, gossip is extra." },
    { id: "mezcal", name: "Mezcal Moon", tag: "drinks", price: 9, soldOut: true,
      blurb: "Small-batch mezcal and orange slices dusted with chilli salt. Sip, don't shoot." },
    { id: "taco-bike", name: "Taco Bike", tag: "food", price: 6, soldOut: false,
      blurb: "Tacos al pastor from a cargo bike. Pineapple on the spit, salsa as hot as you dare." },
    { id: "lemonade", name: "Lantern Lemonade", tag: "drinks", price: 3, soldOut: false,
      blurb: "Fresh lemonade with a sprig of mint, served in a paper lantern cup." },
    { id: "night-noodles", name: "Night Noodles", tag: "food", price: 7, soldOut: false,
      blurb: "Hand-pulled noodles in a smoky broth. Slurping encouraged." },
    { id: "brass-bones", name: "Brass & Bones", tag: "music", price: 0, soldOut: false,
      blurb: "A tuba, a snare drum and a lot of heart, on the pier every hour." },
  ];

  // [stallId, author, rating, text, minutes before "now"]
  const SEED_REVIEWS = [
    ["dumplings", "Marta", 5, "Best xiaolongbao this side of the harbour. Worth the queue.", 1440],
    ["dumplings", "Joan", 4, "Great dumplings, the chilli oil is dangerous.", 900],
    ["dumplings", "Ana", 5, "We came back twice in one night.", 300],
    ["side-b", "Pau", 5, "Found a Cesária Évora LP I'd been hunting for years.", 2000],
    ["side-b", "Lea", 3, "Good crates, prices a bit steep.", 700],
    ["salt-ink", "Nora", 4, "Bought the crane poster. Signed while I waited.", 1200],
    ["churros", "Iker", 5, "Chocolate thick enough to stand a spoon in.", 2500],
    ["churros", "Sofia", 4, "Sold out by ten, come early.", 400],
    ["plant-swap", "Elif", 5, "Swapped a pothos for a monstera cutting. Lovely people.", 1600],
    ["mezcal", "Diego", 4, "Smoky and smooth. The chilli salt oranges are a revelation.", 800],
    ["mezcal", "Kai", 2, "Too strong for me, friendly staff though.", 650],
    ["mezcal", "Rosa", 5, "Ask for the espadín.", 200],
    ["taco-bike", "Omar", 5, "The al pastor is the real thing.", 1100],
    ["taco-bike", "Bea", 4, "Salsa roja is very hot. As promised.", 500],
    ["lemonade", "Tomás", 3, "Nice cup, a little too sweet.", 950],
    ["night-noodles", "Mei", 5, "The broth! Hand-pulled while you watch.", 350],
  ];

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const isPlainObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  function createAPI(options) {
    options = options || {};
    const now = options.now || (() => Date.now());
    const random = options.random || Math.random;
    // Chaos, for practising loading and error states
    const config = {
      failRate: options.failRate || 0,   // 0…1: share of requests answered 503
      orderSeconds: options.orderSeconds || [5, 15], // placed → preparing → ready
    };

    const t0 = now();
    let nextReview = 1;
    let nextOrder = 1;
    const db = {
      stalls: clone(SEED_STALLS),
      reviews: SEED_REVIEWS.map(([stallId, author, rating, text, minutesAgo]) => ({
        id: "r" + nextReview++, stallId, author, rating, text,
        createdAt: new Date(t0 - minutesAgo * 60000).toISOString(),
      })),
      saved: new Set(),
      orders: [],
    };

    // A hosted server (worker/) persists its data between requests:
    // options.state is what dump() returned earlier.
    if (options.state) {
      const st = options.state;
      db.stalls = st.stalls;
      db.reviews = st.reviews;
      db.saved = new Set(st.saved || []);
      db.orders = st.orders || [];
      nextReview = st.nextReview || nextReview;
      nextOrder = st.nextOrder || nextOrder;
    }
    const dump = () => ({ stalls: db.stalls, reviews: db.reviews, saved: [...db.saved], orders: db.orders, nextReview, nextOrder });

    /* ---- helpers ------------------------------------------------------- */
    const json = (status, body, headers) => ({ status, headers: headers || {}, body });
    const fail = (status, error, message, extra) => json(status, Object.assign({ error, message }, extra || {}));
    const notFound = (what) => fail(404, "not_found", what);

    function withStats(stall) {
      const rs = db.reviews.filter((r) => r.stallId === stall.id);
      const rating = rs.length ? Math.round((rs.reduce((n, r) => n + r.rating, 0) / rs.length) * 10) / 10 : null;
      return Object.assign({}, stall, { rating, reviewCount: rs.length });
    }

    function orderView(o) {
      const age = (now() - Date.parse(o.placedAt)) / 1000;
      const [prep, ready] = config.orderSeconds;
      const status = age < prep ? "placed" : age < ready ? "preparing" : "ready";
      return Object.assign({}, o, { status });
    }

    // Read the body the way a real JSON API would: check the type, then parse.
    function readJSON(req) {
      const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (type !== "application/json") {
        return { error: fail(415, "unsupported_media_type",
          `Send the body as JSON with the header Content-Type: application/json (got ${type ? `"${type}"` : "no Content-Type"}).`) };
      }
      if (req.body == null || req.body === "") return { error: fail(400, "bad_request", "The request has no body.") };
      try {
        const data = JSON.parse(req.body);
        if (!isPlainObject(data)) return { error: fail(400, "bad_request", "The body must be a JSON object: { … }.") };
        return { data };
      } catch (e) {
        const shown = String(req.body).length > 40 ? String(req.body).slice(0, 40) + "…" : String(req.body);
        return { error: fail(400, "bad_request", `The body is not valid JSON: ${shown}`) };
      }
    }

    // 401: we don't know who you are (no credentials, or invalid ones).
    // 403: we know who you are, and you may not do this.
    function authenticate(req) {
      const auth = String(req.headers.authorization || "");
      const challenge = { "WWW-Authenticate": 'Bearer realm="harbour"' };
      if (!auth) return { denied: json(401, { error: "unauthorized", message: "This endpoint needs the header Authorization: Bearer <token>." }, challenge) };
      const token = /^bearer /i.test(auth) ? auth.slice(7).trim() : ""; // the scheme is case-insensitive
      if (token === ADMIN_TOKEN) return { role: "admin" };
      if (token.startsWith(VENDOR_PREFIX) && db.stalls.some((s) => s.id === token.slice(VENDOR_PREFIX.length))) return { role: "vendor", stallId: token.slice(VENDOR_PREFIX.length) };
      return { denied: json(401, { error: "invalid_token", message: "That token isn't valid. Expected Authorization: Bearer <token>." }, Object.assign({}, challenge, { "WWW-Authenticate": 'Bearer realm="harbour", error="invalid_token"' })) };
    }
    function requireAdmin(req) {
      const who = authenticate(req);
      if (who.denied) return who.denied;
      if (who.role !== "admin") return fail(403, "forbidden", "Vendor tokens can only edit their own stall.");
      return null;
    }

    function validateStall(data, partial) {
      const fields = {};
      const out = {};
      if (!partial || "name" in data) {
        if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 40) fields.name = "Required, 1–40 characters.";
        else out.name = data.name.trim();
      }
      if (!partial || "tag" in data) {
        if (!TAGS.includes(data.tag)) fields.tag = `One of: ${TAGS.join(", ")}.`;
        else out.tag = data.tag;
      }
      if (!partial || "price" in data) {
        if (typeof data.price === "string") fields.price = `A number, not a string ("${data.price}").`;
        else if (!Number.isInteger(data.price) || data.price < 0 || data.price > 100) fields.price = "A whole number of euros, 0–100.";
        else out.price = data.price;
      }
      if (!partial || "blurb" in data) {
        if (typeof data.blurb !== "string" || data.blurb.trim().length > 200) fields.blurb = "Text, up to 200 characters.";
        else out.blurb = data.blurb.trim();
      }
      if ("soldOut" in data) {
        if (typeof data.soldOut !== "boolean") fields.soldOut = "true or false.";
        else out.soldOut = data.soldOut;
      }
      return { fields, out };
    }

    function validateReview(data) {
      const fields = {};
      const author = typeof data.author === "string" ? data.author.trim() : "";
      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (!author || author.length > 40) fields.author = "Required, up to 40 characters.";
      if (typeof data.rating === "string") fields.rating = `A number, not a string ("${data.rating}").`;
      else if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) fields.rating = "A whole number from 1 to 5.";
      if (text.length < 10 || text.length > 280) fields.text = "10–280 characters.";
      return { fields, review: { author, rating: data.rating, text } };
    }

    const invalid = (fields) => fail(422, "validation_failed", "Some fields are invalid.", { fields });

    /* ---- routes ---------------------------------------------------------- */
    // [method, pattern, handler]: the pattern's :params arrive in `p`
    const routes = [
      ["GET", "/api", () => json(200, {
        name: "Harbour Market API", version: VERSION,
        resources: ["/api/stalls", "/api/stalls/:id", "/api/stalls/:id/reviews", "/api/reviews/:id", "/api/saved", "/api/orders"],
      })],

      ["GET", "/api/stalls", (req) => {
        const q = String(req.query.get("q") || "").trim().toLowerCase();
        const tag = req.query.get("tag");
        const sort = req.query.get("sort");
        if (tag && !TAGS.includes(tag)) return fail(400, "bad_request", `Unknown tag "${tag}". Use one of: ${TAGS.join(", ")}.`);
        let list = db.stalls.map(withStats);
        if (tag) list = list.filter((s) => s.tag === tag);
        if (q) list = list.filter((s) => s.name.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q));
        if (sort) {
          const desc = sort.startsWith("-");
          const key = desc ? sort.slice(1) : sort;
          if (!["name", "price", "rating"].includes(key)) return fail(400, "bad_request", `Can't sort by "${sort}". Use name, price or rating (prefix - for descending).`);
          list.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (desc ? -1 : 1));
        }
        const total = list.length;
        const headers = { "X-Total-Count": String(total) };
        if (req.query.has("limit") || req.query.has("page")) {
          const limit = Math.max(1, Math.min(50, parseInt(req.query.get("limit"), 10) || 4));
          const page = Math.max(1, parseInt(req.query.get("page"), 10) || 1);
          const pages = Math.max(1, Math.ceil(total / limit));
          list = list.slice((page - 1) * limit, page * limit);
          const link = (n, rel) => { const u = new URLSearchParams(req.query); u.set("page", n); u.set("limit", limit); return `</api/stalls?${u}>; rel="${rel}"`; };
          const links = [];
          if (page < pages) links.push(link(page + 1, "next"));
          if (page > 1) links.push(link(page - 1, "prev"));
          if (links.length) headers.Link = links.join(", ");
        }
        // A search is slower the shorter the query (more matches to rank): the
        // response to "t" arrives after the response to "tac". Good for races.
        const delay = q ? Math.max(120, 1000 - 280 * q.length) : undefined;
        return Object.assign(json(200, list, headers), { delay });
      }],

      ["POST", "/api/stalls", (req) => {
        const denied = requireAdmin(req); if (denied) return denied;
        const { data, error } = readJSON(req); if (error) return error;
        const { fields, out } = validateStall(data, false);
        if (Object.keys(fields).length) return invalid(fields);
        const id = slug(out.name);
        if (db.stalls.some((s) => s.id === id)) return fail(409, "conflict", `A stall with the id "${id}" already exists.`);
        const stall = Object.assign({ id }, out, { soldOut: out.soldOut ?? false });
        db.stalls.push(stall);
        return json(201, withStats(stall), { Location: `/api/stalls/${id}` });
      }],

      ["GET", "/api/stalls/:id", (req, p) => {
        const stall = db.stalls.find((s) => s.id === p.id);
        return stall ? json(200, withStats(stall)) : notFound(`No stall with the id "${p.id}".`);
      }],

      ["PATCH", "/api/stalls/:id", (req, p) => {
        const who = authenticate(req);
        if (who.denied) return who.denied;
        const stall = db.stalls.find((s) => s.id === p.id);
        if (!stall) return notFound(`No stall with the id "${p.id}".`);
        if (who.role === "vendor" && who.stallId !== p.id) return fail(403, "forbidden", `This token belongs to "${who.stallId}": it can't edit "${p.id}".`);
        const { data, error } = readJSON(req); if (error) return error;
        const { fields, out } = validateStall(data, true);
        if (Object.keys(fields).length) return invalid(fields);
        Object.assign(stall, out);
        return json(200, withStats(stall));
      }],

      ["DELETE", "/api/stalls/:id", (req, p) => {
        const denied = requireAdmin(req); if (denied) return denied;
        const i = db.stalls.findIndex((s) => s.id === p.id);
        if (i < 0) return notFound(`No stall with the id "${p.id}".`);
        db.stalls.splice(i, 1);
        db.reviews = db.reviews.filter((r) => r.stallId !== p.id);
        db.saved.delete(p.id);
        return json(204, null);
      }],

      ["GET", "/api/stalls/:id/reviews", (req, p) => {
        if (!db.stalls.some((s) => s.id === p.id)) return notFound(`No stall with the id "${p.id}".`);
        const list = db.reviews.filter((r) => r.stallId === p.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return json(200, list, { "X-Total-Count": String(list.length) });
      }],

      ["POST", "/api/stalls/:id/reviews", (req, p) => {
        if (!db.stalls.some((s) => s.id === p.id)) return notFound(`No stall with the id "${p.id}".`);
        const { data, error } = readJSON(req); if (error) return error;
        const { fields, review } = validateReview(data);
        if (Object.keys(fields).length) return invalid(fields);
        const created = Object.assign({ id: "r" + nextReview++, stallId: p.id }, review, { createdAt: new Date(now()).toISOString() });
        db.reviews.push(created);
        return json(201, created, { Location: `/api/reviews/${created.id}` });
      }],

      ["GET", "/api/reviews/:id", (req, p) => {
        const r = db.reviews.find((x) => x.id === p.id);
        return r ? json(200, r) : notFound(`No review with the id "${p.id}".`);
      }],

      ["DELETE", "/api/reviews/:id", (req, p) => {
        const i = db.reviews.findIndex((x) => x.id === p.id);
        if (i < 0) return notFound(`No review with the id "${p.id}".`);
        db.reviews.splice(i, 1);
        return json(204, null);
      }],

      ["GET", "/api/saved", () => json(200, [...db.saved])],

      // PUT and DELETE are idempotent: saving twice is the same as saving once
      ["PUT", "/api/saved/:id", (req, p) => {
        if (!db.stalls.some((s) => s.id === p.id)) return notFound(`No stall with the id "${p.id}".`);
        db.saved.add(p.id);
        return json(204, null);
      }],

      ["DELETE", "/api/saved/:id", (req, p) => {
        db.saved.delete(p.id);
        return json(204, null);
      }],

      ["GET", "/api/orders", () => json(200, db.orders.map(orderView).reverse())],

      ["POST", "/api/orders", (req) => {
        const { data, error } = readJSON(req); if (error) return error;
        const fields = {};
        const stall = db.stalls.find((s) => s.id === data.stallId);
        const name = typeof data.name === "string" ? data.name.trim() : "";
        if (!stall) fields.stallId = "No stall with that id.";
        if (!name || name.length > 24) fields.name = "Required, up to 24 characters: we call it out when it's ready.";
        if (Object.keys(fields).length) return invalid(fields);
        if (stall.soldOut) return fail(409, "sold_out", `${stall.name} is sold out.`);
        const order = { id: "o" + nextOrder++, stallId: stall.id, stallName: stall.name, name, placedAt: new Date(now()).toISOString() };
        db.orders.push(order);
        return json(201, orderView(order), { Location: `/api/orders/${order.id}` });
      }],

      ["GET", "/api/orders/:id", (req, p) => {
        const o = db.orders.find((x) => x.id === p.id);
        return o ? json(200, orderView(o)) : notFound(`No order with the id "${p.id}".`);
      }],
    ];

    const compiled = routes.map(([method, pattern, fn]) => {
      const names = [];
      const re = new RegExp("^" + pattern.replace(/:([a-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "/?$");
      return { method, pattern, re, names, fn };
    });

    function handle(req) {
      const method = String(req.method || "GET").toUpperCase();
      const path = String(req.path || "/");
      const query = req.query instanceof URLSearchParams ? req.query : new URLSearchParams(req.query || "");
      const headers = {};
      for (const [k, v] of Object.entries(req.headers || {})) headers[k.toLowerCase()] = v;
      const r = { method, path, query, headers, body: req.body == null ? null : String(req.body) };

      const matches = compiled.filter((c) => c.re.test(path));
      if (!matches.length) return finish(notFound(`There is no ${path}. GET /api lists the resources.`));
      const allowed = [...new Set(matches.map((c) => c.method))];
      if (method === "HEAD" && allowed.includes("GET")) {
        const res = handle(Object.assign({}, req, { method: "GET" }));
        return Object.assign(res, { body: null });
      }
      const route = matches.find((c) => c.method === method);
      if (!route) return finish(json(405, { error: "method_not_allowed", message: `${method} is not allowed on ${path}. Allowed: ${allowed.join(", ")}.` }, { Allow: allowed.join(", ") }));

      if (config.failRate && random() < config.failRate) {
        return finish(json(503, { error: "unavailable", message: "The server is overloaded. Try again in a moment." }, { "Retry-After": "2" }));
      }
      const params = {};
      const m = path.match(route.re);
      route.names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      try {
        return finish(route.fn(r, params));
      } catch (e) {
        return finish(fail(500, "internal", "Something broke on the server: " + e.message));
      }
    }

    function finish(res) {
      res.statusText = STATUS_TEXT[res.status] || "";
      res.headers = Object.assign(res.status === 204 || res.body == null ? {} : { "Content-Type": "application/json; charset=utf-8" }, res.headers);
      if (res.status === 204) res.body = null;
      return res;
    }

    return { handle, config, db, dump };
  }

  return { createAPI, STATUS_TEXT, ADMIN_TOKEN, VENDOR_PREFIX, TAGS, VERSION, SEED_STALLS };
});
