// Front desk: reads the booking card from the address bar.

const params = new URLSearchParams(location.search);
const result = document.querySelector(".result");

for (const field of ["guest", "room", "nights"]) {
  const value = params.get(field);
  if (value) document.querySelector(`[data-field="${field}"]`).textContent = value;
}

const stamp = [81, 92, 92, 88, 86, 87, 62, 71, 38, 68, 43];

if (params.get("guest") && params.get("room")) {
  result.className = "result stamp";
  result.textContent = "Confirmed · " + stamp.map((n) => String.fromCharCode(n ^ 19)).join("") + guestCard(1);
} else {
  result.className = "result void";
  result.textContent = "Booking void: the card arrived without a room.";
}
