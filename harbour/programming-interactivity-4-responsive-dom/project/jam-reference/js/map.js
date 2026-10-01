// 5 · The map talks: one listener on the map, the panel filled with textContent
const ZONES = {
  stage:  ["Main stage", "DJ Marisol at 19:00, Los Faroles at 20:30. Bring your dancing shoes."],
  food:   ["Food street", "Dumpling Dynasty, Churros Till Late and twelve more stalls. Follow your nose."],
  table:  ["Long table", "Sixty seats, one table. The dumpling folding class starts here at 19:30."],
  crafts: ["Crafts corner", "Salt & Ink, The Plant Swap, and the zine workshop at 21:30."],
  drinks: ["Drinks", "Mezcal Moon, lemonade, tea. Last orders at half past midnight."],
  pier:   ["The pier", "Harbour Brass Band at 22:30, silent disco from midnight."],
  gate:   ["Entrance", "Moll de la Fusta. Metro: Drassanes, five minutes' walk."],
};
const marketMap = document.querySelector(".market-map");
const zoneInfo = document.querySelector(".zone-info");

function closeZone() {
  zoneInfo.hidden = true;
  for (const z of marketMap.querySelectorAll(".zone")) z.setAttribute("aria-pressed", "false");
}

marketMap.addEventListener("click", (event) => {
  const zone = event.target.closest(".zone");
  if (!zone) return;
  const key = [...zone.classList].find((c) => c in ZONES);
  const [title, text] = ZONES[key];
  zoneInfo.querySelector("h3").textContent = title;
  zoneInfo.querySelector("p").textContent = text;
  zoneInfo.hidden = false;
  for (const z of marketMap.querySelectorAll(".zone")) z.setAttribute("aria-pressed", String(z === zone));
});
zoneInfo.querySelector(".zone-close").addEventListener("click", closeZone);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeZone(); });
