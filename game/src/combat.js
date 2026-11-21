// Solmara Nights — combat: fists on foot, a pistol with mouse aim, bullets.
// One clear job: shooting, punching, bullet flight, and what a hit does.
import { dist, angleTo, clamp } from './util.js';
import { collideWorld } from './world.js';
import { spawnParticles, addFloater } from './state.js';
import { addWanted, damagePolice } from './police.js';

export function updateCombat(S, dt, input, audio) {
  const player = S.player;
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  if (player.onFoot && S.mode === 'play') {
    // Punch with F: a short arc in front of the player.
    if (input.consume('f') && player.punchCooldown <= 0) {
      player.punchCooldown = 0.45;
      const px = player.x + Math.cos(player.angle) * 30;
      const py = player.y + Math.sin(player.angle) * 30;
      spawnParticles(S, px, py, 5, '#ffffff', 80);
      let hitSomething = false;
      for (const ped of S.peds) {
        if (ped.state !== 'down' && dist(px, py, ped.x, ped.y) < 34) {
          ped.state = 'down';
          ped.down = 3;
          hitSomething = true;
          addWanted(S, 1);
          addFloater(S, ped.x, ped.y - 20, 'WHAM!', '#ffe08a');
        }
      }
      for (const p of [...S.police]) {
        if (p.kind === 'foot' && dist(px, py, p.x, p.y) < 34) {
          damagePolice(S, p, 25);
          hitSomething = true;
        }
      }
      if (hitSomething && audio) audio.blip(140, 0.12, 'square', 0.14);
    }
    // Shoot with the mouse once the pistol is picked up.
    if (player.hasPistol && input.mouseDown && player.shootCooldown <= 0) {
      player.shootCooldown = 0.22;
      const cam = S.camera;
      const wx = cam.x - 640 + input.mouseX;
      const wy = cam.y - 360 + input.mouseY;
      const a = angleTo(player.x, player.y, wx, wy);
      player.angle = a;
      S.bullets.push({
        x: player.x + Math.cos(a) * 22, y: player.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.9, from: 'player',
      });
      S.stats.shotsFired++;
      S.shake = Math.max(S.shake, 2);
      spawnParticles(S, player.x + Math.cos(a) * 26, player.y + Math.sin(a) * 26, 5, '#ffe08a', 120);
      if (audio) audio.gunshot();
    }
  }

  // Move bullets and resolve hits.
  for (const b of S.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const hitBuilding = S.world.buildings.some((r) => {
      return b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h;
    });
    if (hitBuilding) {
      b.life = 0;
      spawnParticles(S, b.x, b.y, 4, '#c9c9c9', 70);
      continue;
    }
    if (b.from === 'player') {
      for (const ped of S.peds) {
        if (ped.state !== 'down' && dist(b.x, b.y, ped.x, ped.y) < 14) {
          ped.state = 'down';
          ped.down = 4;
          b.life = 0;
          addWanted(S, 1);
          spawnParticles(S, ped.x, ped.y, 10, '#ff5a5a', 120);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const p of [...S.police]) {
        const px = p.kind === 'car' ? p.car.x : p.x;
        const py = p.kind === 'car' ? p.car.y : p.y;
        if (dist(b.x, b.y, px, py) < 22) {
          damagePolice(S, p, 34);
          b.life = 0;
          spawnParticles(S, px, py, 8, '#ff8a5a', 110);
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const car of S.cars) {
        if (car.driver === 'player') continue;
        if (dist(b.x, b.y, car.x, car.y) < 24) {
          car.hp -= 20;
          b.life = 0;
          spawnParticles(S, car.x, car.y, 6, '#ffb347', 100);
          if (car.hp <= 0) {
            spawnParticles(S, car.x, car.y, 22, '#ff7b2f', 200);
            car.driver = 'parked';
            car.speed = 0;
          }
          break;
        }
      }
    } else {
      // Police bullets hurt the player (or their car).
      if (dist(b.x, b.y, player.x, player.y) < 16 && player.invuln <= 0) {
        player.health -= 9;
        player.invuln = 0.5;
        b.life = 0;
        S.shake = Math.max(S.shake, 4);
        spawnParticles(S, player.x, player.y, 8, '#ff5a5a', 120);
        if (player.health <= 0) {
          S.mode = 'wasted';
        }
      }
    }
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
}

// Driving into a pedestrian knocks them down and raises the heat.
export function checkPedCollisions(S) {
  const player = S.player;
  if (!player.car) return;
  for (const ped of S.peds) {
    if (ped.state === 'down') continue;
    if (dist(player.x, player.y, ped.x, ped.y) < 26 && Math.abs(player.car.speed) > 40) {
      ped.state = 'down';
      ped.down = 4;
      addWanted(S, 1);
      spawnParticles(S, ped.x, ped.y, 12, '#ff5a5a', 130);
      addFloater(S, ped.x, ped.y - 24, 'You hit a pedestrian! +1 star', '#ff8a8a');
    }
  }
}
