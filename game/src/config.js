// Dungeon Deck Delve — config.js
// Every tunable number of the game lives here: the card pool, the monster
// ladder, the relic pool and the run rules. Nothing in this file touches the
// DOM; deck.js, ai.js and main.js read it to build a run.

export const RUN = {
  playerMaxHp: 32,
  energyPerTurn: 3,
  handSize: 5,
  rooms: 5,
  startingGold: 0,
};

// Card types are told apart by colour AND shape, never by text alone:
//   attack = red, sword glyph   | block = blue, shield glyph
//   skill  = violet, star glyph | heal  = green, heart glyph
export const CARD_TYPE = {
  attack: { color: '#e5484d', dark: '#8f1d22', glyph: '⚔', label: 'Attack' },
  block: { color: '#3e8ef7', dark: '#1c4f9e', glyph: '🛡', label: 'Block' },
  skill: { color: '#9b6bf3', dark: '#5b2ea6', glyph: '✦', label: 'Skill' },
  heal: { color: '#3fb96a', dark: '#1e6b3a', glyph: '♥', label: 'Heal' },
};

// id, name, type, cost, text, and the numbers the engine applies.
//   dmg: damage dealt | blk: block gained | heal: HP restored
//   draw: cards drawn | gold: gold gained | weak: turns of Weak applied
//   thorns: retaliation block-damage | echo: replay the card once
export const CARDS = {
  strike:   { name: 'Strike',      type: 'attack', cost: 1, dmg: 6,  text: 'Deal 6 damage.' },
  slash:    { name: 'Slash',       type: 'attack', cost: 1, dmg: 4,  text: 'Deal 4 damage. Draw 1 card.' , draw: 1 },
  heavy:    { name: 'Heavy Blow',  type: 'attack', cost: 2, dmg: 11, text: 'Deal 11 damage.' },
  pierce:   { name: 'Pierce',      type: 'attack', cost: 1, dmg: 3,  text: 'Deal 3 damage twice.', hits: 2 },
  leech:    { name: 'Leech Bite',  type: 'attack', cost: 2, dmg: 5,  text: 'Deal 5 damage. Heal 3.', heal: 3 },
  guard:    { name: 'Guard',       type: 'block',  cost: 1, blk: 8,  text: 'Gain 8 Block.' },
  wall:     { name: 'Stone Wall',  type: 'block',  cost: 2, blk: 14, text: 'Gain 14 Block.' },
  riposte:  { name: 'Riposte',     type: 'block',  cost: 1, blk: 5,  text: 'Gain 5 Block. Deal 3 damage.', dmg: 3 },
  focus:    { name: 'Focus',       type: 'skill',  cost: 0, draw: 2, text: 'Draw 2 cards.' },
  weaken:   { name: 'Hex',         type: 'skill',  cost: 1, weak: 2, text: 'Apply 2 Weak: the foe deals half damage.' },
  thornmail:{ name: 'Thornmail',   type: 'skill',  cost: 1, thorns: 3, text: 'Gain 3 Thorns: attackers take 3 damage.' },
  ember:    { name: 'Ember Toss',  type: 'attack', cost: 0, dmg: 3,  text: 'Deal 3 damage. Costs 0.' },
  mend:     { name: 'Mend Wounds', type: 'heal',   cost: 1, heal: 7, text: 'Restore 7 HP.' },
  gamble:   { name: 'Gamble',      type: 'skill',  cost: 1, draw: 3, text: 'Draw 3 cards, then discard 1 at random.' , discardRandom: 1 },
};

// The starter deck: simple, honest cards the player learns on.
export const STARTER_DECK = [
  'strike', 'strike', 'strike', 'strike',
  'slash', 'slash', 'heavy',
  'guard', 'guard', 'guard', 'riposte',
  'focus', 'ember', 'mend',
];

// One monster per room. hp scales up the ladder; the boss (room 5) is the
// run's final exam. intentBias weights the AI's move table in ai.js.
export const MONSTERS = [
  { name: 'Cave Rat',      title: 'Room 1 · Vermin',   hp: 22, atk: 5,  art: '🐀', color: '#8a7a5a', intentBias: { attack: 0.7, block: 0.2, buff: 0.1 } },
  { name: 'Torch Goblin',  title: 'Room 2 · Trickster', hp: 30, atk: 7,  art: '👺', color: '#5a8a3c', intentBias: { attack: 0.6, block: 0.2, buff: 0.2 } },
  { name: 'Stone Golem',   title: 'Room 3 · Guardian', hp: 42, atk: 8,  art: '🗿', color: '#7a7f8a', intentBias: { attack: 0.45, block: 0.35, buff: 0.2 } },
  { name: 'Crypt Wraith',  title: 'Room 4 · Haunting', hp: 48, atk: 10, art: '👻', color: '#8a7fd0', intentBias: { attack: 0.65, block: 0.15, buff: 0.2 } },
  { name: 'Dungeon Tyrant',title: 'Room 5 · BOSS',     hp: 64, atk: 12, art: '👑', color: '#c9a227', intentBias: { attack: 0.6, block: 0.15, buff: 0.25 } },
];

// Relics are looted after each cleared room (pick 1 of 3). Each one changes
// the deck or the rules for the rest of the run.
export const RELICS = [
  { id: 'whetstone', name: 'Whetstone',   glyph: '🗡', text: '+2 damage on every Attack card.' },
  { id: 'aegis',     name: 'Aegis Charm', glyph: '🔰', text: 'Start every fight with 6 Block.' },
  { id: 'fang',      name: 'Vampiric Fang', glyph: '🧛', text: 'Heal 2 HP whenever a foe falls.' },
  { id: 'quiver',    name: 'Bottomless Quiver', glyph: '🎒', text: 'Draw +1 card every turn.' },
  { id: 'ember',     name: 'Ember Heart', glyph: '🔥', text: 'Your first Attack each turn deals +4.' },
  { id: 'mirror',    name: 'Mirror Shard', glyph: '🪞', text: 'Block also deals its value back as damage.' },
  { id: 'coin',      name: 'Lucky Coin',  glyph: '🪙', text: 'Gain 12 gold per room. Gold is your score.' },
  { id: 'boots',     name: 'Swift Boots', glyph: '🥾', text: '+1 Energy every turn.' },
];

// Score: gold looted per room plus a clear bonus. Shown on the HUD always.
export const SCORE = { goldPerRoom: 25, bossBonus: 100, relicBonus: 10 };
