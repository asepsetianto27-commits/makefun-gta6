// Deterministic staged shots for screenshots (?shot=<name>&seed=<n>).
import { WORLD_W, WORLD_H, clamp } from './config.js';
import { makeCar } from './entities.js';

export function stageShot(g, name, seed) {
  const p = g.player;
  g.state = 'play';
  g.hasSave = false;
  if (name === 'cover') {
    // Player driving through a busy downtown avenue, HUD + minimap + wanted + objective visible.
    g.clock = 17.5;
    const car = makeCar(1500, 950, 0, { color: '#d33a2c', kind: 'sedan' });
    car.speed = 170;
    g.traffic.cars.push(car);
    p.car = car; p.x = car.x; p.y = car.y;
    g.missions.index = 0; g.missions.stage = 'active';
    g.missions.target = { x: 2300, y: 250, label: 'North Plaza' };
    g.missions.timerMax = 0;
    g.wanted = 2;
    g.audio.setSiren(true);
    for (let i = 0; i < 3; i++) {
      const pc = makeCar(1500 + 320 + i * 260, 950 + (i % 2 ? 60 : -60), 0, { police: true, color: '#1c2733', kind: 'police' });
      pc.speed = 200; g.police.cars.push(pc);
    }
    g.spawnTrafficNear(1500, 950, 10);
    g.spawnPedsNear(1500, 950, 12);
    g.addMessage('MISSION 1 — First Fare: drive the client to the North Plaza.');
  } else if (name === 'street') {
    // On foot on a busy street, traffic + pedestrians.
    g.clock = 10.5;
    p.x = 1100; p.y = 600; p.angle = 0; p.car = null;
    g.wanted = 0;
    g.missions.index = 0; g.missions.stage = 'idle';
    g.spawnTrafficNear(1100, 600, 12);
    g.spawnPedsNear(1100, 600, 22);
  } else if (name === 'chase') {
    // Police chase, wanted level high, dusk.
    g.clock = 18.8;
    const car = makeCar(1900, 1300, Math.PI, { color: '#2c6fd3', kind: 'sedan' });
    car.speed = 260;
    g.traffic.cars.push(car);
    p.car = car; p.x = car.x; p.y = car.y;
    g.wanted = 4;
    g.missions.index = 2; g.missions.stage = 'active';
    g.missions.timerMax = 60; g.missions.timer = 41;
    for (let i = 0; i < 4; i++) {
      const pc = makeCar(1900 - 200 - i * 130, 1300 + (i % 2 ? 46 : -46), Math.PI, { police: true, color: '#1c2733', kind: 'police' });
      pc.speed = 280; g.police.cars.push(pc);
    }
    g.spawnTrafficNear(1900, 1300, 8);
    g.spawnPedsNear(1900, 1300, 8);
    g.addMessage('MISSION 3 — Heat: lose the police!');
  } else if (name === 'mission') {
    // Mission in progress at night near the marina.
    g.clock = 21.5;
    const car = makeCar(700, 2000, -Math.PI / 2, { color: '#e8b73a', kind: 'taxi' });
    car.speed = 120;
    g.traffic.cars.push(car);
    p.car = car; p.x = car.x; p.y = car.y;
    g.missions.index = 3; g.missions.stage = 'active';
    g.missions.target = { x: 3100, y: 2000, label: 'East Docks' };
    g.missions.timerMax = 90; g.missions.timer = 62;
    g.wanted = 2;
    g.spawnTrafficNear(700, 2000, 8);
    g.spawnPedsNear(700, 2000, 10);
    g.addMessage('MISSION 4 — The Drop: deliver the package to the East Docks.');
  }
  // Snap the camera exactly onto the player so the staged frame is centred.
  g.camera.x = clamp(p.x - g.camera.w / 2, 0, WORLD_W - g.camera.w);
  g.camera.y = clamp(p.y - g.camera.h / 2, 0, WORLD_H - g.camera.h);
}
