const meter = document.querySelector("level-meter");
const fake = document.querySelector("#fake");

fake.addEventListener("input", () => {
  meter.value = fake.valueAsNumber;
});
