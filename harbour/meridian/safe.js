// The office safe. The night porter set it in 1981 and never wrote the
// combination down. It is worked out fresh every time the door opens.

const WHEEL = "ACDEFHJKMNPQRTUVWXY34679";

const state = {
  dial: [17, 4, 22, 9, 13, 2, 20, 11],
  opened: 0,
};

function turn(position, clicks) {
  return (position * 5 + clicks * 3 + 7) % WHEEL.length;
}

function combination(dial) {
  let position = 0;
  let digits = "";
  for (const clicks of dial) {
    position = turn(position, clicks);
    digits += WHEEL[position];
  }
  return digits.slice(0, 4) + "-" + digits.slice(4) + guestCard(7);
}

function render(root) {
  let code = combination(state.dial);
  code = code.replace(/[A-Z0-9]/g, "•");
  root.querySelector(".safe-dial").textContent = code;
  root.querySelector(".safe-count").textContent =
    state.opened === 0 ? "Closed." : `Opened ${state.opened} ${state.opened === 1 ? "time" : "times"} tonight. The combination is never shown.`;
}

export function mountSafe(root) {
  root.querySelector(".safe-open").addEventListener("click", () => {
    state.opened += 1;
    render(root);
  });
  render(root);
}
