// 4 · Register a stall: read the form, check it, build a card, add it to the list
const registerForm = document.querySelector(".register-form");
const registerStatus = document.querySelector(".register-status");
const newName = registerForm.elements.name;
const registerList = document.querySelector(".vendor-list");

// a rule HTML can't express: the name must not be taken yet (ignoring case)
const nameTaken = (name) => [...registerList.querySelectorAll(".vendor-card h3")]
  .some((h3) => h3.textContent.trim().toLowerCase() === name.trim().toLowerCase());

newName.addEventListener("input", () => {
  newName.setCustomValidity(nameTaken(newName.value) ? "That stall is already on the market." : "");
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault(); // only runs once required/maxlength and our rule pass
  const data = new FormData(registerForm);
  const tag = data.get("tag");
  const tagLabel = registerForm.elements.tag.selectedOptions[0].textContent;

  // the same structure as the other cards, so every stylesheet and script treats it the same
  const stall = document.createElement("li");
  stall.className = "stall is-new";
  stall.dataset.tag = tag;
  const card = document.createElement("article");
  card.className = "vendor-card";
  const tagEl = document.createElement("span");
  tagEl.className = "tag";
  tagEl.textContent = tagLabel;
  const title = document.createElement("h3");
  title.textContent = data.get("name").trim();       // their words: textContent
  const text = document.createElement("p");
  text.textContent = data.get("text").trim();
  const link = document.createElement("a");
  link.className = "card-link";
  link.href = "#map";
  link.textContent = "Find the stall →";
  card.append(tagEl, title, text, link);
  stall.append(card);
  registerList.append(stall);

  registerStatus.textContent = `${title.textContent} is on the market.`;
  registerForm.reset();
  stall.scrollIntoView({ behavior: "smooth", block: "center" });
});
