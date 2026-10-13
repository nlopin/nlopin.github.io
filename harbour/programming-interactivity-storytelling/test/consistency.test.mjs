// The deck, the run sheet, the plan and the briefs describe the same class.
// This checks the facts they share. Run from the lecture folder: node --test test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STEPS } from "../demos/token-bucket/03-stepper/steps.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const deck = read("slides.html");
const runSheet = read("run-sheet.md");
const plan = read("plan.md");
const slides = [...deck.matchAll(/<section\b[^>]*data-title="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => ({ title: m[1], html: m[0] }));
const slideNo = (title) => slides.findIndex((s) => s.title === title) + 1;

test("exercise durations agree: deck timer, deck kicker, brief, run sheet", () => {
  const exercises = [
    ["Exercise 1 — Take one apart", "exercises/01-take-one-apart.html", 20],
    ["Exercise 2 — Six frames", "exercises/02-storyboard.html", 14],
    ["Exercise 3 — Build three frames", "exercises/03-build.html", 40],
  ];
  for (const [title, brief, min] of exercises) {
    const s = slides.find((x) => x.title === title).html;
    assert.match(s, new RegExp(`data-min="${min}"`), `${title}: timer`);
    assert.match(s, new RegExp(`· ${min} min</p>`), `${title}: kicker`);
    assert.match(read(brief), new RegExp(`· ${min} min</span>`), `${brief}: header`);
    assert.match(runSheet, new RegExp(`Timer ${min}\\b|\\(${min} min\\)|${min}-minute`), `run sheet: ${title}`);
  }
});

test("the silent test is 7 minutes everywhere", () => {
  assert.match(slides.find((x) => x.title === "Exercise 3 — Build three frames").html, /Last 7 minutes/);
  assert.match(slides.find((x) => x.title === "The silent test").html, /last 7 minutes/);
  assert.match(read("exercises/03-build.html"), /last 7 minutes/);
  assert.match(runSheet, /silent test \(timer 7\)/);
  assert.doesNotMatch(deck + runSheet + plan, /last 5 minutes/i);
});

test("the plan's timing table adds up to 3 hours", () => {
  const table = plan.slice(plan.indexOf("## Timing"), plan.indexOf("## Structure"));
  const total = [...table.matchAll(/^\| (\d+) \|/gm)].reduce((sum, m) => sum + Number(m[1]), 0);
  assert.equal(total, 180);
});

test("act start times agree: act markers, the map, the run sheet", () => {
  const acts = [...deck.matchAll(/data-act="(\w)" data-act-name="([^"]+)" data-at="(\d:\d\d)"/g)];
  for (const [, act, name, at] of acts) {
    if (act === "0") continue;
    assert.ok(runSheet.includes(`· ${at}–`), `run sheet has a block starting at ${at} (${name})`);
    if (act !== "F") assert.ok(deck.includes(`<time>${at}</time>`), `map shows ${at} (${name})`);
  }
});

test("run-sheet slide ranges point at the right slides", () => {
  const checks = { "Act 1 — The shape of an explanation": 6, "Act 2 — Patterns and failures": 21, "Break": 32,
    "Act 3 — Playgrounds": 33, "Act 4 — Engineering an explorable": 42, "Act 5 — Showing it": 52, "Three questions": 56 };
  for (const [title, n] of Object.entries(checks)) {
    assert.equal(slideNo(title), n, `${title} is slide ${n}`);
    assert.match(runSheet, new RegExp(`slides? ${n}[–\\n ]`), `run sheet starts a block at slide ${n}`);
  }
  assert.equal(slides.length, 58);
  assert.match(plan, new RegExp(`\\(${slides.length} slides`), "plan states the slide count");
});

test("the order of controls on the slides matches steps.js", () => {
  const order = [];
  for (const s of STEPS) for (const c of s.controls) if (!order.includes(c)) order.push(c);
  assert.deepEqual(order, ["cursor", "rate", "capacity", "edit"]);
  assert.match(slides.find((x) => x.title === "One control at a time").html, /time first, then the refill rate, then capacity, then editing/);
});

test("the clock times in the speaker notes never go backwards", () => {
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  let last = 0;
  for (const { title, html } of slides) {
    const m = html.match(/<aside class="notes">\s*<p>~(\d:\d\d)/);
    if (!m) continue;
    assert.ok(toMin(m[1]) >= last, `${title} (~${m[1]}) comes after ~${Math.floor(last / 60)}:${String(last % 60).padStart(2, "0")}`);
    last = toMin(m[1]);
  }
});

test("the opening is called the same everywhere", () => {
  assert.match(deck, /data-act-name="Opening"/);
  assert.match(runSheet, /## Opening ·/);
  assert.doesNotMatch(deck + runSheet, /Prologue|<strong>Hook<\/strong>/);
});

test("code excerpts on the slides match the source they quote", () => {
  const stepsSlide = slides.find((x) => x.title === "Steps as data").html;
  for (const n of [0, 1]) {
    assert.ok(stepsSlide.includes(`cursor: ${STEPS[n].set.cursor}`), `step ${n + 1} cursor on the slide`);
  }
  assert.equal(STEPS[1].reveal, true);
  assert.match(stepsSlide, /reveal: true/);
  const model = read("demos/token-bucket/03-stepper/model.js");
  const tolerance = model.match(/tokens >= (1 - 1e-9)/)[1];
  assert.ok(slides.find((x) => x.title === "A pure model").html.includes(`tokens &gt;= ${tolerance}`) ||
    slides.find((x) => x.title === "A pure model").html.includes(`tokens >= ${tolerance}`), "the model's threshold on the slide");
  const url = read("demos/token-bucket/06-url/url.js");
  assert.match(url, /p\.has\(key\) && Number\.isFinite\(v\) \? clamp\(v, min, max\) : fallback/);
  assert.match(slides.find((x) => x.title === "State in the URL").html, /p\.has\(key\) &amp;&amp; Number\.isFinite\(v\) \? clamp\(v, min, max\) : fallback|p\.has\(key\) && Number\.isFinite\(v\) \? clamp\(v, min, max\) : fallback/);
});

test("show-three logistics say the same thing in the deck and the run sheet", () => {
  assert.match(slides.find((x) => x.title === "A live demo is an explanation").html, /copy their folder/);
  assert.match(runSheet, /copy their folder or URL to the projector laptop/);
  assert.doesNotMatch(deck + runSheet, /while the test runs|break between test and show/);
});
