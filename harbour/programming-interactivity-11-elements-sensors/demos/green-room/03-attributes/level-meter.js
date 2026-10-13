// Step 3: attributes configure it, a property carries the live value.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host { display: inline-flex; gap: 3px; height: 24px; }
    .bar { width: 8px; background: var(--meter-off, #d5d9e0); }
    .bar.on { background: var(--meter-color, #1f9d55); }
  </style>`;
class LevelMeter extends HTMLElement {
  static observedAttributes = ["value", "bars"];

  #value = 0;

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.shadowRoot.append(template.content.cloneNode(true))
  }

  connectedCallback() {
    this.#build();
  }

  // Runs for every observed attribute present in the markup (before connectedCallback),
  // and again on every setAttribute / removeAttribute.
  attributeChangedCallback(name, oldValue, newValue) {
    console.log("callback", name, oldValue, newValue);
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
    this.shadowRoot.append(...bars);
    this.#update();
  }

  #update() {
    const bars = this.querySelectorAll(".bar");
    const lit = Math.round(this.#value * bars.length);
    bars.forEach((bar, i) => bar.classList.toggle("on", i < lit));
  }
}

customElements.define("level-meter", LevelMeter);
