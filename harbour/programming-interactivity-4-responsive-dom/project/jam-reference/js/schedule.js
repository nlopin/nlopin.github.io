// 3 · What's on? The slider picks a time; the row that has started by then lights up
const when = document.querySelector("#when");
const whenOut = document.querySelector('output[for="when"]');
const onNow = document.querySelector(".on-now");
const rows = [...document.querySelectorAll(".schedule tbody tr")];

// "00:30" is after midnight: count it as 24.5 so the evening stays in order
const hoursOf = (text) => {
  const [h, m] = text.split(":").map(Number);
  return (h < 12 ? h + 24 : h) + m / 60;
};
const clock = (t) => `${String(Math.floor(t) % 24).padStart(2, "0")}:${t % 1 ? "30" : "00"}`;

function showWhatsOn() {
  const t = Number(when.value);
  whenOut.textContent = clock(t);
  let current = null;
  for (const row of rows) if (hoursOf(row.cells[0].textContent) <= t) current = row;
  for (const row of rows) row.classList.toggle("now", row === current);
  onNow.textContent = current ? `${current.cells[1].textContent} · ${current.cells[2].textContent}` : "Doors open at 19:00.";
}
when.addEventListener("input", showWhatsOn);
showWhatsOn();
