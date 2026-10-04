// Guest card. The front desk hands one out at check-in; the hotel reads it
// on every page.

const guestCard = (() => {
  let slots = [];
  try {
    const raw = atob(localStorage.getItem("meridian.card") || "");
    slots = JSON.parse(raw.split("").map((c) => String.fromCharCode(c.charCodeAt(0) ^ 7)).join(""));
  } catch {
    slots = [];
  }
  const valid = Array.isArray(slots) && slots.length === 8 && slots.every((s) => /^[A-Z0-9]{4}$/.test(s));
  if (!valid) slots = [];

  const root = document.documentElement;
  slots.forEach((slot, i) => root.style.setProperty(`--m${i}`, `"-${slot}"`));

  if (!slots.length) {
    document.addEventListener("DOMContentLoaded", () => {
      const banner = document.createElement("p");
      banner.className = "checkin-banner";
      banner.innerHTML = 'You haven\'t checked in on this browser. <a href="../meridian-desk/">Check in at the front desk</a> first, or the keys you find here won\'t open anything.';
      document.querySelector(".site-header").after(banner);
    });
  }

  return (slot) => (slots[slot] ? "-" + slots[slot] : "");
})();
