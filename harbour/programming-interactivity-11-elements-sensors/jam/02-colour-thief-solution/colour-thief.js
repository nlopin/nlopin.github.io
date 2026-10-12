// <colour-thief>: pick colours from anywhere on screen, copy them, keep them.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      font: 14px/1.4 system-ui, sans-serif;
      --thief-border: #d9dde5;
    }
    :host([hidden]) { display: none; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    button {
      font: inherit;
      padding: 6px 12px;
      border: 1px solid var(--thief-border);
      border-radius: 8px;
      background: none;
      color: inherit;
      cursor: pointer;
    }
    input[type="color"] { width: 44px; height: 32px; padding: 0; border: 0; background: none; cursor: pointer; }
    .fallback { display: none; }
    :host(:state(no-eyedropper)) .fallback { display: contents; }
    :host(:state(no-eyedropper)) .pick { display: none; }
    ul { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 12px 0 0; padding: 0; }
    .swatch {
      display: grid;
      gap: 4px;
      justify-items: center;
      padding: 6px;
      font: 12px ui-monospace, monospace;
    }
    .swatch i { display: block; width: 44px; height: 44px; border-radius: 6px; border: 1px solid rgb(0 0 0 / 0.15); }
    .empty { color: #5d6576; }
    output { display: block; min-height: 1.4em; margin-top: 8px; color: #5d6576; }
  </style>
  <div class="actions">
    <button class="pick" part="button">Pick a colour</button>
    <span class="fallback">
      <input type="color" aria-label="Choose a colour">
      <button class="add" part="button">Add</button>
    </span>
    <button class="export" part="button">Export CSS</button>
  </div>
  <ul part="palette"></ul>
  <output role="status"></output>
`;

// Chrome returned "rgb(…)" from older versions of EyeDropper; the palette stores #rrggbb.
function toHex(colour) {
  if (colour.startsWith("#")) return colour.toLowerCase();
  const [r, g, b] = colour.match(/\d+/g).map(Number);
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

class ColourThief extends HTMLElement {
  static observedAttributes = ["max", "storage-key"];

  #internals = this.attachInternals();
  #colours = [];
  #picking = null; // an AbortController while the eyedropper is open
  #loaded = false; // attributeChangedCallback runs before connectedCallback: don't save an empty palette over the stored one

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
    const $ = (selector) => this.shadowRoot.querySelector(selector);
    $(".pick").addEventListener("click", () => this.pick());
    $(".add").addEventListener("click", () => this.#add($('input[type="color"]').value));
    $(".export").addEventListener("click", () => this.#copy(this.css, "Palette copied as CSS custom properties."));
    $("ul").addEventListener("click", (event) => {
      const swatch = event.target.closest(".swatch");
      if (swatch) this.#copy(swatch.dataset.hex, `${swatch.dataset.hex} copied.`);
    });
  }

  get max() {
    return Math.max(1, Number(this.getAttribute("max")) || 8);
  }

  get storageKey() {
    return `colour-thief:${this.getAttribute("storage-key") ?? "default"}`;
  }

  // A copy: the page reads the palette, it doesn't change it from outside.
  get colours() {
    return [...this.#colours];
  }

  get css() {
    const lines = this.#colours.map((hex, i) => `  --colour-${i + 1}: ${hex};`);
    return `:root {\n${lines.join("\n")}\n}`;
  }

  connectedCallback() {
    if (!("EyeDropper" in window)) {
      this.#internals.states.add("no-eyedropper");
      this.#say("This browser has no eyedropper (Firefox and Safari don't). Choose a colour instead.");
    }
    this.#load();
    this.#loaded = true;
  }

  disconnectedCallback() {
    this.#picking?.abort(); // closes the system eyedropper if it's open
  }

  attributeChangedCallback(name) {
    if (!this.#loaded) return;
    if (name === "storage-key") this.#load();
    if (name === "max") this.#keep(this.#colours);
  }

  async pick() {
    if (!("EyeDropper" in window) || this.#picking) return;
    this.#picking = new AbortController();
    try {
      const { sRGBHex } = await new EyeDropper().open({ signal: this.#picking.signal });
      this.#add(toHex(sRGBHex));
    } catch (error) {
      // Esc, or removed while picking: not a problem worth a message.
      if (error.name !== "AbortError") this.#say(`The eyedropper failed: ${error.message}`);
    } finally {
      this.#picking = null;
    }
  }

  #add(hex) {
    this.#keep([hex, ...this.#colours.filter((c) => c !== hex)]);
    this.dispatchEvent(new CustomEvent("pick", { bubbles: true, detail: { hex } }));
    // No automatic copy here: after the picker closes, the click's activation has been used up.
    this.#say(`${hex} added. Click a swatch to copy it.`);
  }

  #keep(colours) {
    this.#colours = colours.slice(0, this.max); // the oldest drop off
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.#colours));
    } catch {
      // storage blocked or full: the palette still works until the reload
    }
    this.#render();
  }

  #load() {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(this.storageKey)) ?? [];
    } catch {
      // blocked storage or a broken value: start empty
    }
    this.#colours = Array.isArray(saved) ? saved.filter((c) => /^#[0-9a-f]{6}$/.test(c)).slice(0, this.max) : [];
    this.#render();
  }

  async #copy(text, done) {
    try {
      await navigator.clipboard.writeText(text);
      this.#say(done);
    } catch {
      this.#say(`Couldn't copy here. Select it: ${text.replaceAll("\n", " ")}`);
    }
  }

  #render() {
    const list = this.shadowRoot.querySelector("ul");
    if (this.#colours.length === 0) {
      list.innerHTML = `<li class="empty">No colours yet.</li>`;
      return;
    }
    list.replaceChildren(
      ...this.#colours.map((hex) => {
        const item = document.createElement("li");
        item.innerHTML = `<button class="swatch" part="swatch" data-hex="${hex}" aria-label="Copy ${hex}"><i style="background:${hex}"></i>${hex}</button>`;
        return item;
      }),
    );
  }

  #say(text) {
    this.shadowRoot.querySelector("output").textContent = text;
  }
}

customElements.define("colour-thief", ColourThief);
