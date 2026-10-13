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

// A bursty client: three bursts of 3–7 requests, plus a few single ones.
// `random` is any function returning a number in [0, 1).
export function traffic(random) {
  const at = (t) => Math.round(t * 20) / 20; // the timeline's 0.05 s grid
  const requests = [];
  for (let b = 0; b < 3; b++) {
    const start = 0.5 + random() * 8;
    const size = 3 + Math.floor(random() * 5);
    for (let k = 0; k < size; k++) requests.push(at(Math.min(10, start + k * 0.15)));
  }
  for (let k = 0; k < 4; k++) requests.push(at(random() * 10));
  return requests;
}
