# `<voice-command>` · fix-it version · answer key

The broken copy, `../04-voice-command-fix/`, is this folder's code with the three bugs below. This key isn't linked from any page.

## 1. It stops listening after a few seconds of silence, but the button still says *Stop listening*.

- **Cause:** `onend` clears the recognition but doesn't start a new one while the user still wants to listen.
- **Fix:** `if (this.#wanted) this.#start();` in `onend`.

## 2. Say “dark mode”: it answers “Dark mode.”, then runs the command again, and again.

- **Cause:** `say()` doesn't stop recognition, so the element hears its own answer, which contains the command.
- **Fix:** Abort the recognition in `say()` (`this.#recognition?.abort(); this.#recognition = null;`); it restarts when the utterance ends.

## 3. Only the first command in the list ever works.

- **Cause:** The commands are split on commas but not trimmed: `" light mode"` starts with a space and never matches.
- **Fix:** `.map((command) => command.trim().toLowerCase())`.
