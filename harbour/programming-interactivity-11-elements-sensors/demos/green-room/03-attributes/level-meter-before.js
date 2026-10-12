// Step 3, before: attributes only. Swap this file in for level-meter.js in index.html,
// then try meter.setAttribute("value", 0.8) (works) and meter.value = 0.8 (does nothing).
class LevelMeter extends HTMLElement {
  static observedAttributes = ["value", "bars"];

  connectedCallback() {
    this.#build();
  }

  attributeChangedCallback(name) {
    if (this.isConnected) this.#build();
  }

  #build() {
    const count = Number(this.getAttribute("bars")) || 10;
    const value = Math.min(1, Math.max(0, Number(this.getAttribute("value")) || 0));
    const lit = Math.round(value * count);
    const bars = [];
    for (let i = 0; i < count; i++) {
      const bar = document.createElement("span");
      bar.className = i < lit ? "bar on" : "bar";
      bars.push(bar);
    }
    this.replaceChildren(...bars);
  }
}

customElements.define("level-meter", LevelMeter);
