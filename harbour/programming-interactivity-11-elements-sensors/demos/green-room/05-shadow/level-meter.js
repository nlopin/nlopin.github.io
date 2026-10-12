// Step 5: the same meter, inside a shadow root.
// Its styles and markup are private; the page styles it through custom properties and ::part.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: inline-flex;
      align-items: stretch;
      gap: var(--meter-gap, 3px);
      height: var(--meter-height, 24px);
    }
    :host([hidden]) { display: none; }
    .bar {
      width: 8px;
      border-radius: 2px;
      background: var(--meter-off, #d5d9e0);
    }
    .bar.on { background: var(--meter-color, #1f9d55); }
  </style>
`;

class LevelMeter extends HTMLElement {
  static observedAttributes = ["value", "bars"];

  #value = 0;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.#build();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") this.value = newValue;
    if (name === "bars" && this.isConnected) this.#build();
  }

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
      bar.part.add("bar"); // the page can style it as level-meter::part(bar)
      bars.push(bar);
    }
    this.shadowRoot.querySelectorAll(".bar").forEach((bar) => bar.remove());
    this.shadowRoot.append(...bars);
    this.#update();
  }

  #update() {
    const bars = this.shadowRoot.querySelectorAll(".bar");
    const lit = Math.round(this.#value * bars.length);
    bars.forEach((bar, i) => {
      bar.classList.toggle("on", i < lit);
      bar.part.toggle("on", i < lit); // level-meter::part(on)
    });
  }
}

customElements.define("level-meter", LevelMeter);
