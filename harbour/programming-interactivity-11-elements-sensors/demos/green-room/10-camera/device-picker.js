// Step 10: the picker lists real devices of its kind, and follows them as they come and go.
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
    .option:focus-visible {
      outline: 2px solid var(--picker-accent, #2f6fde);
      outline-offset: 2px;
    }
    .empty { color: var(--picker-muted, #6b7280); font-size: 14px; }
    ::slotted(p) { margin: 0; }
  </style>
  <div class="list"></div>
  <div class="empty" tabindex="-1" hidden><slot name="empty">No devices.</slot></div>
`;

class DevicePicker extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ["required", "kind"];

  #internals = this.attachInternals();
  #devices = [];
  #value = "";

  constructor() {
    super();
    // delegatesFocus: focusing the host (a label click, the form's validation) focuses the first focusable option.
    this.attachShadow({ mode: "open", delegatesFocus: true });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.#internals.role = "radiogroup";

    const list = this.shadowRoot.querySelector(".list");
    list.addEventListener("click", (event) => {
      const option = event.target.closest(".option");
      if (option) this.#choose(option.dataset.id, { focus: true });
    });
    list.addEventListener("keydown", (event) => this.#onKey(event));
    // delegatesFocus focuses the first focusable option, even one with tabindex="-1".
    // When focus arrives from outside, move it to the tab stop: the chosen option.
    list.addEventListener("focusin", (event) => {
      const tabStop = list.querySelector('[tabindex="0"]');
      if (tabStop && event.target !== tabStop && !list.contains(event.relatedTarget)) tabStop.focus();
    });
  }

  connectedCallback() {
    this.#render();
    this.#sync();
    navigator.mediaDevices?.addEventListener("devicechange", this.#onDeviceChange);
    this.refresh();
  }

  attributeChangedCallback(name) {
    if (name === "kind" && this.isConnected) this.refresh();
    this.#sync();
  }

  // Plug in headphones: the list updates.
  #onDeviceChange = () => this.refresh();

  // Ask the browser for every device of this kind ("audioinput", "videoinput", "audiooutput").
  // Before the user allows access, ids and labels come back as empty strings.
  async refresh() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const kind = this.getAttribute("kind");
    const all = await navigator.mediaDevices.enumerateDevices();
    // Chrome adds aliases ("default", and "communications" on Windows) for a device that's
    // also listed by its own id: skip them, so each device appears once.
    const aliases = ["default", "communications"];
    this.devices = all
      .filter((device) => device.kind === kind && device.deviceId && !aliases.includes(device.deviceId))
      .map((device) => ({ id: device.deviceId, label: device.label, groupId: device.groupId }));
  }

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

  get form() { return this.#internals.form; }
  get name() { return this.getAttribute("name"); }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }

  formResetCallback() {
    this.value = "";
  }

  #choose(id, { focus = false } = {}) {
    if (id !== this.#value) {
      this.value = id;
      this.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (focus) this.shadowRoot.querySelector(`.option[data-id="${CSS.escape(id)}"]`)?.focus();
  }

  // Radio-group keys: arrows move and select, wrapping at the ends; Space selects.
  #onKey(event) {
    const ids = this.#devices.map((device) => device.id);
    if (ids.length === 0) return;
    const current = Math.max(0, ids.indexOf(event.target.dataset.id));
    const moves = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (event.key in moves) {
      event.preventDefault(); // arrows would scroll the page
      const next = (current + moves[event.key] + ids.length) % ids.length;
      this.#choose(ids[next], { focus: true });
    } else if (event.key === " ") {
      event.preventDefault();
      this.#choose(ids[current]);
    }
  }

  #render() {
    const list = this.shadowRoot.querySelector(".list");
    this.shadowRoot.querySelector(".empty").hidden = this.#devices.length > 0;
    if (this.#devices.length === 0) {
      list.replaceChildren();
      return;
    }
    const focused = this.shadowRoot.activeElement?.dataset.id;
    // Roving tabindex: one option is in the Tab order (the chosen one, or the first).
    const tabStop = this.#devices.some((device) => device.id === this.#value) ? this.#value : this.#devices[0].id;
    list.replaceChildren(
      ...this.#devices.map((device) => {
        const option = document.createElement("div");
        option.className = "option";
        option.part.add("option");
        option.dataset.id = device.id;
        option.textContent = device.label;
        option.setAttribute("role", "radio");
        option.setAttribute("aria-checked", String(device.id === this.#value));
        option.tabIndex = device.id === tabStop ? 0 : -1;
        return option;
      }),
    );
    if (focused) list.querySelector(`.option[data-id="${CSS.escape(focused)}"]`)?.focus();
  }

  #sync() {
    this.#internals.setFormValue(this.#value || null);
    if (this.required && !this.#value) {
      this.#internals.setValidity(
        { valueMissing: true },
        "Choose one.",
        // anchor and focus target for the browser's message: the first option, or the empty state
        this.shadowRoot.querySelector(".option") ?? this.shadowRoot.querySelector(".empty"),
      );
    } else {
      this.#internals.setValidity({});
    }
  }
}

customElements.define("device-picker", DevicePicker);
