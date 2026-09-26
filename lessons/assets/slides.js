/* Shared slide-deck navigation. Used by every lecture's slides.html. */
(function () {
  "use strict";

  var deck = document.querySelector(".deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var progress = document.querySelector(".deck-progress");
  var counter = document.querySelector(".deck-counter");
  if (!slides.length) return;

  var current = 0;
  var overviewGrid = null;

  function clampIndex(i) {
    return Math.max(0, Math.min(slides.length - 1, i));
  }

  function render() {
    slides.forEach(function (slide, i) {
      slide.hidden = i !== current;
    });
    if (progress) progress.style.width = ((current + 1) / slides.length * 100) + "%";
    if (counter) counter.textContent = (current + 1) + " / " + slides.length;
    history.replaceState(null, "", "#" + (current + 1));
  }

  function goTo(i) {
    current = clampIndex(i);
    render();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // --- overview mode: grid of all slides, toggled with "o" ---

  function scaleThumbs() {
    if (!overviewGrid) return;
    overviewGrid.style.setProperty("--aspect-ratio", window.innerWidth / window.innerHeight);
    var thumbs = overviewGrid.querySelectorAll(".slide-thumb");
    thumbs.forEach(function (thumb, i) {
      var scale = thumb.clientWidth / window.innerWidth;
      slides[i].style.transform = "scale(" + scale + ")";
    });
  }

  function openOverview() {
    if (overviewGrid) return;
    overviewGrid = document.createElement("div");
    overviewGrid.className = "overview-grid";

    slides.forEach(function (slide, i) {
      var thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "slide-thumb" + (i === current ? " active" : "");
      thumb.setAttribute("aria-label", "Go to slide " + (i + 1));
      thumb.addEventListener("click", function () {
        goTo(i);
        closeOverview();
      });
      slide.hidden = false;
      thumb.appendChild(slide);
      overviewGrid.appendChild(thumb);
    });

    var hint = document.createElement("div");
    hint.className = "overview-hint";
    hint.textContent = "o / esc to exit";
    overviewGrid.appendChild(hint);

    document.body.appendChild(overviewGrid);
    requestAnimationFrame(scaleThumbs);
  }

  function closeOverview() {
    if (!overviewGrid) return;
    slides.forEach(function (slide) {
      slide.style.transform = "";
      deck.appendChild(slide);
    });
    overviewGrid.remove();
    overviewGrid = null;
    render();
  }

  function toggleOverview() {
    if (overviewGrid) closeOverview();
    else openOverview();
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (overviewGrid) {
      if (e.key === "Escape" || e.key === "o" || e.key === "O") {
        e.preventDefault();
        closeOverview();
      }
      return;
    }
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
        e.preventDefault();
        next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
      case "Backspace":
        e.preventDefault();
        prev();
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(slides.length - 1);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "o":
      case "O":
        e.preventDefault();
        toggleOverview();
        break;
    }
  });

  document.addEventListener("click", function (e) {
    if (overviewGrid) return;
    // Ignore clicks on interactive content inside a slide.
    if (e.target.closest("a, button, input, textarea, select, label, iframe, [data-no-nav]")) return;
    var x = e.clientX / window.innerWidth;
    if (x < 0.3) prev();
    else next();
  });

  window.addEventListener("resize", function () {
    if (overviewGrid) requestAnimationFrame(scaleThumbs);
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  var startHash = parseInt(location.hash.replace("#", ""), 10);
  if (startHash && startHash >= 1 && startHash <= slides.length) current = startHash - 1;

  render();
})();
