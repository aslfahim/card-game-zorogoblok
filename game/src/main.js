// Dungeon Deck Delve — main.js (part 1)
// The game engine: run state, room setup, relic effects and card play.
// Rendering lives in render.js, the monster's brain in ai.js, the deck in
// deck.js. main.js wires them together and owns the turn flow.

import { RUN, CARDS, RELICS, SCORE, MONSTERS } from './config.js';
import { newDeck, drawCards, playFromHand, discardHand, cardDef, pileSummary } from './deck.js';
import { spawnMonster, chooseIntent, describeIntent, monsterAct } from './ai.js';
import {
  cardElement, monsterCardElement, hpBar, floatText, confetti,
  titleScreen, tableScreen, renderFoeHand, renderIntent,
  relicScreen, winScreen, lossScreen,
} from './render.js';
import { bindControls, bindCardClick } from './input.js';
import { sfx, toggleMute, isMuted } from './sound.js';

const app = document.getElementById('app');

// ---- run state ---------------------------------------------------------

// A run: one delve through all five rooms.
function newRun() {
  return {
    phase: 'title', // title | play | relic | win | loss
    room: 1,
    gold: 0,
    score: 0,
    deck: newDeck([
      'strike', 'strike', 'strike', 'strike',
      'slash', 'slash', 'heavy',
      'guard', 'guard', 'guard', 'riposte',
      'focus', 'ember', 'mend',
    ]),
    relics: [],
    player: { hp: RUN.playerMaxHp, maxHp: RUN.playerMaxHp, block: 0, thorns: 0 },
    monster: null,
    energy: 0,
    energyMax: RUN.energyPerTurn,
    attacksPlayedThisTurn: 0,
    log: [],
  };
}

let state = newRun();
let unbindKeys = null;

// Relic lookups, by id.
function hasRelic(id) {
  return state.relics.some((r) => r.id === id);
}

// Energy for a fresh turn: base, plus Swift Boots.
function turnEnergy() {
  return RUN.energyPerTurn + (hasRelic('boots') ? 1 : 0);
}

// Cards drawn at turn start: hand size, plus Bottomless Quiver.
function turnDraw() {
  return RUN.handSize + (hasRelic('quiver') ? 1 : 0);
}

// Attack damage after relics: Whetstone (+2 all attacks), Ember Heart
// (+4 on the first attack of the turn).
function attackDamage(def) {
  let dmg = def.dmg || 0;
  if (hasRelic('whetstone')) dmg += 2;
  if (hasRelic('ember') && state.attacksPlayedThisTurn === 0) dmg += 4;
  return dmg;
}

// ---- rooms ---------------------------------------------------------------

// Start a room: fresh monster, fresh block, relic start-of-fight effects.
function startRoom(roomNumber) {
  state.room = roomNumber;
  state.monster = spawnMonster(roomNumber - 1);
  state.player.block = hasRelic('aegis') ? 6 : 0;
  state.player.thorns = 0;
  state.phase = 'play';
  state.monster.intent = chooseIntent(state.monster, state.player.block);
  beginTurn();
  render();
}

// Begin the player's turn: energy, draw, fresh attack counter.
function beginTurn() {
  state.energyMax = turnEnergy();
  state.energy = state.energyMax;
  state.attacksPlayedThisTurn = 0;
  state.player.block = 0;
  const drawn = drawCards(state.deck, turnDraw());
  drawn.forEach((_, i) => setTimeout(() => sfx.deal(), i * 60));
}

// ---- combat log ----------------------------------------------------------

function log(text, kind = '') {
  state.log.unshift({ text, kind });
  if (state.log.length > 6) state.log.length = 6;
  const box = document.getElementById('combat-log');
  if (box) {
    box.innerHTML = state.log
      .map((e) => `<div class="log-line ${e.kind}">${e.text}</div>`)
      .join('');
  }
}

// ---- main.js (part 2): playing cards, ending turns, winning and losing ----

// Deal damage to the monster, respecting its block. Mirror Shard reflects
// the player's block back as damage when the monster hits.
function damageMonster(amount, hits = 1) {
  let total = 0;
  for (let h = 0; h < hits; h++) {
    const absorbed = Math.min(state.monster.block, amount);
    state.monster.block -= absorbed;
    const dealt = amount - absorbed;
    state.monster.hp -= dealt;
    total += dealt;
  }
  return total;
}

// Play the card at a hand slot. Returns false when the card cannot be
// played (not enough energy, wrong phase) so the UI can shake the card.
function playCard(slot) {
  if (state.phase !== 'play') return false;
  const id = state.deck.hand[slot];
  if (id === undefined) return false;
  const def = cardDef(id);
  if (def.cost > state.energy) {
    log(`Not enough energy for ${def.name} (${def.cost} needed).`, 'warn');
    return false;
  }
  state.energy -= def.cost;
  playFromHand(state.deck, slot);
  sfx.play();
  if (def.type === 'attack') state.attacksPlayedThisTurn += 1;

  // Damage (possibly multi-hit: Pierce strikes twice).
  if (def.dmg) {
    const dealt = damageMonster(attackDamage(def), def.hits || 1);
    log(`${def.name} deals ${dealt} damage.`, 'dmg');
    floatText(app, `-${dealt}`, 'dmg');
    sfx.hit();
  }
  // Block.
  if (def.blk) {
    state.player.block += def.blk;
    log(`${def.name}: +${def.blk} Block.`, 'blk');
    sfx.block();
  }
  // Healing.
  if (def.heal) {
    const healed = Math.min(def.heal, state.player.maxHp - state.player.hp);
    state.player.hp += healed;
    log(`${def.name}: restore ${healed} HP.`, 'heal');
    floatText(app, `+${healed}`, 'heal');
    sfx.heal();
  }
  // Weak: the monster's attacks halve while it lasts.
  if (def.weak) {
    state.monster.weak += def.weak;
    log(`${def.name}: ${state.monster.name} is Weak (${def.weak}).`, 'debuff');
  }
  // Thorns: attackers take damage when they hit the player.
  if (def.thorns) {
    state.player.thorns += def.thorns;
    log(`${def.name}: +${def.thorns} Thorns.`, 'blk');
  }
  // Card draw, and Gamble's random discard afterwards.
  if (def.draw) {
    drawCards(state.deck, def.draw);
    log(`${def.name}: draw ${def.draw}.`, '');
  }
  if (def.discardRandom && state.deck.hand.length > 0) {
    const idx = Math.floor(Math.random() * state.deck.hand.length);
    const [lost] = state.deck.hand.splice(idx, 1);
    state.deck.discardPile.push(lost);
    log(`Gamble discards ${cardDef(lost).name}.`, 'warn');
  }

  // Thorns bite back immediately when the monster is the one attacking:
  // resolved here only for bookkeeping; the monster's own hit is in
  // monsterAct, which the engine calls at end of turn.
  checkMonsterDead();
  render();
  return true;
}

// The monster falls: gold, score, Vampiric Fang heal, then relic or win.
function checkMonsterDead() {
  if (!state.monster || state.monster.hp > 0) return;
  const roomGold = SCORE.goldPerRoom + (hasRelic('coin') ? 12 : 0);
  state.gold += roomGold;
  state.score += roomGold + SCORE.relicBonus;
  if (hasRelic('fang')) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
  }
  log(`${state.monster.name} falls! +${roomGold} gold.`, 'win');
  sfx.win();
  if (state.room >= RUN.rooms) {
    state.score += SCORE.bossBonus;
    state.phase = 'win';
  } else {
    state.phase = 'relic';
    state.relicChoices = pickRelics(3);
  }
}

// Three distinct relics the player has not already taken.
function pickRelics(n) {
  const pool = RELICS.filter((r) => !hasRelic(r.id));
  const picks = [];
  while (picks.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

// End the player's turn: discard the hand, the monster acts, then a new
// turn begins — unless the player died.
function endTurn() {
  if (state.phase !== 'play') return;
  discardHand(state.deck);
  state.player.block = 0;
  const results = monsterAct(state.monster, state.player);
  for (const r of results) {
    log(r.text, r.kind);
    if (r.kind === 'damage' && r.amount > 0) {
      floatText(app, `-${r.amount}`, 'dmg');
      sfx.hit();
      // Thorns: the attacker takes damage for hitting a thorny delver.
      if (state.player.thorns > 0) {
        const dealt = damageMonster(state.player.thorns);
        log(`Thorns bite back for ${dealt}.`, 'dmg');
      }
      // Mirror Shard: the block the monster just chewed through hits back.
      if (hasRelic('mirror') && r.absorbed > 0) {
        const dealt = damageMonster(r.absorbed);
        log(`Mirror Shard reflects ${dealt}.`, 'dmg');
      }
    }
    if (r.kind === 'block') sfx.block();
    if (r.kind === 'buff') sfx.play();
  }
  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.phase = 'loss';
    sfx.lose();
    render();
    return;
  }
  checkMonsterDead();
  if (state.phase === 'play') {
    state.monster.intent = chooseIntent(state.monster, state.player.block);
    beginTurn();
  }
  render();
}

// ---- main.js (part 3): rendering, scenes and boot ----

// Render the current phase into #app.
function render() {
  app.innerHTML = '';
  if (state.phase === 'title') {
    app.appendChild(titleScreen(() => { sfx.click(); startRoom(1); }));
    return;
  }
  if (state.phase === 'relic') {
    app.appendChild(relicScreen(state.relicChoices, (relic) => {
      state.relics.push(relic);
      state.score += SCORE.relicBonus;
      log(`Relic taken: ${relic.name} — ${relic.text}`, 'win');
      sfx.relic();
      startRoom(state.room + 1);
    }));
    return;
  }
  if (state.phase === 'win') {
    const screen = winScreen(state, () => { sfx.click(); state = newRun(); render(); });
    app.appendChild(screen);
    confetti(app, 48);
    return;
  }
  if (state.phase === 'loss') {
    app.appendChild(lossScreen(state, () => { sfx.click(); state = newRun(); render(); }));
    return;
  }
  renderTable();
}

// The live table: HUD, monster zone, log, player zone, hand.
function renderTable() {
  const screen = tableScreen(state, { onEndTurn: endTurn });
  app.appendChild(screen);

  // Relic icons in the HUD.
  const relicBox = document.getElementById('hud-relics');
  relicBox.innerHTML = state.relics.map(
    (r) => `<span class="hud-relic" title="${r.name}: ${r.text}">${r.glyph}</span>`,
  ).join('') || '<span class="hud-relic-none">No relics yet — clear a room!</span>';
  document.getElementById('hud-deck').textContent = pileSummary(state.deck);

  // Monster HP + status (Weak / Strength / Block).
  document.getElementById('foe-hp').replaceWith(
    hpBar(state.monster.hp, state.monster.maxHp, `${state.monster.name} HP`),
  );
  const status = [];
  if (state.monster.block > 0) status.push(`🛡 ${state.monster.block} Block`);
  if (state.monster.strength > 0) status.push(`⬆ +${state.monster.strength} Strength`);
  if (state.monster.weak > 0) status.push(`🕸 Weak (${state.monster.weak})`);
  document.getElementById('foe-status').textContent = status.join(' · ') || 'No effects';
  renderFoeHand(document.getElementById('foe-hand'), state.monster);
  renderIntent(document.getElementById('intent-banner'), describeIntent(state.monster));

  // Player HP, block, thorns and energy pips.
  document.getElementById('player-hp').replaceWith(
    hpBar(state.player.hp, state.player.maxHp, 'Delver HP'),
  );
  const blockBits = [`🛡 ${state.player.block} Block`];
  if (state.player.thorns > 0) blockBits.push(`🌵 ${state.player.thorns} Thorns`);
  document.getElementById('player-block').textContent = blockBits.join(' · ');
  const energy = document.getElementById('energy');
  energy.innerHTML = `⚡ ${state.energy} / ${state.energyMax}`;

  // The hand: playable cards glow, unaffordable ones dim.
  const hand = document.getElementById('player-hand');
  state.deck.hand.forEach((id, i) => {
    const def = cardDef(id);
    const el = cardElement(id, { playable: def.cost <= state.energy });
    el.dataset.slot = String(i + 1);
    bindCardClick(el, i, playCard);
    hand.appendChild(el);
  });

  // Combat log (kept across re-renders).
  const box = document.getElementById('combat-log');
  box.innerHTML = state.log.map((e) => `<div class="log-line ${e.kind}">${e.text}</div>`).join('');
}

// ---- scene staging for screenshots (?scene=) --------------------------
// Real renders of the game's own code: the maker drives the same states a
// player reaches. title | play | win | loss. `play` stages a mid-fight
// table (room 3, relics owned, a full hand, monster intent visible).

function stageScene(scene) {
  if (scene === 'title') { state = newRun(); render(); return; }
  if (scene === 'play') {
    state = newRun();
    state.relics = [RELICS[0], RELICS[1], RELICS[3]];
    state.gold = 75;
    state.score = 130;
    startRoom(3);
    // A composed mid-fight: some block up, monster hurt, intent shown.
    state.monster.hp = 26;
    state.monster.block = 6;
    state.monster.strength = 2;
    state.monster.intent = 'attack';
    state.player.block = 8;
    state.player.hp = 24;
    log('Torch Goblin falls! +25 gold.', 'win');
    log('Relic taken: Whetstone — +2 damage on every Attack card.', 'win');
    log('Stone Golem braces for 10 Block.', 'blk');
    render();
    return;
  }
  if (scene === 'win') {
    state = newRun();
    state.gold = 235;
    state.score = 385;
    state.relics = [RELICS[0], RELICS[1], RELICS[2], RELICS[3]];
    state.player.hp = 18;
    state.room = 5;
    state.monster = spawnMonster(4);
    state.monster.hp = 0;
    state.phase = 'win';
    render();
    return;
  }
  if (scene === 'loss') {
    state = newRun();
    state.gold = 75;
    state.score = 130;
    state.relics = [RELICS[0]];
    state.room = 4;
    state.monster = spawnMonster(3);
    state.player.hp = 0;
    state.phase = 'loss';
    render();
  }
}

// ---- boot ----------------------------------------------------------------

function boot() {
  unbindKeys = bindControls({
    onPlaySlot: (slot) => playCard(slot),
    onEndTurn: () => endTurn(),
    onConfirm: () => {
      if (state.phase === 'title') startRoom(1);
      else if (state.phase === 'win' || state.phase === 'loss') { state = newRun(); render(); }
    },
    onMute: () => {
      const muted = toggleMute();
      log(muted ? 'Sound muted (M to unmute).' : 'Sound on.', '');
    },
  });
  const scene = new URLSearchParams(window.location.search).get('scene');
  if (scene) stageScene(scene);
  else render();
}

boot();
