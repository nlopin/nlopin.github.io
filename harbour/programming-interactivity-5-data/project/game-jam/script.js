// Everything the game needs to remember. Nothing else.
let state = {};

// Draws the whole page from state. Reads state, never changes it.
function render() {
}

// An event: work out what happened, change state, then render.
const board = document.querySelector('#board');

board.addEventListener('click', (event) => {
  render();
});

render();
