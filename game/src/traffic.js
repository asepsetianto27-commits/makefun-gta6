// Solmara Nights — traffic cars and pedestrians.
// One clear job: fill the roads with cars that keep their lane, and sidewalks
// with people who walk, wait, and run away from danger.
import { VERTICAL_ROADS, HORIZONTAL_ROADS, WORLD_W, WORLD_H } from './config.js';
import { randRange, pick, dist, angleTo, clamp } from './util.js';
import { nearestRoadPoint, isOnRoad, collideWorld } from './world.js';
import { spawnParticles, showMessage } from './state.js';

const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8c33a', '#7ec8e3', '#e8e8e8', '#5a5a5a', '#9b59b6', '#2ecc71', '#e67e22'];
const PED_COLORS = ['#f2c14e', '#e74c3c', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8'];

export function makeCar(S, x, y, angle, opts) {
  const o = opts || {};
  const car = {
    id: S.cars.length + Math.floor(S.rng() * 100000),
    x, y, angle, speed: o.speed || 0,
    color: o.color || pick(S.rng, CAR_COLORS),
    type: o.type || 'sedan',
    driver: o.driver || 'parked',
    targetRoad: o.targetRoad || null,
    cruise: randRange(S.rng, 55, 115),
    stopped: 0,
    w: o.type === 'truck' ? 52 : 42,
    h: o.type === 'truck' ? 22 : 20,
    hp: 100,
  };
  S.cars.push(car);
  return car;
}

export function spawnTraffic(S, count) {
  for (let i = 0; i < count; i++) {
    const p = nearestRoadPoint(randRange(S.rng, 340, WORLD_W - 340), randRange(S.rng, 200, WORLD_H - 200));
    const vertical = p.vertical;
    const lane = (S.rng() < 0.5 ? -1 : 1) * 22;
    const x = vertical ? p.x + lane : p.x;
    const y = vertical ? p.y : p.y + lane;
    const angle = vertical ? (lane < 0 ? Math.PI / 2 : -Math.PI / 2) : (lane < 0 ? 0 : Math.PI);
    makeCar(S, x, y, angle, { driver: 'traffic', speed: randRange(S.rng, 40, 100) });
  }
  // Parked cars along the kerb for the player to steal.
  for (let i = 0; i < 10; i++) {
    const p = nearestRoadPoint(randRange(S.rng, 340, WORLD_W - 340), randRange(S.rng, 200, WORLD_H - 200));
    const vertical = p.vertical;
    const side = (S.rng() < 0.5 ? -1 : 1) * 40;
    const x = vertical ? p.x + side : p.x + randRange(S.rng, -120, 120);
    const y = vertical ? p.y + randRange(S.rng, -120, 120) : p.y + side;
    const angle = vertical ? (S.rng() < 0.5 ? 0 : Math.PI) : (S.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    makeCar(S, x, y, angle, { driver: 'parked' });
  }
}

export function spawnPeds(S, count) {
  for (let i = 0; i < count; i++) {
    const p = nearestRoadPoint(randRange(S.rng, 340, WORLD_W - 340), randRange(S.rng, 200, WORLD_H - 200));
    S.peds.push({
      x: p.x + randRange(S.rng, -60, 60),
      y: p.y + randRange(S.rng, -60, 60),
      angle: S.rng() * Math.PI * 2,
      speed: randRange(S.rng, 30, 65),
      color: pick(S.rng, PED_COLORS),
      state: 'walk', // walk | flee | down | taxi
      stateTimer: randRange(S.rng, 2, 8),
      tx: 0, ty: 0, down: 0,
    });
  }
}

function steerToward(car, tx, ty, dt, maxTurn) {
  const want = angleTo(car.x, car.y, tx, ty);
  let d = want - car.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const turn = clamp(d, -maxTurn * dt, maxTurn * dt);
  car.angle += turn;
}

export function updateTraffic(S, dt) {
  const player = S.player;
  for (const car of S.cars) {
    if (car.driver !== 'traffic') continue;
    // Pick a new waypoint when close to the current one.
    if (!car.targetRoad || dist(car.x, car.y, car.targetRoad.x, car.targetRoad.y) < 60) {
      const ahead = nearestRoadPoint(car.x + Math.cos(car.angle) * 300, car.y + Math.sin(car.angle) * 300);
      const jitter = S.rng() < 0.4;
      const p = jitter
        ? nearestRoadPoint(randRange(S.rng, 340, WORLD_W - 340), randRange(S.rng, 200, WORLD_H - 200))
        : ahead;
      const lane = (S.rng() < 0.5 ? -1 : 1) * 22;
      car.targetRoad = {
        x: p.vertical ? p.x + lane : p.x,
        y: p.vertical ? p.y : p.y + lane,
        vertical: p.vertical,
      };
    }
    // Slow down if another car is right ahead.
    let blocked = false;
    for (const other of S.cars) {
      if (other === car) continue;
      const d = dist(car.x, car.y, other.x, other.y);
      if (d < 70) {
        const a = angleTo(car.x, car.y, other.x, other.y);
        let dd = a - car.angle;
        while (dd > Math.PI) dd -= Math.PI * 2;
        while (dd < -Math.PI) dd += Math.PI * 2;
        if (Math.abs(dd) < 0.7) { blocked = true; break; }
      }
    }
    const targetSpeed = blocked ? 0 : car.cruise;
    car.speed += clamp(targetSpeed - car.speed, -90 * dt, 60 * dt);
    steerToward(car, car.targetRoad.x, car.targetRoad.y, dt, 2.2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    collideWorld(car, 18, S.world);
    // Despawn far traffic and respawn it near the player so streets stay alive.
    if (dist(car.x, car.y, player.x, player.y) > 1400) {
      const p = nearestRoadPoint(player.x + randRange(S.rng, -700, 700), player.y + randRange(S.rng, -700, 700));
      car.x = p.x; car.y = p.y;
      car.speed = randRange(S.rng, 40, 90);
    }
  }
}

export function updatePeds(S, dt) {
  const player = S.player;
  for (const ped of S.peds) {
    ped.stateTimer -= dt;
    if (ped.state === 'down') {
      ped.down -= dt;
      if (ped.down <= 0) { ped.state = 'flee'; ped.stateTimer = 3; }
      continue;
    }
    // Flee from fast cars, gunfire and the wanted chase.
    let danger = null;
    if (player.car && dist(ped.x, ped.y, player.x, player.y) < 130 && Math.abs(player.car.speed) > 120) {
      danger = player;
    }
    for (const b of S.bullets) {
      if (dist(ped.x, ped.y, b.x, b.y) < 120) { danger = b; break; }
    }
    if (danger) { ped.state = 'flee'; ped.stateTimer = 2.5; }
    if (ped.state === 'flee') {
      const a = angleTo(player.x, player.y, ped.x, ped.y);
      ped.angle = a;
      ped.x += Math.cos(a) * 130 * dt;
      ped.y += Math.sin(a) * 130 * dt;
      if (ped.stateTimer <= 0) ped.state = 'walk';
    } else if (ped.state === 'walk') {
      if (ped.stateTimer <= 0 || dist(ped.x, ped.y, ped.tx, ped.ty) < 20) {
        const p = nearestRoadPoint(ped.x + randRange(S.rng, -500, 500), ped.y + randRange(S.rng, -500, 500));
        ped.tx = p.x + randRange(S.rng, -50, 50);
        ped.ty = p.y + randRange(S.rng, -50, 50);
        ped.stateTimer = randRange(S.rng, 4, 10);
      }
      ped.angle = angleTo(ped.x, ped.y, ped.tx, ped.ty);
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    }
    collideWorld(ped, 10, S.world);
    // Keep peds roughly near the player so the streets never feel empty.
    if (dist(ped.x, ped.y, player.x, player.y) > 1300) {
      const p = nearestRoadPoint(player.x + randRange(S.rng, -600, 600), player.y + randRange(S.rng, -600, 600));
      ped.x = p.x; ped.y = p.y; ped.state = 'walk'; ped.stateTimer = 2;
    }
  }
}

// The player tries to enter the nearest car. Returns the car or null.
export function nearestEnterableCar(S, maxDist) {
  let best = null;
  let bestD = maxDist || 70;
  for (const car of S.cars) {
    if (car.driver === 'player') continue;
    const d = dist(S.player.x, S.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(S, car) {
  const wasParked = car.driver === 'parked';
  const wasTraffic = car.driver === 'traffic';
  car.driver = 'player';
  S.player.car = car;
  S.player.onFoot = false;
  S.player.angle = car.angle;
  S.player.speed = 0;
  if (wasParked || wasTraffic) {
    S.stats.carsStolen++;
    S.wanted = Math.min(5, S.wanted + 1);
    S.wantedQuiet = 0;
    showMessage(S, wasParked ? 'Car stolen! The cops noticed. (+1 star)' : 'You jacked a moving car! (+1 star)', 2.5);
    spawnParticles(S, car.x, car.y, 8, '#ffd34d', 90);
  }
}

export function exitCar(S) {
  const car = S.player.car;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  S.player.car = null;
  S.player.onFoot = true;
  S.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  S.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  S.player.speed = 0;
}
