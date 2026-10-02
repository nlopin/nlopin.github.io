// ==========================================================================
// Bug hunt — tests.js. Runs every test in a hidden copy of this page, so the
// market you're clicking around in is never touched. You don't need to read
// this file: the point is to find the bugs with the debugger.
// ==========================================================================
(() => {
  if (new URLSearchParams(location.search).has("under-test")) return;

  const TEST_KEY = "bug-hunt-under-test"; // app.js uses this key when it runs under test

  const TESTS = {
    filter(w) {
      w.eval('state.tag = "food"');
      const shown = w.eval("visibleStalls()");
      const foodInData = w.eval('stalls.filter((s) => s.tag === "food").length');
      return shown.length === 3 && foodInData === 3;
    },
    total(w) {
      w.eval('state.saved = new Set(["dumplings", "taco-bike"])');
      w.document.querySelector("#tip").value = "2";
      return w.eval("nightTotal()") === 16;
    },
    storage(w) {
      w.eval('state.tag = "music"; state.cheapest = true; state.saved = new Set(["mezcal"]); save();');
      w.eval('state.tag = "all"; state.cheapest = false; state.saved = new Set(); load();');
      return w.eval('state.tag === "music" && state.cheapest === true && state.saved.has("mezcal")');
    },
    heart(w) {
      w.eval('state.tag = "all"; state.cheapest = false; state.saved = new Set(); render();');
      const heart = w.document.querySelector(".cards .save .heart");
      if (!heart) return false;
      heart.click();
      return w.eval("state.saved.size") === 1;
    },
    alias(w) {
      // the real path: the app saves, forgets, loads and draws, as after a reload
      w.eval('const s = state.saved; s.add("mezcal"); s.add("side-b"); save(); s.clear(); load(); render();');
      return w.document.querySelector(".summary").textContent.startsWith("2 saved");
    },
  };

  function fresh() {
    return new Promise((resolve) => {
      const f = document.createElement("iframe");
      f.className = "under-test";
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      f.src = location.pathname + "?under-test";
      f.addEventListener("load", () => resolve(f), { once: true });
      document.body.append(f);
    });
  }

  async function runAll() {
    const button = document.querySelector(".run");
    button.disabled = true;
    let passed = 0;
    for (const li of document.querySelectorAll(".reports [data-test]")) {
      const f = await fresh();
      let ok = false;
      try { ok = !!TESTS[li.dataset.test](f.contentWindow); } catch { ok = false; }
      f.remove();
      localStorage.removeItem(TEST_KEY);
      li.classList.toggle("pass", ok);
      li.classList.toggle("fail", !ok);
      if (ok) passed++;
    }
    document.querySelector(".score").textContent = `${passed} of 5 fixed`;
    button.disabled = false;
  }

  document.querySelector(".run").addEventListener("click", runAll);
})();
