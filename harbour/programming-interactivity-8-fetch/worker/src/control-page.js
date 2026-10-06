// The page at the root of the API: your market's URL, chaos switches, a reset.
export function controlPage(origin) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harbour Market API</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E🏮%3C/text%3E%3C/svg%3E">
<style>
  :root { color-scheme: dark; --bg: #060b17; --panel: #0b1426; --line: #1f3052; --ink: #e3ecff; --muted: #8599c2; --act: #3ee6ff; --ok: #b6ff3b; --bad: #ff6b5a; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; }
  h1 { font-size: 2.2rem; margin: 0 0 0.3rem; letter-spacing: -0.02em; }
  h2 { font-size: 1.1rem; margin: 0 0 0.6rem; }
  p { margin: 0 0 0.8rem; color: var(--muted); }
  code, input, select, button, output { font: 500 0.95rem ui-monospace, "SF Mono", Menlo, monospace; }
  section { background: var(--panel); border: 1.5px solid var(--line); border-radius: 10px; padding: 1.1rem 1.2rem; margin: 1.2rem 0; }
  label { display: block; font-weight: 600; margin-bottom: 0.35rem; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
  input, select { color: var(--ink); background: var(--bg); border: 1.5px solid var(--line); border-radius: 6px; padding: 0.5rem 0.7rem; }
  input { flex: 1 1 14rem; }
  button { color: #03101b; background: var(--act); border: 0; border-radius: 99px; padding: 0.55rem 1rem; font-weight: 700; cursor: pointer; }
  button.ghost { color: var(--ink); background: transparent; border: 1.5px solid var(--line); }
  button.danger { background: var(--bad); }
  button:disabled { opacity: 0.4; cursor: default; }
  .url { display: block; padding: 0.6rem 0.8rem; background: var(--bg); border: 1.5px dashed var(--line); border-radius: 6px; color: var(--ok); overflow-wrap: anywhere; }
  output { display: block; margin-top: 0.6rem; color: var(--muted); min-height: 1.5em; white-space: pre-wrap; }
  a { color: var(--act); }
</style>
</head>
<body>
<main>
  <h1>🏮 Harbour Market API</h1>
  <p>Every student has their own market: the same API, the same seed data, a separate copy. Your market is named after your GitHub username.</p>

  <section>
    <label for="ns">Your GitHub username</label>
    <div class="row"><input id="ns" autocomplete="off" spellcheck="false" placeholder="octocat"><button class="ghost" id="check" type="button">Check</button></div>
    <p style="margin:0.8rem 0 0.3rem">Your API, for <code>API</code> in <code>starter/js/api.js</code>:</p>
    <code class="url" id="base">${origin}/&lt;username&gt;/api</code>
    <output id="check-out" aria-live="polite"></output>
  </section>

  <section>
    <h2>Chaos</h2>
    <p>Make your market slow and unreliable, to test loading and error states. Only your market is affected. One request only: add <code>?chaos=1</code> to its URL.</p>
    <div class="row">
      <label for="latency" style="margin:0">Latency</label>
      <select id="latency"><option value="0">none</option><option value="500">0.5 s</option><option value="1200">1.2 s</option><option value="3000">3 s</option></select>
      <label for="fail" style="margin:0 0 0 0.6rem">Failures</label>
      <select id="fail"><option value="0">none</option><option value="0.1">10 % → 503</option><option value="0.3">30 % → 503</option><option value="0.5">50 % → 503</option><option value="1">all → 503</option></select>
      <button id="save" type="button">Save</button>
    </div>
    <output id="chaos-out" aria-live="polite"></output>
  </section>

  <section>
    <h2>Reset</h2>
    <p>Back to the seed data: ten stalls, the original reviews, nothing saved, no orders. Your chaos settings stay.</p>
    <div class="row"><button class="danger" id="reset" type="button">Reset my market</button><button class="ghost" id="really" type="button" hidden>Yes, reset it</button></div>
    <output id="reset-out" aria-live="polite"></output>
  </section>

  <p>Endpoints, bodies and status codes: <a href="https://lopin.me/harbour/programming-interactivity-8-fetch/api.html">the API reference</a>. The task: <a href="https://lopin.me/harbour/programming-interactivity-8-fetch/team/connect.html">Connect the market</a>.</p>
</main>
<script>
  const $ = (s) => document.querySelector(s);
  const ns = $("#ns");
  const valid = (v) => /^[a-z0-9][a-z0-9-]{0,38}$/.test(v);
  const base = () => location.origin + "/" + ns.value.trim().toLowerCase() + "/api";
  function paint() {
    const v = ns.value.trim().toLowerCase();
    $("#base").textContent = valid(v) ? base() : location.origin + "/<username>/api";
    for (const b of ["#check", "#save", "#reset"]) $(b).disabled = !valid(v);
  }
  async function loadChaos() {
    if (!valid(ns.value.trim().toLowerCase())) return;
    try {
      const c = await (await fetch(base() + "/_chaos")).json();
      $("#latency").value = String(c.latency); $("#fail").value = String(c.fail);
      $("#chaos-out").textContent = c.latency || c.fail ? "Chaos is on." : "Chaos is off.";
    } catch { $("#chaos-out").textContent = "Couldn't read the settings."; }
  }
  try { ns.value = localStorage.getItem("harbour-ns") || ""; } catch {}
  paint(); loadChaos();
  ns.addEventListener("input", () => { try { localStorage.setItem("harbour-ns", ns.value.trim().toLowerCase()); } catch {} paint(); });
  ns.addEventListener("change", loadChaos);
  $("#check").addEventListener("click", async () => {
    const t = performance.now();
    try {
      const r = await fetch(base() + "/stalls");
      const data = await r.json();
      $("#check-out").textContent = "GET " + base() + "/stalls → " + r.status + " · " + data.length + " stalls · " + Math.round(performance.now() - t) + " ms";
    } catch (e) { $("#check-out").textContent = "No response: " + e.message; }
  });
  $("#save").addEventListener("click", async () => {
    const body = { latency: Number($("#latency").value), fail: Number($("#fail").value) };
    const r = await fetch(base() + "/_chaos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    $("#chaos-out").textContent = r.ok ? (body.latency || body.fail ? "Saved: chaos is on." : "Saved: chaos is off.") : "Couldn't save (" + r.status + ").";
  });
  $("#reset").addEventListener("click", () => { $("#really").hidden = false; $("#really").focus(); });
  $("#really").addEventListener("click", async () => {
    $("#really").hidden = true;
    const r = await fetch(base() + "/_reset", { method: "POST" });
    $("#reset-out").textContent = r.ok ? "Your market is back to the seed data." : "Couldn't reset (" + r.status + ").";
  });
</script>
</body>
</html>`;
}
