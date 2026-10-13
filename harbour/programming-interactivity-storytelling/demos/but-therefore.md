# The token bucket, outlined twice

The "but / therefore" rule (Matt Stone and Trey Parker, borrowed by Nicky
Case): if the beats of an outline join with "and then", it's a list of facts.
Join them with "but" or "therefore" and each beat follows from the one before.

## As first written: "and then"

1. A token bucket holds tokens, and then
2. each request spends one token, and then
3. tokens refill at a fixed rate, and then
4. the bucket has a capacity, and then
5. so bursts are limited, and then
6. here's a sandbox.

Correct, and nothing in it makes the reader want the next line. Every beat is
a definition; the reader has no question for any of them to answer.

## Rewritten: "but" and "therefore"

1. A client sends six requests in under a second, into a bucket of four.
   How many get through? *(The question. The reader guesses.)*
2. **Four.** Each request spent a token; the bucket held four.
   *(The answer, and the first rule. Control: time.)*
3. **But** two later requests, at 3 s and 4.5 s, get through.
   *(A surprise the reader sees on the timeline.)*
4. **Therefore** tokens come back at a fixed rate. Slow it down and the
   request at 4.5 s fails. *(New control: the refill rate.)*
5. **But** after a quiet stretch, the same burst of six still loses two.
6. **Therefore** the capacity caps a burst, however long the client waited.
   *(New control: capacity. The rule, stated.)*
7. **Your turn.** Twelve evenly spaced requests and a bucket of 3: what's the
   slowest refill rate that lets all twelve through? Then drag four of them to
   the same moment: what rate now? *(1.05 per second on the slider, exactly 9/8.8 ≈ 1.023; then no rate at all:
   four at once can't pass a bucket of three.)*

Each "but" is something visible in the figure that the previous rule doesn't
explain. Each "therefore" is the next rule, and brings in one new control.
This is the step order in `token-bucket/03-stepper/steps.js`; the test in
`token-bucket/test/claims.test.mjs` checks the first words and every number.
