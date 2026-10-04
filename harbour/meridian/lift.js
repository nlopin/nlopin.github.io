// Lift controller, rev. 3 (1997). Works. Do not touch. — R.

const lift = document.querySelector(".lift");
const display = lift.querySelector(".lift-display");
const message = lift.querySelector(".lift-message");

lift.querySelectorAll(".lift-buttons button").forEach((button) => {
  button.addEventListener("click", () => {
    display.textContent = button.textContent;
    message.textContent = "Ding.";
  });
});

// The service floor isn't on the panel. Staff spell it out.
const service = [82, 65, 76, 76, 69, 67];
const note = [110, 101, 125, 100, 7, 29, 123, 114, 30];
let typed = "";

document.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select")) return;
  if (event.key.length !== 1) return;

  const floor = String.fromCharCode(...[...service].reverse());
  typed = (typed + event.key.toUpperCase()).slice(-floor.length);

  if (typed === floor) {
    display.textContent = "B";
    message.textContent = "Service floor. Key: " + note.map((n) => String.fromCharCode(n ^ 42)).join("") + guestCard(5);
  }
});
