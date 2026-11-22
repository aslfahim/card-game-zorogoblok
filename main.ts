// Dungeon Deck Delve — entrypoint (Node 22, standard library only).
//
// This program hands the game in. It copies the static game/ folder and the
// screenshots/ folder from beside this file into the output directory and
// writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library (vendor/makefun-game.ts, kit copy, unchanged).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The two runs the grader performs must write identical bytes, so this
// program does no clock reads, no randomness and no network: it only copies
// files and lets buildDossier summarise them deterministically.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Directory holding this file (the repository root at the submitted commit).
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Grader output: /output in the container, MAKEFUN_OUTPUT_DIR elsewhere.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Everything the entry ships, as (source, destination) pairs.
const payload = [
  { from: join(repoRoot, 'game'), to: join(outDir, 'game') },
  { from: join(repoRoot, 'screenshots'), to: join(outDir, 'screenshots') },
];

// Copy each payload directory, replacing a stale destination first so a
// re-run over an old output never leaves files from a previous entry.
function copyPayload({ from, to }) {
  if (!existsSync(from)) return;
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

// Guardrail: refuse to hand in a game/ that would fail the scorer's own
// caps (993 entries / 48 MiB under game/, 4 screenshots / 256 KiB each).
// The check runs before any output is written, so a bad repo fails loudly
// instead of shipping an entry the gate would refuse.
function countEntries(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      const sub = countEntries(path);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

function checkCaps() {
  const gameDir = join(repoRoot, 'game');
  const { files, bytes } = countEntries(gameDir);
  if (files > 993) throw new Error(`game/ holds ${files} entries, over the 993 cap`);
  if (bytes > 48 * 1024 * 1024) throw new Error(`game/ is ${bytes} bytes, over the 48 MiB cap`);
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
    if (shots.length > 4) throw new Error(`${shots.length} screenshots, over the 4 cap`);
    for (const name of shots) {
      const size = statSync(join(shotsDir, name)).size;
      if (size > 256 * 1024) throw new Error(`screenshot ${name} is ${size} bytes, over 256 KiB`);
    }
  }
}

mkdirSync(outDir, { recursive: true });
checkCaps();
for (const item of payload) copyPayload(item);

// Dossier options mirror the scorer's caps, so the dossier buildDossier
// writes is the one the gate compares against byte for byte.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
