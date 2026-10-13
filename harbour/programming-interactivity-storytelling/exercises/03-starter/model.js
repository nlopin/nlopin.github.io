// The idea itself: a pure function of the state. No DOM, so it runs in Node too,
// and every claim your text makes about it can be a test (claims.test.mjs).

// TODO: replace with your idea's computation. This placeholder compares two values.
export function compute({ a, b }) {
  return { bigger: a > b ? "a" : a < b ? "b" : "neither", difference: Math.abs(a - b) };
}
