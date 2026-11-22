// Dungeon Deck Delve — sound.js
// All sound is synthesized with WebAudio: no audio files, no network.
// A single lazy AudioContext; every effect is a short oscillator blip so
// the game stays silent until the player first interacts (autoplay rule).

let ctx = null;
let muted = false;

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

// One note: frequency, duration, waveform and gain envelope.
function blip(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  if (muted) return;
  try {
    const ac = audio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ac.currentTime + when;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (_) { /* audio is cosmetic; never break the game */ }
}

export const sfx = {
  deal: () => blip(520, 0.08, 'triangle', 0.08),
  play: () => { blip(660, 0.07, 'triangle', 0.1); blip(880, 0.09, 'triangle', 0.08, 0.05); },
  hit: () => { blip(180, 0.15, 'sawtooth', 0.12); blip(120, 0.18, 'square', 0.08, 0.02); },
  block: () => blip(320, 0.12, 'sine', 0.1),
  heal: () => { blip(523, 0.12, 'sine', 0.09); blip(784, 0.16, 'sine', 0.09, 0.08); },
  relic: () => { blip(784, 0.1, 'triangle', 0.1); blip(1046, 0.14, 'triangle', 0.1, 0.07); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'triangle', 0.11, i * 0.11)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => blip(f, 0.25, 'sawtooth', 0.07, i * 0.13)),
  click: () => blip(440, 0.05, 'triangle', 0.06),
};
