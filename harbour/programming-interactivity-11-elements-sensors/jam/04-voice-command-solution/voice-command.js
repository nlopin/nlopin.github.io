// <voice-command>: listens for a list of phrases, reports them, and speaks when asked.
const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      font: 14px/1.4 system-ui, sans-serif;
      --voice-accent: #2f6fde;
    }
    :host([hidden]) { display: none; }
    button {
      font: inherit;
      padding: 6px 12px;
      border: 1px solid var(--voice-accent);
      border-radius: 8px;
      background: none;
      color: var(--voice-accent);
      cursor: pointer;
    }
    :host(:state(listening)) .listen { background: var(--voice-accent); color: #fff; }
    .heard { min-height: 2.8em; margin: 10px 0 0; font-size: 18px; }
    .interim { color: #9aa3b5; }
    .commands { margin: 6px 0 0; color: #5d6576; }
    form { display: none; gap: 8px; margin-top: 10px; }
    :host(:state(typing)) form { display: flex; }
    :host(:state(typing)) .listen { display: none; }
    input { font: inherit; padding: 6px 10px; border: 1px solid #d9dde5; border-radius: 8px; flex: 1; }
    output { display: block; min-height: 1.4em; margin-top: 8px; color: #5d6576; }
  </style>
  <button class="listen" part="button">Start listening</button>
  <form>
    <input name="text" aria-label="Type a command" autocomplete="off">
    <button part="button">Send</button>
  </form>
  <p class="heard" aria-live="polite"><span class="final"></span> <span class="interim"></span></p>
  <p class="commands"></p>
  <output role="status"></output>
`;

async function microphonePermission() {
  try {
    return await navigator.permissions.query({ name: "microphone" });
  } catch {
    return null;
  }
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class VoiceCommand extends HTMLElement {
  static observedAttributes = ["commands", "lang"];

  #internals = this.attachInternals();
  #recognition = null;
  #wanted = false; // the user asked to listen; recognition restarts after silence while this is true
  #speaking = false;
  #track = null; // the chosen microphone, while listening with a device set
  #call = 0; // bumped by stop(): a getUserMedia call that resolves late is stale
  #listeners = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.#$(".listen").addEventListener("click", () => (this.#wanted ? this.stop() : this.listen()));
    this.#$("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = event.target.elements.text;
      this.#heard(input.value, "");
      this.#match(input.value);
      input.value = "";
    });
  }

  get commands() {
    return (this.getAttribute("commands") ?? "")
      .split(",")
      .map((command) => command.trim().toLowerCase())
      .filter(Boolean);
  }

  get lang() {
    return this.getAttribute("lang") || document.documentElement.lang || navigator.language;
  }

  // The deviceId of the microphone to use; empty means the browser's default.
  get device() {
    return this.getAttribute("device") ?? "";
  }

  set device(value) {
    if (value) this.setAttribute("device", value);
    else this.removeAttribute("device");
    if (this.#wanted) {
      this.stop();
      this.listen();
    }
  }

  get listening() {
    return this.#wanted;
  }

  connectedCallback() {
    this.#listeners = new AbortController();
    this.#showCommands();
    if (!Recognition) {
      this.#internals.states.add("typing");
      this.#status("This browser can't recognise speech (Firefox can't). Type a command instead.");
      return;
    }
    this.#watchPermission();
  }

  disconnectedCallback() {
    this.stop();
    speechSynthesis.cancel();
    this.#listeners.abort();
  }

  attributeChangedCallback(name) {
    if (name === "commands") this.#showCommands();
    if (name === "lang" && this.#recognition) this.#recognition.lang = this.lang;
  }

  // Call it from a click: the first start asks for the microphone.
  listen() {
    if (!Recognition || this.#wanted) return;
    this.#wanted = true;
    this.#internals.states.add("listening");
    this.#$(".listen").textContent = "Stop listening";
    this.#status("Listening…");
    if (this.device) this.#openDevice();
    else this.#start();
  }

  stop() {
    this.#call++;
    this.#track?.stop();
    this.#track = null;
    this.#wanted = false;
    this.#internals.states.delete("listening");
    this.#$(".listen").textContent = "Start listening";
    this.#recognition?.abort();
    this.#recognition = null;
  }

  // Speaks, and doesn't listen while speaking: it would hear its own answer as a command.
  say(text) {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    speechSynthesis.cancel();
    this.#speaking = true;
    this.#recognition?.abort();
    this.#recognition = null;
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.onend = utterance.onerror = () => {
        this.#speaking = false;
        if (this.#wanted && this.isConnected) this.#start();
        resolve();
      };
      speechSynthesis.speak(utterance);
    });
  }

  // A chosen microphone: open it with getUserMedia, then hand its track to the recognition.
  async #openDevice() {
    const call = this.#call;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: this.device } } });
      const [track] = stream.getAudioTracks();
      if (call !== this.#call) {
        track.stop();
        return;
      }
      this.#track = track;
      this.#start();
    } catch (error) {
      if (call !== this.#call) return;
      const problems = {
        NotAllowedError: "The microphone is blocked. Allow it in the site controls next to the address bar.",
        NotFoundError: "No microphone found.",
        OverconstrainedError: "That microphone is gone. Pick another one.",
      };
      this.stop();
      this.#status(problems[error.name] ?? `The microphone failed: ${error.message}`);
    }
  }

  #start() {
    if (this.#recognition || this.#speaking) return;
    const recognition = new Recognition();
    recognition.lang = this.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => this.#onResult(event);
    recognition.onerror = (event) => this.#onError(event.error);
    // It ends on its own after some silence: start again while the user still wants it.
    recognition.onend = () => {
      if (this.#recognition !== recognition) return;
      this.#recognition = null;
      if (this.#wanted) this.#start();
    };
    this.#recognition = recognition;
    // start(track) is recent; an older browser ignores the track and uses the default microphone.
    if (this.#track) recognition.start(this.#track);
    else recognition.start();
  }

  #onResult(event) {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript;
      if (result.isFinal) {
        this.#heard(text, "");
        this.#match(text);
      } else {
        interim += text;
      }
    }
    if (interim) this.#heard(null, interim);
  }

  #onError(error) {
    if (error === "no-speech" || error === "aborted") return; // silence, or our own abort()
    const problems = {
      "not-allowed": "The microphone is blocked. Allow it in the site controls next to the address bar.",
      "service-not-allowed": "Speech recognition isn't allowed here.",
      "audio-capture": "No microphone found.",
      network: "Speech recognition in this browser needs the network. Type a command instead.",
    };
    this.stop();
    this.#status(problems[error] ?? `Speech recognition stopped: ${error}.`);
    if (error === "network" || error === "audio-capture") this.#internals.states.add("typing");
  }

  // A command anywhere in the phrase, as whole words: "dark" in "make it dark please", not in "darkness".
  #match(transcript) {
    const text = transcript.toLowerCase();
    const command = this.commands
      .sort((a, b) => b.length - a.length)
      .find((c) => new RegExp(`(^|\\W)${escape(c)}(\\W|$)`).test(text));
    if (!command) return;
    this.#status(`Heard “${command}”.`);
    this.dispatchEvent(new CustomEvent("command", { bubbles: true, detail: { command, transcript: transcript.trim() } }));
  }

  async #watchPermission() {
    const { signal } = this.#listeners;
    const status = await microphonePermission();
    if (!status || signal.aborted) return;
    if (status.state === "denied") this.#status("The microphone is blocked. Allow it in the site controls next to the address bar.");
    status.addEventListener("change", () => {
      if (status.state === "denied") {
        this.stop();
        this.#status("Microphone access was turned off. Allow it in the site controls to listen again.");
      } else if (status.state === "granted") {
        this.#status("The microphone is allowed. Start listening when you're ready.");
      }
    }, { signal });
  }

  #heard(final, interim) {
    if (final !== null) this.#$(".final").textContent = final;
    this.#$(".interim").textContent = interim;
  }

  #showCommands() {
    this.#$(".commands").textContent = `Commands: ${this.commands.join(", ") || "none set"}`;
  }

  #status(text) {
    this.#$("output").textContent = text;
  }

  #$(selector) {
    return this.shadowRoot.querySelector(selector);
  }
}

customElements.define("voice-command", VoiceCommand);
