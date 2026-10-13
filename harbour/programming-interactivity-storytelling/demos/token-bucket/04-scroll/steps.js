// The explanation, as data. Each step fixes the figure's starting state,
// lists the controls the reader has, and says what the text claims.
// The first words, in order, are the outline:
//   question · Four. · But · Therefore · But · Therefore · Your turn
// Every number in the text, and this outline, are checked in ../test/claims.test.mjs.

export const BURST = [1, 1.15, 1.3, 1.45, 1.6, 1.75]; // six requests in under a second
export const SLOWER = [3, 4.5]; // the same client, more slowly
export const AGAIN = [8, 8.15, 8.3, 8.45, 8.6, 8.75]; // the same burst after a quiet stretch
export const EVEN = [0.8, 1.6, 2.4, 3.2, 4, 4.8, 5.6, 6.4, 7.2, 8, 8.8, 9.6]; // 12, evenly spaced

export const STEPS = [
  {
    html: `<p>A client sends <strong>six requests in under a second</strong>. Your API puts a
      token bucket in front of it: the bucket holds <strong>4 tokens</strong> and gains
      <strong>1 token per second</strong>. A request spends one token. With no token left,
      the request is refused.</p>
      <p>How many of the six get through?</p>`,
    set: { capacity: 4, rate: 1, requests: BURST, cursor: 0 },
    controls: [],
    predict: true,
    hideOutcomes: true,
  },
  {
    html: `<p><strong>Four.</strong> The bucket started full and each request took one token;
      the fifth and sixth found it empty. Drag time across the burst: each request turns
      green or red as time reaches it, and the bucket drains.</p>`,
    set: { capacity: 4, rate: 1, requests: BURST, cursor: 0.8 },
    controls: ["cursor"],
    reveal: true, // outcomes appear as the time cursor passes them
  },
  {
    html: `<p><strong>But</strong> the same client sends two more requests, at 3 s and 4.5 s,
      and both get through, though the bucket held less than one token at 1.8 s. Drag time to the right and watch
      it between the requests.</p>`,
    set: { capacity: 4, rate: 1, requests: [...BURST, ...SLOWER], cursor: 3 },
    controls: ["cursor"],
  },
  {
    html: `<p><strong>Therefore</strong> tokens come back: the bucket refills at a fixed rate,
      here one token per second. Slow the refill down to 0.5 per second: the request at
      4.5 s fails.</p>`,
    set: { capacity: 4, rate: 1, requests: [...BURST, ...SLOWER], cursor: 4.6 },
    controls: ["cursor", "rate"],
  },
  {
    html: `<p><strong>But</strong> waiting doesn't buy a bigger burst. The client goes quiet,
      then sends the same six requests at 8 s. The bucket is full again, and still only four
      get through.</p>`,
    set: { capacity: 4, rate: 1, requests: [...BURST, ...SLOWER, ...AGAIN], cursor: 8.8 },
    controls: ["cursor", "rate"],
  },
  {
    html: `<p><strong>Therefore</strong> the bucket's capacity caps a burst, however long the
      client waited. Make the bucket bigger and watch both bursts.</p>
      <p class="rule">Capacity sets the largest burst. The refill rate sets the average a
      client can keep up for ever.</p>`,
    set: { capacity: 4, rate: 1, requests: [...BURST, ...SLOWER, ...AGAIN], cursor: 10 },
    controls: ["cursor", "rate", "capacity"],
  },
  {
    html: `<p><strong>Your turn.</strong> Twelve requests, evenly spaced, and a bucket of 3.
      What is the slowest refill rate that lets all twelve through?</p>
      <p>Then drag four of them to the same moment. What rate do you need now?
      (Click the timeline to add a request, drag one to move it, click one to remove it;
      or focus a request and use the arrow keys and Delete.)</p>`,
    set: { capacity: 3, rate: 1, requests: EVEN, cursor: 10 },
    controls: ["cursor", "rate", "capacity", "edit"],
  },
];
