// Step 3: attributes configure it, a property carries the live value.
class LevelMeter extends HTMLElement {
  static observedAttributes = ["value", "bars"];

  #value = 0;

  connectedCallback() {
    this.#build();
  }

  // Runs for every observed attribute present in the markup (before connectedCallback),
  // and again on every setAttribute / removeAttribute.
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") this.value = newValue;
    if (name === "bars" && this.isConnected) this.#build();
  }

  // Like <input>: the value attribute is the starting value, the value property is the current one.
  get value() {
    return this.#value;
  }

  set value(v) {
    this.#value = Math.min(1, Math.max(0, Number(v) || 0));
    this.#update();
  }

  #build() {
    const count = Number(this.getAttribute("bars")) || 10;
    const bars = [];
    for (let i = 0; i < count; i++) {
      const bar = document.createElement("span");
      bar.className = "bar";
      bars.push(bar);
    }
    this.replaceChildren(...bars);
    this.#update();
  }

  #update() {
    const bars = this.querySelectorAll(".bar");
    const lit = Math.round(this.#value * bars.length);
    bars.forEach((bar, i) => bar.classList.toggle("on", i < lit));
  }
}

customElements.define("level-meter", LevelMeter);
