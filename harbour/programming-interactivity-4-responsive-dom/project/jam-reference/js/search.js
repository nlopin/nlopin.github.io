// 4 · Find a stall: filter the cards on every keystroke
const search = document.querySelector("#vendor-search");
const searchStatus = document.querySelector(".search-status");
search.addEventListener("input", () => {
  // look the stalls up now, not once at load: registered stalls must count too
  const searchStalls = document.querySelectorAll(".stall");
  const query = search.value.trim().toLowerCase();
  let shown = 0;
  for (const stall of searchStalls) {
    const hit = stall.textContent.toLowerCase().includes(query);
    stall.classList.toggle("search-miss", !hit);
    if (hit) shown++;
  }
  // their words go in textContent, never innerHTML
  if (query === "") searchStatus.textContent = "";
  else if (shown === 0) searchStatus.textContent = `No stalls match “${search.value.trim()}”.`;
  else searchStatus.textContent = `${shown} of ${searchStalls.length} stalls match “${search.value.trim()}”.`;
});
