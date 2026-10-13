// mulberry32: a seeded pseudo-random generator. Same seed, same sequence,
// on every machine. Not for security; for reproducible demos.
export function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Usage, for a surprise every reader sees:
//   import { mulberry32 } from "./rng.js";
//   const random = mulberry32(42);
//   random(); // the same number on every machine, every load
