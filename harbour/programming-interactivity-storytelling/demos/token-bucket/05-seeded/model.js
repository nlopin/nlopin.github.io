// The token bucket, as a pure function: parameters + request times in,
// one outcome per request and the token level over time out.

export const DURATION = 10; // seconds shown on the timeline

export function simulate({ capacity, rate, requests }) {
  const order = requests.map((t, i) => ({ t, i })).sort((a, b) => a.t - b.t);
  const outcome = new Array(requests.length);
  const curve = [[0, capacity]]; // [time, tokens] points, drops are vertical
  let tokens = capacity;
  let last = 0;

  for (const { t, i } of order) {
    const full = last + (capacity - tokens) / rate; // when the bucket refills
    if (full < t) curve.push([full, capacity]);
    tokens = Math.min(capacity, tokens + (t - last) * rate);
    curve.push([t, tokens]);
    if (tokens >= 1 - 1e-9) {
      tokens -= 1;
      outcome[i] = "ok";
      curve.push([t, tokens]);
    } else {
      outcome[i] = "refused";
    }
    last = t;
  }

  const full = last + (capacity - tokens) / rate;
  if (full < DURATION) curve.push([full, capacity]);
  curve.push([DURATION, Math.min(capacity, tokens + (DURATION - last) * rate)]);
  return { outcome, curve };
}

// Tokens in the bucket at time t: interpolate between the curve's points.
export function levelAt(curve, t) {
  let k = 0;
  while (k + 1 < curve.length && curve[k + 1][0] <= t) k++;
  const [t0, v0] = curve[k];
  const next = curve[k + 1];
  if (!next) return v0;
  return v0 + ((next[1] - v0) * (t - t0)) / (next[0] - t0);
}
