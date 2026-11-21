// Cars, pedestrians and traffic AI for Solmara.
import { ROADS_X, ROADS_Y, ROAD_W, WORLD_W, WORLD_H, CAR_COLORS, PED_SHIRTS, clamp, angDiff, dist } from './config.js';
import { makeRng, pick, range, int } from './rng.js';

export function makeCar(x, y, angle, opts) {
  opts = opts || {};
  return {
    x, y, angle, speed: 0, len: 46, wid: 22,
    color: opts.color || pick(makeRng((x | 0) + (y | 0) * 7 + 3), CAR_COLORS),
    kind: opts.kind || 'sedan', traffic: !!opts.traffic, police: !!opts.police,
    axis: opts.axis || 'v', dir: opts.dir || 1, lane: opts.lane || 0,
    targetSpeed: opts.targetSpeed || range(makeRng((x | 0) * 3 + 11), 90, 150),
    dead: false, brake: false, honk: 0,
  };
}
export function makePed(x, y, rng) {
  return {
    x, y, angle: rng() * Math.PI * 2, speed: range(rng, 28, 55),
    shirt: pick(rng, PED_SHIRTS), skin: pick(rng, ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']),
    armed: rng() < 0.08, fleeing: 0, target: null, dead: false, shootCd: 0,
    walkPhase: rng() * 6,
  };
}

export class Traffic {
  constructor(world, seed) {
    this.world = world; this.rng = makeRng(seed + 77);
    this.cars = []; this.peds = [];
    this.spawnInitial();
  }
  spawnInitial() {
    const rng = this.rng;
    // Traffic cars on roads
    for (let i = 0; i < 26; i++) {
      const vertical = rng() < 0.5;
      let car;
      if (vertical) {
        const rx = pick(rng, ROADS_X);
        car = makeCar(rx + (rng() < 0.5 ? -22 : 22), range(rng, 100, 2100), rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2,
          { traffic: true, axis: 'v', dir: rng() < 0.5 ? 1 : -1, lane: rng() < 0.5 ? -22 : 22 });
      } else {
        const ry = pick(rng, ROADS_Y);
        car = makeCar(range(rng, 100, 3400), ry + (rng() < 0.5 ? -22 : 22), rng() < 0.5 ? 0 : Math.PI,
          { traffic: true, axis: 'h', dir: rng() < 0.5 ? 1 : -1, lane: rng() < 0.5 ? -22 : 22 });
      }
      car.speed = car.targetSpeed;
      this.cars.push(car);
    }
    // Parked cars along road edges
    for (let i = 0; i < 18; i++) {
      const vertical = rng() < 0.5;
      if (vertical) {
        const rx = pick(rng, ROADS_X);
        this.cars.push(makeCar(rx + (rng() < 0.5 ? -ROAD_W / 2 + 12 : ROAD_W / 2 - 12), range(rng, 150, 2050), rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2, {}));
      } else {
        const ry = pick(rng, ROADS_Y);
        this.cars.push(makeCar(range(rng, 150, 3300), ry + (rng() < 0.5 ? -ROAD_W / 2 + 12 : ROAD_W / 2 - 12), rng() < 0.5 ? 0 : Math.PI, {}));
      }
    }
    // Pedestrians on sidewalks
    for (let i = 0; i < 42; i++) {
      const rx = pick(rng, ROADS_X), ry = pick(rng, ROADS_Y);
      const x = rng() < 0.5 ? rx + (rng() < 0.5 ? -ROAD_W / 2 - 16 : ROAD_W / 2 + 16) : range(rng, 150, 3300);
      const y = rng() < 0.5 ? ry + (rng() < 0.5 ? -ROAD_W / 2 - 16 : ROAD_W / 2 + 16) : range(rng, 120, 2100);
      this.peds.push(makePed(clamp(x, 40, WORLD_W - 40), clamp(y, 40, WORLD_H - 40), rng));
    }
  }
  nearestCar(x, y, maxD, exclude) {
    let best = null, bd = maxD;
    for (const c of this.cars) {
      if (c === exclude || c.dead) continue;
      const d = dist(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  update(dt, player, game) {
    const rng = this.rng;
    // Traffic cars: follow their road, turn at intersections, stop for cars ahead.
    for (const c of this.cars) {
      if (!c.traffic || c.dead) continue;
      const ahead = this.carAhead(c, 70);
      let target = ahead ? 0 : c.targetSpeed;
      if (c.axis === 'v') {
        c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        c.x += (c.dir > 0 ? 0 : 0);
        c.y += c.dir * c.speed * dt;
        c.x += (c.lane + (c.dir > 0 ? -22 : 22) * 0 - c.x + (c.axis === 'v' ? (c.dir > 0 ? 0 : 0) : 0)) * 0; // lane kept by spawn
        // Keep lane: drift x toward road centre + lane offset
        const roadX = this.nearestRoadX(c.x);
        const wantX = roadX + (c.dir > 0 ? 22 : -22);
        c.x += clamp(wantX - c.x, -60 * dt, 60 * dt);
        if ((c.dir > 0 && c.y > WORLD_H - 120) || (c.dir < 0 && c.y < 100)) { c.dir *= -1; }
        // Random turn at an intersection
        if (rng() < dt * 0.25 && this.atIntersection(c.x, c.y)) {
          if (rng() < 0.5) { c.axis = 'h'; c.dir = rng() < 0.5 ? 1 : -1; c.y = this.nearestRoadY(c.y); }
        }
      } else {
        c.angle = c.dir > 0 ? 0 : Math.PI;
        c.x += c.dir * c.speed * dt;
        const roadY = this.nearestRoadY(c.y);
        const wantY = roadY + (c.dir > 0 ? 22 : -22);
        c.y += clamp(wantY - c.y, -60 * dt, 60 * dt);
        if ((c.dir > 0 && c.x > WORLD_W - 120) || (c.dir < 0 && c.x < 100)) { c.dir *= -1; }
        if (rng() < dt * 0.25 && this.atIntersection(c.x, c.y)) {
          if (rng() < 0.5) { c.axis = 'v'; c.dir = rng() < 0.5 ? 1 : -1; c.x = this.nearestRoadX(c.x); }
        }
      }
      c.speed += clamp(target - c.speed, -260 * dt, 120 * dt);
      // Avoid the player's car: slow down if the player blocks the road
      if (player.car && dist(c.x, c.y, player.car.x, player.car.y) < 90) c.speed = Math.max(0, c.speed - 200 * dt);
    }
    // Pedestrians: stroll, flee danger, wander.
    for (const p of this.peds) {
      if (p.dead) continue;
      p.walkPhase += dt * 6;
      const danger = player.car ? dist(p.x, p.y, player.car.x, player.car.y) < 130 && Math.abs(player.car.speed) > 60
        : dist(p.x, p.y, player.x, player.y) < 60;
      if (danger) p.fleeing = 1.2;
      if (p.fleeing > 0) {
        p.fleeing -= dt;
        const away = Math.atan2(p.y - player.y, p.x - player.x);
        p.angle = away;
        p.x += Math.cos(away) * 110 * dt; p.y += Math.sin(away) * 110 * dt;
      } else {
        if (!p.target || dist(p.x, p.y, p.target.x, p.target.y) < 20 || rng() < dt * 0.05) {
          p.target = { x: clamp(p.x + range(rng, -260, 260), 40, WORLD_W - 40), y: clamp(p.y + range(rng, -260, 260), 40, 2100) };
        }
        const a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        p.angle += angDiff(a, p.angle) * Math.min(1, dt * 5);
        p.x += Math.cos(p.angle) * p.speed * dt; p.y += Math.sin(p.angle) * p.speed * dt;
      }
      const c = this.world.collide(p.x, p.y, 10);
      p.x = c.x; p.y = c.y;
      if (p.shootCd > 0) p.shootCd -= dt;
    }
    // Keep population topped up near the player
    if (this.peds.filter((p) => !p.dead).length < 30) {
      this.peds.push(makePed(clamp(player.x + range(rng, -500, 500), 40, WORLD_W - 40), clamp(player.y + range(rng, -400, 400), 40, 2100), rng));
    }
    const trafficNear = this.cars.filter((c) => c.traffic && !c.dead && dist(c.x, c.y, player.x, player.y) < 900).length;
    if (trafficNear < 8) {
      const rx = pick(rng, ROADS_X);
      const car = makeCar(rx + 22, clamp(player.y + (rng() < 0.5 ? -600 : 600), 120, 2100), Math.PI / 2, { traffic: true, axis: 'v', dir: 1, lane: 22 });
      car.speed = car.targetSpeed;
      this.cars.push(car);
    }
  }
  carAhead(c, d) {
    const ax = c.x + Math.cos(c.angle) * d, ay = c.y + Math.sin(c.angle) * d;
    for (const o of this.cars) {
      if (o === c || o.dead) continue;
      if (dist(ax, ay, o.x, o.y) < 55) return o;
    }
    return null;
  }
  atIntersection(x, y) {
    for (const rx of ROADS_X) for (const ry of ROADS_Y) if (dist(x, y, rx, ry) < 60) return true;
    return false;
  }
  nearestRoadX(x) { let b = ROADS_X[0], bd = 1e9; for (const rx of ROADS_X) { const d = Math.abs(x - rx); if (d < bd) { bd = d; b = rx; } } return b; }
  nearestRoadY(y) { let b = ROADS_Y[0], bd = 1e9; for (const ry of ROADS_Y) { const d = Math.abs(y - ry); if (d < bd) { bd = d; b = ry; } } return b; }
}
