// Step 7, before: the same picker, not form-associated. Swap this file in for device-picker.js
// in index.html: pick a device, Join prints {}, and required blocks nothing.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host { display: grid; gap: 6px; }
    :host([hidden]) { display: none; }
    .list { display: grid; gap: 6px; }
    .option {
      padding: 10px 12px;
      border: 1px solid var(--picker-line, #cfd5df);
      border-radius: 8px;
      cursor: pointer;
    }
    .option[aria-checked="true"] {
      border-color: var(--picker-accent, #2f6fde);
      box-shadow: inset 0 0 0 1px var(--picker-accent, #2f6fde);
    }
    .empty { color: var(--picker-muted, #6b7280); font-size: 14px; }
  </style>
  <div class="list"></div>
`;

class DevicePicker extends HTMLElement {
  static observedAttributes = ["required"];

  #devices = [];
  #value = "";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.shadowRoot.querySelector(".list").addEventListener("click", (event) => {
      const option = event.target.closest(".option");
      if (option) this.#choose(option.dataset.id);
    });
  }

  connectedCallback() {
    this.#render();
    this.#sync();
  }

  attributeChangedCallback() {
    this.#sync();
  }

  // Data in: a list of { id, label }.
  get devices() {
    return this.#devices;
  }

  set devices(list) {
    this.#devices = list;
    if (!list.some((device) => device.id === this.#value)) this.#value = "";
    this.#render();
    this.#sync();
  }

  get value() {
    return this.#value;
  }

  set value(id) {
    this.#value = id;
    this.#render();
    this.#sync();
  }

  get required() {
    return this.hasAttribute("required");
  }

  set required(on) {
    this.toggleAttribute("required", Boolean(on));
  }

  #choose(id) {
    if (id === this.#value) return;
    this.value = id;
    // Dispatched on the host, so it bubbles to the form without crossing a shadow boundary.
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #render() {
    const list = this.shadowRoot.querySelector(".list");
    if (this.#devices.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No devices.";
      list.replaceChildren(empty);
      return;
    }
    list.replaceChildren(
      ...this.#devices.map((device) => {
        const option = document.createElement("div");
        option.className = "option";
        option.part.add("option");
        option.dataset.id = device.id;
        option.textContent = device.label;
        option.setAttribute("aria-checked", String(device.id === this.#value));
        return option;
      }),
    );
  }

  // Nothing tells the form anything.
  #sync() {}
}

customElements.define("device-picker", DevicePicker);
