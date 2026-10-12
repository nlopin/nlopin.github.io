# `<gamepad-car>` · fix-it version · answer key

The broken copy, `../07-gamepad-car-fix/`, is this folder's code with the three bugs below. This key isn't linked from any page.

## 1. With a gamepad connected and nobody touching it, the car turns on its own.

- **Cause:** The stick's raw value is used; at rest a stick reports small non-zero values.
- **Fix:** A deadzone: treat `Math.abs(value) < 0.15` as 0.

## 2. Drive with the arrow keys: the page scrolls as well.

- **Cause:** The `keydown` handler doesn't call `event.preventDefault()`, so the arrows also scroll.
- **Fix:** `event.preventDefault()` for the arrow keys.

## 3. Drive back and forth over the start line: a lap every time you cross it going forwards, some under a second.

- **Cause:** A lap is any forward crossing of the start line; the halfway check is gone.
- **Fix:** Count a lap only if `lap.halfway` is set, and reset it after the lap.
