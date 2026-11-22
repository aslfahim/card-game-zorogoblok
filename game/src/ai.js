// Dungeon Deck Delve — ai.js
// The monster's brain. Each turn the monster picks one intent — attack,
// block or buff — weighted by its intentBias, then telegraphs it so the
// player can read the choice and counter it (block before a big hit, hit
// hard while it buffs). The monster also holds a visible "hand" of three
// cards drawn from its own little deck, which the table shows face-up: the
// opponent's hand the player can plan around.
//
// The AI is deliberately readable, not optimal: it attacks when it can,
// blocks when hurt, and buffs when the player is low on block. A player who
// watches the intent banner wins; one who ignores it gets punished.

import { MONSTERS } from './config.js';

// The monster's mini-deck: attack, block and buff cards in its own colours.
const MONSTER_CARDS = [
  { name: 'Claw',  type: 'attack', glyph: '🐾' },
  { name: 'Bite',  type: 'attack', glyph: '🦷' },
  { name: 'Hide',  type: 'block',  glyph: '🛡' },
  { name: 'Roar',  type: 'buff',   glyph: '📣' },
  { name: 'Stomp', type: 'attack', glyph: '🦶' },
];

// Build a monster for a room index (0-based). Returns the live state the
// engine mutates: hp, block, strength, weak turns and its visible hand.
export function spawnMonster(roomIndex) {
  const base = MONSTERS[roomIndex];
  return {
    ...base,
    maxHp: base.hp,
    block: 0,
    strength: 0,
    weak: 0,
    hand: drawMonsterHand(),
    intent: null,
  };
}

// Three cards for the opponent's hand, drawn fresh each turn.
export function drawMonsterHand() {
  const hand = [];
  for (let i = 0; i < 3; i++) {
    hand.push(MONSTER_CARDS[Math.floor(Math.random() * MONSTER_CARDS.length)]);
  }
  return hand;
}

// Pick the monster's next intent. Bias comes from the monster's table;
// hurt monsters block more, and a monster facing a heavily-blocked player
// prefers to buff instead of wasting attacks on block.
export function chooseIntent(monster, playerBlock) {
  const bias = { ...monster.intentBias };
  const hpFrac = monster.hp / monster.maxHp;
  if (hpFrac < 0.35) bias.block += 0.25;
  if (playerBlock >= 10) { bias.attack -= 0.15; bias.buff += 0.15; }
  const total = bias.attack + bias.block + bias.buff;
  const roll = Math.random() * total;
  if (roll < bias.attack) return 'attack';
  if (roll < bias.attack + bias.block) return 'block';
  return 'buff';
}

// Describe the chosen intent for the banner above the monster:
// what it will do, and the number the player must respect.
export function describeIntent(monster) {
  const atk = Math.max(1, monster.atk + monster.strength);
  if (monster.intent === 'attack') {
    const shown = monster.weak > 0 ? Math.ceil(atk / 2) : atk;
    return { icon: '⚔', text: `Attacks for ${shown}`, value: shown };
  }
  if (monster.intent === 'block') {
    return { icon: '🛡', text: 'Braces for 10 Block', value: 10 };
  }
  return { icon: '⬆', text: 'Empowers: +2 Strength', value: 2 };
}

// Resolve the monster's turn against the player state. Returns a log of
// what happened, in order, for the combat log and floating numbers.
export function monsterAct(monster, player) {
  const log = [];
  if (monster.intent === 'attack') {
    let dmg = Math.max(1, monster.atk + monster.strength);
    if (monster.weak > 0) { dmg = Math.ceil(dmg / 2); monster.weak -= 1; }
    const absorbed = Math.min(player.block, dmg);
    player.block -= absorbed;
    player.hp -= (dmg - absorbed);
    log.push({ kind: 'damage', amount: dmg - absorbed, absorbed, text: `${monster.name} hits for ${dmg}` });
  } else if (monster.intent === 'block') {
    monster.block += 10;
    log.push({ kind: 'block', amount: 10, text: `${monster.name} braces for 10 Block` });
  } else {
    monster.strength += 2;
    log.push({ kind: 'buff', amount: 2, text: `${monster.name} gains +2 Strength` });
  }
  if (monster.thornsHit) { /* thorns are resolved by the engine, not here */ }
  monster.hand = drawMonsterHand();
  return log;
}

// The monster's hand as the table shows it: name, glyph and a colour by
// type, so the opponent's cards read at a glance.
export function monsterHandSummary(monster) {
  return monster.hand.map((c) => `${c.glyph} ${c.name}`).join(' · ');
}
