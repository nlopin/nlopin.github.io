class LevelMeter extends HTMLElement {
  // on mount
  connectedCallback() {
    const bars = [];
        for (let i = 0; i < 10; i++) {
          const bar = document.createElement("span");
          bar.className = "bar";
          bars.push(bar);
        }
        this.replaceChildren(...bars);
  }
}

customElements.define("level-meter", LevelMeter)
