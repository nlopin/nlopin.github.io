// Step 6: a preview with slots. No camera yet: the "state" attribute fakes it from outside.
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      aspect-ratio: 16 / 9;
      background: #10131a;
      color: #e8ebf2;
      border-radius: 12px;
      overflow: hidden;
    }
    :host([hidden]) { display: none; }
    .message {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      gap: 8px;
      padding: 24px;
      text-align: center;
    }
    .figure { font-size: 64px; line-height: 1; }
    :host([mirrored]) .figure { transform: scaleX(-1); }
    ::slotted(p) { margin: 0; }
    .blocked { display: none; }
    :host([state="blocked"]) .blocked { display: block; }
    :host([state="blocked"]) .idle,
    :host([state="blocked"]) .figure { display: none; }
  </style>
  <div class="message" part="message">
    <div class="figure" aria-hidden="true">👋</div>
    <div class="idle"><slot>Camera is off.</slot></div>
    <div class="blocked"><slot name="blocked">Camera unavailable.</slot></div>
  </div>
`;

class CameraPreview extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
  }

  // A boolean attribute, reflected: present means true, like disabled or hidden.
  get mirrored() {
    return this.hasAttribute("mirrored");
  }

  set mirrored(on) {
    this.toggleAttribute("mirrored", Boolean(on));
  }
}

customElements.define("camera-preview", CameraPreview);
