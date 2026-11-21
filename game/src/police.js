// Solmara Nights — wanted level and the Solmara police.
// One clear job: spawn, chase, ram and arrest; let the heat die when the player hides.
import { dist, angleTo, clamp, randRange } from './util.js';
import { nearestRoadPoint, collideWorld } from './world.js';
import { spawnParticles, showMessage } from './state.js';
import { makeCar } from './traffic.js';

export function addWanted(S, stars) {
  S.wanted = clamp(S.wanted + stars, 0, 5);
  S.wantedQuiet = 0;
}

export function updateWanted(S, dt) {
  if (S.wanted === 0) return;
  // The heat dies when no police is close and no new crime happens.
  let nearest = Infinity;
  for (const p of S.police) {
    nearest = Math.min(nearest, dist(S.player.x, S.player.y, p.x, p.y));
  }
  if (nearest > 420) {
    S.wantedQuiet += dt;
    if (S.wantedQuiet > 14) {
      S.wanted = Math.max(0, S.wanted - 1);
      S.wantedQuiet = 0;
      if (S.wanted === 0) showMessage(S, 'You lost the cops. The heat is off.', 3);
    }
  } else {
    S.wantedQuiet = 0;
  }
}

export function spawnPolice(S) {
  const want = S.wanted > 0 ? Math.min(S.wanted + 1, 5) : 0;
  const carsWanted = S.wanted >= 2 ? Math.min(S.wanted, 4) : (S.wanted === 1 ? 1 : 0);
  let carCount = 0;
  let footCount = 0;
  for (const p of S.police) {
    if (p.kind === 'car') carCount++;
    else footCount++;
  }
  // Police cars.
  while (carCount < carsWanted) {
    const p = nearestRoadPoint(
      S.player.x + randRange(S.rng, -600, 600),
      S.player.y + randRange(S.rng, -600, 600),
    );
    const car = makeCar(S, p.x, p.y, angleTo(p.x, p.y, S.player.x, S.player.y), {
      color: '#20242e', type: 'sedan', driver: 'police', speed: 60,
    });
    S.police.push({ kind: 'car', car, x: p.x, y: p.y, shootCooldown: 1.5 });
    carCount++;
  }
  // Officers on foot (only when the player is on foot or wanted is high).
  const footWant = S.player.onFoot ? Math.min(S.wanted, 3) : (S.wanted >= 4 ? 2 : 0);
  while (footCount < footWant) {
    const p = nearestRoadPoint(
      S.player.x + randRange(S.rng, -350, 350),
      S.player.y + randRange(S.rng, -350, 350),
    );
    S.police.push({
      kind: 'foot', x: p.x, y: p.y, angle: 0, speed: 0,
      shootCooldown: randRange(S.rng, 1, 2.5), hp: 50,
    });
    footCount++;
  }
  // Remove police when the wanted level is gone.
  if (S.wanted === 0) {
    for (const p of S.police) {
      if (p.kind === 'car') {
        p.car.driver = 'parked';
        p.car.speed = 0;
      }
    }
    S.police = [];
  }
}

export function updatePolice(S, dt) {
  spawnPolice(S);
  const player = S.player;
  for (const p of S.police) {
    if (p.kind === 'car') {
      const car = p.car;
      const d = dist(car.x, car.y, player.x, player.y);
      const want = angleTo(car.x, car.y, player.x, player.y);
      let dd = want - car.angle;
      while (dd > Math.PI) dd -= Math.PI * 2;
      while (dd < -Math.PI) dd += Math.PI * 2;
      car.angle += clamp(dd, -2.6 * dt, 2.6 * dt);
      const targetSpeed = d > 60 ? 235 + S.wanted * 12 : 120;
      car.speed += clamp(targetSpeed - car.speed, -160 * dt, 130 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      collideWorld(car, 18, S.world);
      p.x = car.x; p.y = car.y;
      // Ram the player's car: damage, shake, sparks.
      if (player.car && d < 46) {
        player.car.hp -= 2.5 * dt * 10;
        S.shake = Math.max(S.shake, 7);
        spawnParticles(S, car.x, car.y, 6, '#ffb347', 130);
        if (player.car.hp <= 0) {
          spawnParticles(S, player.car.x, player.car.y, 26, '#ff7b2f', 220);
          showMessage(S, 'Your car is wrecked! Bail out!', 2.5);
          player.car.speed = 0;
        }
      }
      // Arrest on foot: a police car touching a walking player busts them.
      if (player.onFoot && d < 34 && player.invuln <= 0) {
        S.mode = 'busted';
      }
      // Police shoot at a fleeing player at higher wanted levels.
      p.shootCooldown -= dt;
      if (p.shootCooldown <= 0 && d < 420 && S.wanted >= 3) {
        p.shootCooldown = randRange(S.rng, 1.2, 2.2);
        const a = angleTo(car.x, car.y, player.x, player.y) + randRange(S.rng, -0.12, 0.12);
        S.bullets.push({ x: car.x, y: car.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.1, from: 'police' });
        spawnParticles(S, car.x, car.y, 4, '#ffe08a', 90);
      }
      if (d > 1600) {
        // Teleport a lost unit back near the player so the chase never stalls.
        const rp = nearestRoadPoint(player.x + randRange(S.rng, -500, 500), player.y + randRange(S.rng, -500, 500));
        car.x = rp.x; car.y = rp.y; car.speed = 80;
      }
    } else {
      // Officer on foot.
      const d = dist(p.x, p.y, player.x, player.y);
      const a = angleTo(p.x, p.y, player.x, player.y);
      p.angle = a;
      const sp = 165;
      p.x += Math.cos(a) * sp * dt;
      p.y += Math.sin(a) * sp * dt;
      collideWorld(p, 10, S.world);
      if (player.onFoot && d < 26 && player.invuln <= 0) {
        S.mode = 'busted';
      }
      p.shootCooldown -= dt;
      if (p.shootCooldown <= 0 && d < 300 && d > 60 && S.wanted >= 2) {
        p.shootCooldown = randRange(S.rng, 1.4, 2.4);
        const sa = a + randRange(S.rng, -0.15, 0.15);
        S.bullets.push({ x: p.x, y: p.y, vx: Math.cos(sa) * 500, vy: Math.sin(sa) * 500, life: 1.0, from: 'police' });
        spawnParticles(S, p.x, p.y, 4, '#ffe08a', 90);
      }
    }
  }
}

// Called by combat when a police unit is shot: thin the chase out.
export function damagePolice(S, p, dmg) {
  if (p.kind === 'foot') {
    p.hp -= dmg;
    if (p.hp <= 0) {
      spawnParticles(S, p.x, p.y, 14, '#ff5a5a', 140);
      S.police = S.police.filter((q) => q !== p);
      addWanted(S, 1);
    }
  } else if (p.car) {
    p.car.hp -= dmg;
    if (p.car.hp <= 0) {
      spawnParticles(S, p.car.x, p.car.y, 24, '#ff7b2f', 200);
      p.car.driver = 'parked';
      p.car.speed = 0;
      S.police = S.police.filter((q) => q !== p);
      addWanted(S, 1);
    }
  }
}
