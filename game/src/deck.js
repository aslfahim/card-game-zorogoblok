// Dungeon Deck Delve — deck.js
// The player's deck: build, shuffle, draw, discard and reshuffle.
// A deck is a plain array of card ids; the draw pile, hand and discard pile
// are separate arrays so the UI can show counts honestly.

import { CARDS } from './config.js';

// Fisher–Yates shuffle. Uses Math.random: the run is a game, not a
// deterministic simulation, so a shuffled deck is correct here.
export function shuffle(pile) {
  for (let i = pile.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}

// A fresh run's deck: the starter list, shuffled, with empty hand/discard.
export function newDeck(cardIds) {
  return {
    drawPile: shuffle([...cardIds]),
    hand: [],
    discardPile: [],
  };
}

// Draw n cards into the hand, reshuffling the discard pile when the draw
// pile runs dry. Returns the ids actually drawn.
export function drawCards(deck, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (deck.drawPile.length === 0) {
      if (deck.discardPile.length === 0) break;
      deck.drawPile = shuffle([...deck.discardPile]);
      deck.discardPile = [];
    }
    drawn.push(deck.drawPile.pop());
  }
  deck.hand.push(...drawn);
  return drawn;
}

// Play a card out of the hand: remove it by index and send it to discard.
export function playFromHand(deck, handIndex) {
  const [id] = deck.hand.splice(handIndex, 1);
  if (id !== undefined) deck.discardPile.push(id);
  return id;
}

// Discard the whole hand at end of turn (standard deckbuilder rule).
export function discardHand(deck) {
  deck.discardPile.push(...deck.hand);
  deck.hand = [];
}

// Count how many copies of a card id the whole deck holds (all piles).
export function countCard(deck, id) {
  const all = [...deck.drawPile, ...deck.hand, ...deck.discardPile];
  return all.filter((c) => c === id).length;
}

// A one-line summary for the HUD: "Draw 12 · Discard 4".
export function pileSummary(deck) {
  return `Draw ${deck.drawPile.length} · Discard ${deck.discardPile.length}`;
}

// Look up a card definition; unknown ids fail loudly in development.
export function cardDef(id) {
  const def = CARDS[id];
  if (!def) throw new Error(`unknown card id: ${id}`);
  return def;
}
