// 4 · Ticket wizard. market.js still books the ticket on "submit";
// this script only decides which step you see, and when you may go on.
const wizard = document.querySelector(".wizard");
const steps = [...wizard.querySelectorAll(".step")];
const stepLabels = wizard.querySelectorAll(".steps li");
const backButton = wizard.querySelector(".wizard-back");
const nextButton = wizard.querySelector(".wizard-next");
const reserveButton = wizard.querySelector(".wizard-submit");
const review = wizard.querySelector(".review");
let stepIndex = 0;

function showStep(i, moveFocus = true) {
  stepIndex = i;
  steps.forEach((step, k) => { step.hidden = k !== i; });
  stepLabels.forEach((li, k) => {
    if (k === i) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
  const last = i === steps.length - 1;
  backButton.hidden = i === 0;
  nextButton.hidden = last;
  reserveButton.hidden = !last;
  // a disabled submit button switches off "Enter submits the form" on steps 1 and 2
  reserveButton.disabled = !last;
  if (last) fillReview();
  // keyboard and screen-reader users land where the new step starts
  if (moveFocus) (last ? reserveButton : steps[i].querySelector("input, select, textarea")).focus();
}

// valid = every field of THIS step passes; otherwise show the browser's message on the first bad one
function stepIsValid(step) {
  const fields = [...step.elements];
  const bad = fields.find((field) => !field.checkValidity());
  if (bad) bad.reportValidity();
  return !bad;
}

function fillReview() {
  const data = new FormData(wizard);
  const rows = [
    ["Name", data.get("name")],
    ["Email", data.get("email")],
    ["Guests", data.get("guests")],
    ["Arriving", data.get("arrival")],
    ["Note", data.get("message") || "—"],
    ["Line-up emails", data.get("news") ? "yes" : "no"],
  ];
  review.replaceChildren();
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value; // their words: textContent
    review.append(dt, dd);
  }
}

nextButton.addEventListener("click", () => {
  if (stepIsValid(steps[stepIndex])) showStep(stepIndex + 1);
});
backButton.addEventListener("click", () => showStep(stepIndex - 1));

// Enter in a field: go to the next step instead of doing nothing
wizard.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.target.matches("textarea, button")) return;
  if (stepIndex < steps.length - 1) {
    event.preventDefault();
    nextButton.click();
  }
});

// market.js resets the form after booking: start again at step 1
// (no focus jump: the person is reading their new ticket below)
wizard.addEventListener("reset", () => setTimeout(() => showStep(0, false)));
