// Dungeon Deck Delve — input.js
// Mouse + keyboard controls, in one place so main.js never touches events
// directly. Keys: 1–5 play the card in that hand slot, E ends the turn,
// Enter/Space starts (or replays) from the title/end screens, M mutes.
// Clicking a card plays it; clicking End Turn ends the turn. Buttons keep
// working with the mouse even when a key handler is attached.

export function bindControls(handlers) {
  const onKey = (ev) => {
    if (ev.repeat) return;
    const key = ev.key.toLowerCase();
    if (key >= '1' && key <= '5') {
      handlers.onPlaySlot(Number(key) - 1);
    } else if (key === 'e') {
      handlers.onEndTurn();
    } else if (key === 'enter' || key === ' ') {
      handlers.onConfirm();
    } else if (key === 'm') {
      handlers.onMute();
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

// Attach a click that plays the card at a hand slot, with a small "snap"
// animation class first so the card visibly lifts before it leaves.
export function bindCardClick(el, index, onPlay) {
  el.addEventListener('click', () => {
    if (el.classList.contains('disabled')) return;
    el.classList.add('card-played');
    setTimeout(() => onPlay(index), 120);
  });
}
