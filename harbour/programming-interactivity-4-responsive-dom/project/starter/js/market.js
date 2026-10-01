// ==========================================================================
// Harbour Night Market — market.js
// How the page REACTS. Today, Part 2.
// Every feature is the same loop: FIND an element, LISTEN for an event,
// CHANGE the page. Flip a class or an attribute; let the CSS draw it.
// Open the browser's console (F12) and keep it open: errors show up there.
// ==========================================================================

console.log("market.js is running");


// ---------- 1 · The phone menu ------------------------------------------
// In the HTML the button is hidden and says aria-expanded="true", so without
// JavaScript there's no useless button and the menu stays open.
//   · find .menu-toggle and #main-nav
//   · show the button (button.hidden = false) and set aria-expanded="false"
//   · on click: flip aria-expanded between "true" and "false"
//   · stretch: a click on a link inside the nav closes the menu (delegation)
//   · stretch: Escape closes it (keydown on document, event.key)
// The CSS for it is the last block of responsive.css.



// ---------- 2 · The vendor filter -----------------------------------------
// The buttons are in .filters, each with data-filter="food" etc.
// Every .stall (li) has data-tag="food" etc.
//   · ONE listener on .filters; event.target.closest("button")
//   · the clicked button gets aria-pressed="true", the others "false"
//   · each .stall: hidden = true unless the filter is "all" or matches
//   · stretch: write "2 of 6 stalls" into .filter-count



// ---------- 3 · The ticket form ---------------------------------------------
//   · on input in the note (#message): "135 characters left" in #message-left
//   · a name needs at least one letter: setCustomValidity on input
//     (a letter test: /\p{L}/u.test(text))
//   · on SUBMIT of the form:
//       - event.preventDefault()
//       - const data = new FormData(form)
//       - build an article.ticket with createElement + textContent:
//         "See you there, Ana!" and "2 people · Early — for the food"
//         (Number() the guests: form values are strings)
//       - put it in .ticket-result with replaceChildren, then form.reset()
// Never put what a visitor typed into innerHTML.
