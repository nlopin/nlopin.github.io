// The phone menu (Lecture 4)
export function setupMenu() {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#main-nav");

  menuButton.hidden = false;
  menuButton.setAttribute("aria-expanded", "false");

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) menuButton.setAttribute("aria-expanded", "false");
  });
}
