// Dungeon Deck Delve — render.js (part 1)
// Everything the player sees: the title screen, the dungeon table, the
// player's hand and the monster's hand, the HUD and the end screens.
// The game is DOM + CSS (no canvas): cards stay legible at thumbnail size
// and animate with CSS transitions (slide, flip, snap).

import { CARD_TYPE } from './config.js';
import { cardDef } from './deck.js';

// Build one card element. `faceUp` false renders a card back (monster hand
// cards the player has not earned a look at are never shown face-down here:
// the monster's hand is always readable, so face-down is only for the
// dealing animation's first beat).
export function cardElement(id, opts = {}) {
  const def = cardDef(id);
  const type = CARD_TYPE[def.type];
  const el = document.createElement('div');
  el.className = `card type-${def.type}${opts.playable === false ? ' disabled' : ''}`;
  el.dataset.cardId = id;
  el.style.setProperty('--card-color', type.color);
  el.style.setProperty('--card-dark', type.dark);
  el.innerHTML = `
    <div class="card-cost">${def.cost}</div>
    <div class="card-glyph">${type.glyph}</div>
    <div class="card-name">${def.name}</div>
    <div class="card-art">${cardArt(def)}</div>
    <div class="card-text">${def.text}</div>
    <div class="card-type">${type.label}</div>`;
  if (opts.onClick) el.addEventListener('click', () => opts.onClick(el));
  return el;
}

// A big art glyph per card, chosen by type and name so every card has a
// distinct silhouette even before the player reads its text.
function cardArt(def) {
  const art = {
    strike: '🗡️', slash: '⚡', heavy: '🔨', pierce: '🏹', leech: '🦇',
    guard: '🛡️', wall: '🧱', riposte: '🤺', focus: '👁️', weaken: '🕸️',
    thornmail: '🌵', ember: '🔥', mend: '💚', gamble: '🎲',
  };
  return art[def.name.toLowerCase().replace(/[^a-z]/g, '')] || CARD_TYPE[def.type].glyph;
}

// The monster's hand: small face-up cards with glyph + name, coloured by
// their type, so the opponent's hand reads at a glance.
export function monsterCardElement(card) {
  const color = card.type === 'attack' ? '#e5484d' : card.type === 'block' ? '#3e8ef7' : '#9b6bf3';
  const el = document.createElement('div');
  el.className = 'foe-card';
  el.style.setProperty('--foe-color', color);
  el.innerHTML = `<div class="foe-glyph">${card.glyph}</div><div class="foe-name">${card.name}</div>`;
  return el;
}

// Health bar: a labelled bar with a number, used for player and monster.
export function hpBar(current, max, label) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const el = document.createElement('div');
  el.className = 'hpbar';
  el.innerHTML = `
    <div class="hpbar-label">${label}</div>
    <div class="hpbar-track"><div class="hpbar-fill" style="width:${pct}%"></div></div>
    <div class="hpbar-num">${Math.max(0, current)} / ${max}</div>`;
  return el;
}

// A floating combat number ("-6", "+7", "BLOCKED") that rises and fades.
export function floatText(container, text, kind) {
  const el = document.createElement('div');
  el.className = `float-text ${kind}`;
  el.textContent = text;
  const x = 20 + Math.random() * 60;
  el.style.left = `${x}%`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// Gold-burst flourish for the win screen: absolutely-positioned sparks.
export function confetti(container, count = 40) {
  const colors = ['#ffd700', '#e5484d', '#3e8ef7', '#3fb96a', '#9b6bf3'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 2600);
  }
}

// The title screen: big title, tagline, how-to-play and the Delve button.
export function titleScreen(onStart) {
  const el = document.createElement('div');
  el.className = 'screen title-screen';
  el.innerHTML = `
    <div class="title-kicker">A ROGUELIKE CARD CRAWLER</div>
    <h1 class="title-name">DUNGEON<br>DECK DELVE</h1>
    <p class="title-tag">Five rooms. One deck. A tyrant at the bottom.</p>
    <div class="title-cards">
      <div class="mini-card c-attack">⚔<span>Strike</span></div>
      <div class="mini-card c-block">🛡<span>Guard</span></div>
      <div class="mini-card c-skill">✦<span>Hex</span></div>
      <div class="mini-card c-heal">♥<span>Mend</span></div>
    </div>
    <button class="big-button" id="start-btn">⚔ &nbsp;DELVE INTO THE DUNGEON</button>
    <p class="title-how">Play cards with mouse or keys 1–5 · <b>E</b> ends your turn ·<br>
    Read the monster's intent, block the big hits, loot a relic after every room.</p>`;
  el.querySelector('#start-btn').addEventListener('click', onStart);
  return el;
}

// ---- render.js (part 2): the table, relic choice and end screens ----

// The dungeon table: monster zone on top (foe hand + intent banner),
// player zone at the bottom (hand + energy + end-turn button), HUD across
// the top. `state` is the live game state from main.js.
export function tableScreen(state, handlers) {
  const el = document.createElement('div');
  el.className = 'screen table-screen';
  el.innerHTML = `
    <header class="hud">
      <div class="hud-left">
        <span class="hud-room">🏰 Room ${state.room} / 5</span>
        <span class="hud-score">🪙 Gold <b id="hud-gold">${state.gold}</b> · Score <b id="hud-score">${state.score}</b></span>
      </div>
      <div class="hud-relics" id="hud-relics"></div>
      <div class="hud-right"><span class="hud-deck" id="hud-deck"></span></div>
    </header>
    <section class="foe-zone">
      <div class="foe-side">
        <div class="foe-art" style="--foe-color:${state.monster.color}">${state.monster.art}</div>
        <div class="foe-info">
          <div class="foe-name">${state.monster.name}</div>
          <div class="foe-title">${state.monster.title}</div>
          <div class="foe-hp" id="foe-hp"></div>
          <div class="foe-status" id="foe-status"></div>
        </div>
      </div>
      <div class="foe-hand-wrap">
        <div class="zone-label">MONSTER'S HAND — read it, then counter it</div>
        <div class="foe-hand" id="foe-hand"></div>
        <div class="intent-banner" id="intent-banner"></div>
      </div>
    </section>
    <section class="log" id="combat-log" aria-live="polite"></section>
    <section class="player-zone">
      <div class="player-side">
        <div class="player-art">🧑‍🎤</div>
        <div class="player-info">
          <div class="player-name">Delver</div>
          <div class="player-hp" id="player-hp"></div>
          <div class="player-block" id="player-block"></div>
        </div>
        <div class="energy" id="energy"></div>
      </div>
      <div class="hand-wrap">
        <div class="zone-label">YOUR HAND — click a card or press 1–5</div>
        <div class="hand" id="player-hand"></div>
      </div>
      <button class="end-turn" id="end-turn-btn">End Turn <span class="key-hint">E</span></button>
    </section>`;
  el.querySelector('#end-turn-btn').addEventListener('click', handlers.onEndTurn);
  return el;
}

// Fill the monster's hand row and the intent banner for the current turn.
export function renderFoeHand(container, monster) {
  container.innerHTML = '';
  for (const card of monster.hand) container.appendChild(monsterCardElement(card));
}

// Fill the intent banner from a describeIntent() result: icon + text so the
// monster's next move is always readable before it happens.
export function renderIntent(banner, desc) {
  banner.innerHTML = `<span class="intent-icon">${desc.icon}</span>
    <span class="intent-text">Monster intends: <b>${desc.text}</b></span>`;
}

// Relic choice screen: pick 1 of 3 after clearing a room.
export function relicScreen(choices, onPick) {
  const el = document.createElement('div');
  el.className = 'screen relic-screen';
  el.innerHTML = `
    <h2 class="screen-title">💰 ROOM CLEARED!</h2>
    <p class="screen-sub">The monster drops its hoard. Choose one relic — it changes your deck for the rest of the delve.</p>
    <div class="relic-row"></div>`;
  const row = el.querySelector('.relic-row');
  choices.forEach((relic, i) => {
    const card = document.createElement('button');
    card.className = 'relic-card';
    card.innerHTML = `<div class="relic-glyph">${relic.glyph}</div>
      <div class="relic-name">${relic.name}</div>
      <div class="relic-text">${relic.text}</div>
      <div class="relic-key">press ${i + 1}</div>`;
    card.addEventListener('click', () => onPick(relic));
    row.appendChild(card);
  });
  return el;
}

// Win screen: the tyrant falls, gold tallied, flourish of confetti.
export function winScreen(state, onAgain) {
  const el = document.createElement('div');
  el.className = 'screen end-screen win-screen';
  el.innerHTML = `
    <div class="end-kicker">👑 THE TYRANT FALLS 👑</div>
    <h2 class="end-title">DUNGEON CLEARED!</h2>
    <p class="end-sub">Five rooms, one deck, zero mercy. The delve is yours, Delver.</p>
    <div class="end-stats">
      <div><span>🪙 Gold</span><b>${state.gold}</b></div>
      <div><span>⭐ Score</span><b>${state.score}</b></div>
      <div><span>♥ HP left</span><b>${Math.max(0, state.player.hp)} / ${state.player.maxHp}</b></div>
      <div><span>🔰 Relics</span><b>${state.relics.length}</b></div>
    </div>
    <button class="big-button" id="again-btn">↻ &nbsp;DELVE AGAIN</button>`;
  el.querySelector('#again-btn').addEventListener('click', onAgain);
  return el;
}

// Loss screen: the dungeon keeps its delver.
export function lossScreen(state, onAgain) {
  const el = document.createElement('div');
  el.className = 'screen end-screen loss-screen';
  el.innerHTML = `
    <div class="end-kicker">💀 THE DUNGEON KEEPS YOU 💀</div>
    <h2 class="end-title">YOU DIED</h2>
    <p class="end-sub">Slain in Room ${state.room} by the ${state.monster.name}.
    The deck is shuffled. The torch is lit again.</p>
    <div class="end-stats">
      <div><span>🏰 Room reached</span><b>${state.room} / 5</b></div>
      <div><span>🪙 Gold</span><b>${state.gold}</b></div>
      <div><span>⭐ Score</span><b>${state.score}</b></div>
      <div><span>🔰 Relics</span><b>${state.relics.length}</b></div>
    </div>
    <button class="big-button" id="again-btn">↻ &nbsp;TRY AGAIN</button>`;
  el.querySelector('#again-btn').addEventListener('click', onAgain);
  return el;
}
