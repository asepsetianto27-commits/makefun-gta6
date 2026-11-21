// Solmara Nights — deterministic staged shots for screenshots.
// One clear job: given ?shot=<name>&seed=<n>, place the player, cars, police
// and mission so every screenshot is reproducible from its seed.
import { makeCar, spawnTraffic, spawnPeds } from './traffic.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';

export const SHOT_NAMES = ['cover', 'street', 'chase', 'mission'];

export function applyShot(S, name, seed) {
  S.rng = (() => {
    let a = (seed * 2654435761) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  S.seed = seed;
  S.mode = 'play';
  S.clock = 17.4;

  if (name === 'cover') {
    // Player driving down the main avenue at golden hour, HUD + minimap + wanted.
    S.clock = 17.6;
    const car = makeCar(S, 1140, 1120, 0, { color: '#d21f2b', type: 'sport', driver: 'player', speed: 150 });
    car.hp = 500; // staged shot: the hero car must survive the settling chase
    S.player.car = car;
    S.player.onFoot = false;
    S.player.x = car.x; S.player.y = car.y; S.player.angle = 0;
    S.player.hasPistol = true;
    S.cash = 1240;
    addWanted(S, 2);
    S.missionIndex = 1;
    startMission(S, 1, null);
    S.missionTimer = 132;
    spawnTraffic(S, 12);
    spawnPeds(S, 14);
  } else if (name === 'street') {
    // On foot on a busy street, traffic and pedestrians everywhere.
    S.clock = 12.5;
    S.player.x = 740; S.player.y = 720;
    S.player.onFoot = true;
    S.player.hasPistol = true;
    S.player.angle = Math.PI / 2;
    S.cash = 320;
    S.missionIndex = 0;
    spawnTraffic(S, 14);
    spawnPeds(S, 26);
    // A couple of parked cars the player could steal.
    makeCar(S, 800, 760, Math.PI / 2, { color: '#3d7dd9', driver: 'parked' });
    makeCar(S, 680, 760, -Math.PI / 2, { color: '#e8c33a', driver: 'parked' });
  } else if (name === 'chase') {
    // High-speed police chase at dusk, wanted level high.
    S.clock = 18.8;
    const car = makeCar(S, 1540, 1520, -Math.PI / 2, { color: '#e8c33a', type: 'sport', driver: 'player', speed: 260 });
    car.hp = 1000; // staged shot: the hero car must survive the settling chase
    S.player.car = car;
    S.player.onFoot = false;
    S.player.x = car.x; S.player.y = car.y; S.player.angle = -Math.PI / 2;
    S.player.hasPistol = true;
    S.cash = 2180;
    addWanted(S, 4);
    S.missionIndex = 2;
    startMission(S, 2, null);
    spawnTraffic(S, 10);
    spawnPeds(S, 10);
  } else if (name === 'mission') {
    // Mission 2 in progress at night: the red Comet at the marina, marker lit.
    S.clock = 20.6;
    S.player.x = 460; S.player.y = 2050;
    S.player.onFoot = true;
    S.player.hasPistol = true;
    S.player.angle = -Math.PI / 4;
    S.cash = 860;
    S.missionIndex = 1;
    startMission(S, 1, null);
    S.missionTimer = 121;
    spawnTraffic(S, 8);
    spawnPeds(S, 12);
    makeCar(S, 700, 2180, Math.PI, { color: '#7ec8e3', driver: 'parked' });
  }

  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
  return true;
}
