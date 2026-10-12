// Fake data, 60 times a second if you drag fast enough: a property, not an attribute.
const meter = document.querySelector("level-meter");
const fake = document.querySelector("#fake");

fake.addEventListener("input", () => {
  meter.value = fake.valueAsNumber;
});
