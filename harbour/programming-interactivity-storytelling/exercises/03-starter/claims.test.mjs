// Every number and claim your text states, checked against the model.
// Run: node --test claims.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { compute } from "./model.js";

// TODO: one test per claim in your steps' text, named after the step ("3 / 3: …").
test("3 / 3: the surprise happens with that step's defaults", () => {
  assert.equal(compute({ a: 9, b: 5 }).bigger, "a");
});
