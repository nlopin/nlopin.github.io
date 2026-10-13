// A code playground in one file: a <textarea>, a sandboxed <iframe> that
// runs the code, console output sent back with postMessage, a reset, and the
// code kept in the URL so a link reproduces what the reader sees.

const STARTER = `// A meeting at 09:00 Berlin time, 3 November 2026
const meeting = new Date("2026-11-03T08:00:00Z");
const attendees = [
  { name: "Ana", city: "Lisbon", timeZone: "Europe/Lisbon" },
  { name: "Jonas", city: "Berlin", timeZone: "Europe/Berlin" },
  { name: "Maya", city: "New York", timeZone: "America/New_York" },
];
for (const person of attendees) {
  const time = meeting.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", // ✎ the options to change
  });
  console.log(\`\${person.name} (\${person.city}): \${time}\`);
}
`;

// What the first challenge checks for in the output
const EXPECTED = [
  { label: "Ana in Lisbon sees 08:00", test: /Lisbon\): 08:00/ },
  { label: "Jonas in Berlin sees 09:00", test: /Berlin\): 09:00/ },
  { label: "Maya in New York sees 03:00", test: /New York\): 03:00/ },
];

const $ = (s) => document.querySelector(s);
// Inside the slides (?embed): no title, a shorter editor
if (new URLSearchParams(location.search).has("embed")) document.documentElement.classList.add("embed");
const code = $("#code");

// ---- running the code -------------------------------------------------------

// Runs inside the frame, before the reader's code: forwards console calls
// and uncaught errors to the page. The frame can only talk; it can't reach in.
const RELAY = `
const __send = (msg) => parent.postMessage({ ...msg, run: __RUN }, "*");
// Show the data: every value as a reader would write it, not "[object Object]"
const __show = (v, d = 0) => {
  if (typeof v === "string") return d ? JSON.stringify(v) : v;
  if (typeof v === "function") return "ƒ " + (v.name || "anonymous") + "()";
  if (typeof v === "bigint") return v + "n";
  if (v === null || typeof v !== "object") return String(v);
  if (d > 3) return "…";
  if (v instanceof Error) return v.name + ": " + v.message;
  if (v instanceof Date) return "Date(" + (isNaN(v) ? "Invalid Date" : v.toISOString()) + ")";
  if (v instanceof Map) return "Map(" + v.size + ") {" + [...v].map(([k, x]) => __show(k, d + 1) + " => " + __show(x, d + 1)).join(", ") + "}";
  if (v instanceof Set) return "Set(" + v.size + ") {" + [...v].map((x) => __show(x, d + 1)).join(", ") + "}";
  if (Array.isArray(v)) return "[" + v.map((x) => __show(x, d + 1)).join(", ") + "]";
  const name = v.constructor && v.constructor !== Object ? v.constructor.name + " " : "";
  return name + "{" + Object.entries(v).map(([k, x]) => k + ": " + __show(x, d + 1)).join(", ") + "}";
};
for (const level of ["log", "info", "warn", "error"]) {
  console[level] = (...args) => __send({ type: "log", level, text: args.map((a) => __show(a)).join(" ") });
}
addEventListener("error", (e) => __send({ type: "error", text: e.message, line: e.lineno }));
addEventListener("unhandledrejection", (e) => __send({ type: "error", text: "Unhandled rejection: " + __show(e.reason) }));
`;

let run = 0; // which run the incoming messages belong to
let lines = [];
let frame = null;
let finished = false;
let watchdog;
const LIMIT = 1500; // ms the reader's code may run before we give up on it

function execute() {
  run++;
  lines = [];
  finished = false;
  clearTimeout(watchdog);
  // A new frame for every run: a frame stuck in a loop is thrown away,
  // and never takes the next run down with it.
  frame?.remove();
  frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts"); // scripts only: an opaque origin, no access to this page
  frame.title = "Runs the code";
  frame.hidden = true;
  const user = code.value.replace(/<\/script/gi, "<\\/script"); // the code can't close its own tag
  const head = `<!doctype html><script>const __RUN = ${run};${RELAY}<\/script>\n<script>\n`;
  frame.srcdoc =
    head + user + `\n<\/script>\n<script>__send({ type: "done" })<\/script>`;
  frame.dataset.offset = head.split("\n").length - 1; // lines before the reader's first line
  document.body.append(frame);

  const thisRun = run;
  watchdog = setTimeout(() => {
    if (thisRun !== run || finished) return;
    frame.remove();
    frame = null;
    // What it printed before it got stuck never arrived: show the last finished run, greyed and labelled
    lines.push({ level: "error", text: `Stopped: still running after ${LIMIT / 1000} s. An infinite loop? (Above: the output of the last run that finished.)` });
    show(lines);
  }, LIMIT);
}

addEventListener("message", (e) => {
  if (!frame || e.source !== frame.contentWindow) return; // only our frame, nobody else's window
  const msg = e.data;
  if (!msg || typeof msg !== "object" || msg.run !== run) return; // not ours, or from a replaced run
  if (msg.type === "done") finished = true;
  if (msg.type === "log") lines.push(msg);
  if (msg.type === "error") {
    const line = msg.line - Number(frame.dataset.offset);
    lines.push({ level: "error", text: line > 0 ? `Line ${line}: ${msg.text}` : msg.text });
  }
  show(lines); // after every message: output from timers arrives after "done"
});

// ---- views --------------------------------------------------------------------

let lastGood = [];
function show(out) {
  const failed = out.some((l) => l.level === "error");
  const onlyError = failed && out.every((l) => l.level === "error");
  // Code that doesn't parse prints nothing: keep the last good output, greyed.
  const shown = onlyError ? [...lastGood.map((l) => ({ ...l, stale: true })), ...out] : out;
  if (!failed) lastGood = out;
  $("#console").replaceChildren(
    ...shown.map((l) => {
      const li = document.createElement("li");
      li.className = `${l.level}${l.stale ? " stale" : ""}`;
      li.textContent = l.text;
      return li;
    }),
  );
  $("#status").textContent = failed ? "error" : `${out.length} line${out.length === 1 ? "" : "s"}`;
  renderChecks(out.map((l) => l.text).join("\n"));
}

function renderChecks(text) {
  $("#checks").replaceChildren(
    ...EXPECTED.map(({ label, test }) => {
      const li = document.createElement("li");
      const ok = test.test(text);
      li.className = ok ? "pass" : "fail";
      li.textContent = `${ok ? "✓" : "✗"} ${label}`;
      return li;
    }),
  );
}

function renderGutter() {
  const n = code.value.split("\n").length;
  $("#gutter").textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
}

// ---- the URL holds the code ---------------------------------------------------

const encode = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
  .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const decode = (s) => new TextDecoder().decode(
  Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0)));

function fromHash() {
  try {
    return location.hash.length > 1 ? decode(location.hash.slice(1)) : STARTER;
  } catch {
    return STARTER; // a damaged link opens the starter, not an empty editor
  }
}

// ---- input --------------------------------------------------------------------

let timer;
code.addEventListener("input", () => {
  renderGutter();
  clearTimeout(timer);
  timer = setTimeout(() => {
    history.replaceState(null, "", code.value === STARTER ? location.pathname : "#" + encode(code.value));
    execute();
  }, 300); // wait for a pause in typing, or every keystroke reloads the frame
});
code.addEventListener("scroll", () => ($("#gutter").scrollTop = code.scrollTop));

// Tab indents. Escape gives Tab back to the page, so the editor is no keyboard trap.
let tabIndents = true;
code.addEventListener("keydown", (e) => {
  if (e.key === "Escape") tabIndents = false;
  if (e.key === "Tab" && tabIndents && !e.shiftKey) {
    e.preventDefault();
    document.execCommand("insertText", false, "  "); // keeps the browser's undo history
  }
});
code.addEventListener("blur", () => (tabIndents = true));

$("#reset").addEventListener("click", () => {
  code.value = STARTER;
  history.replaceState(null, "", location.pathname);
  renderGutter();
  execute();
});

$("#share").addEventListener("click", async () => {
  const url = location.href.split("#")[0] + "#" + encode(code.value);
  try {
    await navigator.clipboard.writeText(url);
    $("#status").textContent = "link copied";
  } catch {
    $("#status").textContent = url; // no clipboard access: show the link instead
  }
});

code.value = fromHash();
renderGutter();
execute();
