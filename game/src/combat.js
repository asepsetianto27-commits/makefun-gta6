// Combat: fists, pistol, bullets, pickups.
import { clamp, dist } from './config.js';

export class Combat {
  constructor(game) {
    this.game = game;
    this.bullets = []; // {x,y,vx,vy,from,friendly,life}
    this.pickups = []; // {x,y,kind}
    this.punchCd = 0; this.shootCd = 0;
    this.pickups.push({ x: 760, y: 660, kind: 'pistol' });
    this.pickups.push({ x: 1560, y: 1360, kind: 'health' });
    this.pickups.push({ x: 2360, y: 560, kind: 'health' });
  }
  punch() {
    const g = this.game;
    if (this.punchCd > 0 || g.player.car) return;
    this.punchCd = 0.45;
    g.audio.punch();
    const px = g.player.x + Math.cos(g.player.angle) * 34;
    const py = g.player.y + Math.sin(g.player.angle) * 34;
    g.spawnParticles(px, py, 5, '#ffffff');
    // Hit a ped, officer or police car window
    for (const p of g.traffic.peds) {
      if (!p.dead && dist(px, py, p.x, p.y) < 34) {
        p.dead = true; g.police.addHeat(1, 'assault on a pedestrian');
        g.addMessage('You knocked someone out. The street saw it.');
        g.spawnParticles(p.x, p.y, 10, '#ff5555');
        return;
      }
    }
    for (const o of g.police.officers) {
      if (dist(px, py, o.x, o.y) < 34) {
        g.police.officers.splice(g.police.officers.indexOf(o), 1);
        g.police.addHeat(1, 'assault on an officer');
        g.addMessage('You dropped an officer. That will not be forgotten.');
        return;
      }
    }
  }
  shoot(tx, ty) {
    const g = this.game;
    if (this.shootCd > 0 || !g.player.hasGun) return;
    this.shootCd = 0.22;
    const ox = g.player.car ? g.player.car.x : g.player.x;
    const oy = g.player.car ? g.player.car.y : g.player.y;
    const a = Math.atan2(ty - oy, tx - ox);
    this.bullets.push({ x: ox + Math.cos(a) * 26, y: oy + Math.sin(a) * 26, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, friendly: true, life: 0.9 });
    g.audio.gunshot();
    g.spawnParticles(ox + Math.cos(a) * 30, oy + Math.sin(a) * 30, 4, '#ffd94d');
    g.shake = Math.max(g.shake, 2);
  }
  policeShoot(x, y, tx, ty) {
    const a = Math.atan2(ty - y, tx - x) + (Math.random() - 0.5) * 0.35;
    this.bullets.push({ x, y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, friendly: false, life: 1.0 });
    this.game.audio.gunshot();
  }
  pedShoot(p, tx, ty) {
    if (p.shootCd > 0) return;
    p.shootCd = 1.6;
    const a = Math.atan2(ty - p.y, tx - p.x) + (Math.random() - 0.5) * 0.3;
    this.bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * 650, vy: Math.sin(a) * 650, friendly: false, life: 1.0 });
    this.game.audio.gunshot();
  }
  update(dt) {
    const g = this.game;
    if (this.punchCd > 0) this.punchCd -= dt;
    if (this.shootCd > 0) this.shootCd -= dt;
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (g.world.hitsBuilding(b.x, b.y, 2)) { b.life = 0; g.spawnParticles(b.x, b.y, 3, '#cccccc'); continue; }
      if (b.friendly) {
        for (const p of g.traffic.peds) {
          if (!p.dead && dist(b.x, b.y, p.x, p.y) < 16) { p.dead = true; b.life = 0; g.police.addHeat(1, 'shooting on the street'); g.spawnParticles(p.x, p.y, 10, '#ff5555'); }
        }
        for (const c of g.police.cars) {
          if (dist(b.x, b.y, c.x, c.y) < 26) { b.life = 0; c.speed *= 0.5; g.spawnParticles(b.x, b.y, 8, '#ffcc33'); }
        }
        for (const o of g.police.officers) {
          if (dist(b.x, b.y, o.x, o.y) < 16) { b.life = 0; g.police.officers.splice(g.police.officers.indexOf(o), 1); g.police.addHeat(1, 'shooting an officer'); }
        }
      } else {
        const px = g.player.car ? g.player.car.x : g.player.x;
        const py = g.player.car ? g.player.car.y : g.player.y;
        const r = g.player.car ? 26 : 14;
        if (dist(b.x, b.y, px, py) < r) {
          b.life = 0;
          g.damagePlayer(12, 'shot');
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    // Armed peds shoot back when the player attacks nearby
    for (const p of g.traffic.peds) {
      if (p.dead || !p.armed) continue;
      const d = dist(p.x, p.y, g.player.x, g.player.y);
      if (d < 320 && (g.wanted >= 1 || g.player.hasGun)) this.pedShoot(p, g.player.x, g.player.y);
    }
    // Pickups
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (dist(g.player.x, g.player.y, pk.x, pk.y) < 30) {
        pk.taken = true;
        if (pk.kind === 'pistol') { g.player.hasGun = true; g.addMessage('Picked up a PISTOL — click to shoot.'); }
        if (pk.kind === 'health') { g.player.health = clamp(g.player.health + 50, 0, 100); g.addMessage('First-aid kit: +50 health.'); }
        g.audio.pickup();
      }
    }
  }
}
