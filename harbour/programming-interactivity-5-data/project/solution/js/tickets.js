// The ticket form (Lecture 4)
export function setupTickets() {
  const form = document.querySelector(".ticket-form");
  const message = form.elements.message;
  const left = document.querySelector("#message-left");
  const result = document.querySelector(".ticket-result");

  message.addEventListener("input", () => {
    left.textContent = `${message.maxLength - message.value.length} characters left`;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const guests = Number(data.get("guests"));

    const ticket = document.createElement("article");
    ticket.className = "ticket";
    const title = document.createElement("h3");
    title.textContent = `See you there, ${data.get("name")}!`;
    const details = document.createElement("p");
    details.textContent = `${guests} ${guests === 1 ? "person" : "people"} · ${data.get("arrival")}`;
    ticket.append(title, details);

    result.replaceChildren(ticket);
    form.reset();
    left.textContent = "Up to 140 characters.";
  });
}
