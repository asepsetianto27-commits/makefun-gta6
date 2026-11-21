// Solmara Nights — a complete open-world crime game in the spirit of GTA 6,
// built for make.fun competition gta6-01 ("Make GTA 6").
// Explore the sun-soaked coastal city of Solmara on foot and by car, steal cars,
// outrun the Solmara police, run four story missions for fixer Mama Rosa, take
// taxi fares, and save your progress. Plain static files under game/, no build
// step, no network requests: game/index.html opens in desktop Chrome and plays.
//
// This program hands the entry in: it copies game/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Solmara Nights — entry for gta6-01. Game: "Solmara Nights", city: Solmara,
// hero: Jax Marlow, fixer: Mama Rosa. Four story missions, taxi fares, wanted
// levels, police chases, combat, HUD with live minimap, day/dusk/night lighting.
const GAME_NAME = 'Solmara Nights';
const COMPETITION = 'gta6-01';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Hand-in note for the build log: the game the dossier now describes.
console.log(`Handed in ${GAME_NAME} (${COMPETITION}): game/ + screenshots/ + dossier.json written to ${out}`);
