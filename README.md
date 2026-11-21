# Solmara Nights — a GTA-style open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/asepsetianto27-commits/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/asepsetianto27-commits/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmara Nights** is my entry for make.fun's "Make GTA 6" bounty
([gta6-01](https://make.fun/bounty/gta6-01)): a complete open-world crime game
that runs in a desktop browser from static files — no installs, no network,
no libraries. You are Jax Marlow, a driver-for-hire in the fictional sun-soaked
coastal city of Solmara, and you owe fixer Mama Rosa a debt. Four story jobs
stand between you and freedom.

## What is in the game

- **A city to explore on foot and by car** — gridded streets, a beach and marina
  on the west coast, parks, a river with a bridge, and buildings you can crash
  into (not recommended).
- **Traffic and pedestrians** — cars keep their lanes and brake for each other;
  people walk the sidewalks and run when things get loud.
- **Cars to steal** — walk up to any parked or traffic car, press `E`, and it is
  yours. The police will notice.
- **Wanted level and police** — stars rise when you steal, hit pedestrians, or
  shoot. Police cars chase and ram you, officers chase you on foot, and getting
  caught means BUSTED. Hide until the heat dies down.
- **Combat** — punch with `F`, and pick up the pistol near the start to aim with
  the mouse and shoot with a click. Police shoot back.
- **Four story missions** — *First Fare*, *Hot Wheels*, *Heat*, and *The Drop*,
  with briefings from Mama Rosa, timers, markers, and a proper ending.
- **Taxi fares** — a side hustle: pick up the `$` passenger and earn cash.
- **HUD and live minimap** — health, cash, reputation, wanted stars, objective
  with distance, clock, speed, and a minimap showing you, traffic, police, and
  the mission marker.
- **Save system** — press `Q` to save; the start screen offers Continue.
- **Polish** — day-to-night lighting with car headlights after dark, skid marks,
  smoke, muzzle flashes, screen shake, and a WebAudio soundtrack: engine hum,
  sirens, gunshots, and a procedural late-night bassline. All art is drawn by
  code and all sound is synthesised — nothing is borrowed from any other game.

## How to play

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome.

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| E | Enter / exit a car |
| Space | Handbrake |
| Shift | Run |
| F | Punch |
| Mouse + click | Aim and shoot (once you have the pistol) |
| M | Mission list / start the next mission |
| Q | Save game |
| Esc | Pause |

## Screenshots

The four images under `screenshots/` are real renders of this game, staged
deterministically with `?shot=<name>&seed=1`: `cover` (driving at golden hour),
`street` (on foot in traffic), `chase` (a 4-star police chase at dusk), and
`mission` (the marina job at night). The same shots can be reproduced with the
`shots.json` file inside `game/`.

## How it is built

Plain Canvas 2D and ES modules under `game/src/`, one file per job: `world.js`
(the city), `traffic.js` (cars and pedestrians), `police.js` (wanted level and
chases), `missions.js` (story and taxi fares), `combat.js`, `hud.js`
(HUD and minimap), `render.js`, `audio.js`, `save.js`, `input.js`, `config.js`,
`shots.js`, and `main.js` (game loop and self-test). Run the self-test with
`?selftest=1` — it simulates 600 ticks of driving, raises the wanted level,
starts a mission, and reports `SELFTEST OK` in the page title.

> Note: this README was rewritten from scratch in a clean session for the
> third build round — every file of this entry, README included, was written
> fresh in the recorded session.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7a80mfws&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
