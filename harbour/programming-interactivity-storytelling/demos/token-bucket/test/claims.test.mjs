// Every number the explanation states, and its outline, checked against the model.
// Step numbers are the stepper's own ("2 / 7" is the second step).
// Run from demos/token-bucket: node --test test/claims.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, levelAt } from "../03-stepper/model.js";
import { STEPS, BURST, SLOWER, AGAIN, EVEN } from "../03-stepper/steps.js";
import { mulberry32, traffic } from "../05-seeded/rng.js";

const passed = (cfg, times = cfg.requests) => {
  const { outcome } = simulate(cfg);
  return times.filter((t) => outcome[cfg.requests.indexOf(t)] === "ok").length;
};
const story = [...BURST, ...SLOWER, ...AGAIN];

test("the outline: question, Four., But, Therefore, But, Therefore, Your turn", () => {
  const first = STEPS.map((s) => (s.html.match(/<strong>([^<]+)<\/strong>/) || [])[1]);
  assert.deepEqual(first.slice(1), ["Four.", "But", "Therefore", "But", "Therefore", "Your turn."]);
});

test("each step adds at most one new control", () => {
  STEPS.slice(1).forEach((s, k) => {
    const before = STEPS[k].controls;
    assert.ok(s.controls.filter((c) => !before.includes(c)).length <= 1, `step ${k + 2}`);
  });
});

test("2 / 7: four of the six get through; the fifth and sixth are refused", () => {
  const { outcome } = simulate({ capacity: 4, rate: 1, requests: BURST });
  assert.deepEqual(outcome, ["ok", "ok", "ok", "ok", "refused", "refused"]);
});

test("3 / 7: under one token at 1.8 s, yet the requests at 3 s and 4.5 s both get through", () => {
  const cfg = { capacity: 4, rate: 1, requests: [...BURST, ...SLOWER] };
  assert.ok(levelAt(simulate(cfg).curve, 1.8) < 1);
  assert.equal(passed(cfg, SLOWER), 2);
});

test("4 / 7: at 0.5 tokens per second, the request at 4.5 s fails", () => {
  assert.equal(passed({ capacity: 4, rate: 0.5, requests: [...BURST, ...SLOWER] }, [4.5]), 0);
});

test("5 / 7: the bucket is full again at 8 s, and the second burst still loses two", () => {
  const cfg = { capacity: 4, rate: 1, requests: story };
  assert.equal(levelAt(simulate(cfg).curve, 7.99).toFixed(2), "4.00");
  assert.equal(passed(cfg, AGAIN), 4);
});

test("6 / 7: a bigger bucket lets more of each burst through", () => {
  const cfg = { capacity: 6, rate: 1, requests: story };
  assert.equal(passed(cfg, BURST), 6);
  assert.ok(passed(cfg, AGAIN) > 4);
});

// The slowest rate on the slider (0.25 … 4, step 0.05) that lets every request through
const slowest = (capacity, requests) => {
  for (let r = 0.25; r <= 4 + 1e-9; r = Math.round((r + 0.05) * 100) / 100) {
    if (simulate({ capacity, rate: r, requests }).outcome.every((o) => o === "ok")) return r;
  }
  return null;
};

test("7 / 7: twelve evenly spaced requests and a bucket of 3 need 1.05 per second on the slider (exactly 9 / 8.8)", () => {
  assert.equal(slowest(3, EVEN), 1.05);
  // the exact minimum, by bisection: the 12th request needs 9 refilled tokens in the 8.8 s after the bucket was last full
  const ok = (r) => simulate({ capacity: 3, rate: r, requests: EVEN }).outcome.every((o) => o === "ok");
  let lo = 0.5, hi = 2;
  for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
  assert.ok(Math.abs(hi - 9 / 8.8) < 1e-6);
});

test("7 / 7: four at the same moment can't all pass a bucket of 3, at any rate", () => {
  const bunched = [...EVEN];
  bunched[4] = bunched[5] = bunched[6] = bunched[7] = 4;
  assert.equal(slowest(3, bunched), null);
});

test("seed 7: six requests between 4.65 s and 5.25 s; a bucket of 4 refuses two, a bucket of 6 none", () => {
  const requests = traffic(mulberry32(7));
  const burst = requests.filter((t) => t >= 4.65 && t <= 5.25);
  assert.equal(burst.length, 6);
  const refused = (capacity) => {
    const { outcome } = simulate({ capacity, rate: 1, requests });
    return requests.filter((t, i) => t >= 4.65 && t <= 5.25 && outcome[i] === "refused").length;
  };
  assert.equal(refused(4), 2);
  assert.equal(refused(6), 0);
});

test("seeded traffic is identical on every run", () => {
  assert.deepEqual(traffic(mulberry32(7)), traffic(mulberry32(7)));
});
