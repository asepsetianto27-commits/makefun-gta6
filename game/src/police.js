// Wanted level and police pursuit for Solmara Nights.
import { clamp, dist } from './config.js';
import { makeCar } from './entities.js';

export class Police {
  constructor(game) {
    this.game = game;
    this.cars = []; this.officers = [];
    this.heat = 0; // 0..1, builds while police can see the player
    this.spawnCd = 0;
  }
  get wanted() { return this.game.wanted; }
  addHeat(n, reason) {
    const g = this.game;
    const before = g.wanted;
    g.wanted = clamp(g.wanted + n, 0, 5);
    if (g.wanted > before) {
      g.addMessage('WANTED: ' + g.wanted + ' star' + (g.wanted > 1 ? 's' : '') + ' — ' + reason);
      g.audio.setSiren(g.wanted > 0);
    }
  }
  update(dt) {
    const g = this.game;
    this.spawnCd -= dt;
    const wantCars = g.wanted >= 2 ? Math.min(1 + Math.floor(g.wanted / 2), 4) : (g.wanted >= 1 ? 1 : 0);
    if (g.wanted > 0 && this.cars.length < wantCars && this.spawnCd <= 0) {
      this.spawnCd = 2.5;
      const a = Math.random() * Math.PI * 2;
      const car = makeCar(g.player.x + Math.cos(a) * 700, g.player.y + Math.sin(a) * 700, 0,
        { police: true, color: '#1c2733', kind: 'police' });
      car.speed = 120;
      this.cars.push(car);
      this.game.addMessage('Police responding…');
    }
    if (g.wanted === 0) {
      // Police give up and drive off
      for (const c of this.cars) c.speed = Math.max(0, c.speed - 40 * dt);
      this.cars = this.cars.filter((c) => dist(c.x, c.y, g.player.x, g.player.y) < 1400);
      this.officers = [];
      g.audio.setSiren(false);
    }
    // Police cars chase and ram
    for (const c of this.cars) {
      const d = dist(c.x, c.y, g.player.x, g.player.y);
      const target = g.player.car ? g.player.car : g.player;
      const wantAngle = Math.atan2(target.y - c.y, target.x - c.x);
      let diff = wantAngle - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      const targetSpeed = Math.min(330, 190 + g.wanted * 28);
      c.speed += clamp(targetSpeed - c.speed, -300 * dt, 160 * dt);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      const hit = g.world.hitsBuilding(c.x, c.y, 20);
      if (hit) { c.speed *= 0.4; c.angle += 0.9; }
      // Ram the player's car
      if (g.player.car && dist(c.x, c.y, g.player.car.x, g.player.car.y) < 46) {
        g.player.car.speed *= 0.55;
        g.shake = Math.max(g.shake, 7);
        g.spawnParticles(g.player.car.x, g.player.car.y, 8, '#ffcc33');
        g.audio.crash();
      }
      // Arrest on foot: close, slow player, wanted present
      if (!g.player.car && d < 34 && Math.abs(g.player.speed) < 60) {
        g.busted('Caught by the Solmara police.');
      }
      // Police shoot at high wanted levels
      if (g.wanted >= 3 && d < 420 && Math.random() < dt * 0.8) {
        g.combat.policeShoot(c.x, c.y, g.player.x, g.player.y);
      }
    }
    // On-foot officers when wanted and player is on foot
    if (g.wanted >= 1 && !g.player.car && this.officers.length < Math.min(g.wanted, 3) && this.spawnCd <= 0) {
      this.spawnCd = 3;
      const a = Math.random() * Math.PI * 2;
      this.officers.push({ x: g.player.x + Math.cos(a) * 420, y: g.player.y + Math.sin(a) * 420, angle: 0, speed: 0, shootCd: 0 });
    }
    for (const o of this.officers) {
      const d = dist(o.x, o.y, g.player.x, g.player.y);
      o.angle = Math.atan2(g.player.y - o.y, g.player.x - o.x);
      const sp = d > 120 ? 150 : 60;
      o.x += Math.cos(o.angle) * sp * dt; o.y += Math.sin(o.angle) * sp * dt;
      if (d < 30) g.busted('An officer cuffed you on the street.');
      if (g.wanted >= 3 && d < 380 && o.shootCd <= 0) {
        o.shootCd = 1.4;
        g.combat.policeShoot(o.x, o.y, g.player.x, g.player.y);
      }
      if (o.shootCd > 0) o.shootCd -= dt;
    }
    // Wanted decays when no police are near
    if (g.wanted > 0) {
      const nearest = this.cars.length ? Math.min(...this.cars.map((c) => dist(c.x, c.y, g.player.x, g.player.y))) : 9999;
      if (nearest > 650) {
        this.heat -= dt * 0.25;
        if (this.heat <= -1) { this.heat = 0; g.wanted -= 1; g.addMessage('Heat cooling off… wanted level ' + g.wanted); if (g.wanted === 0) g.audio.setSiren(false); }
      } else this.heat = Math.min(0.4, this.heat + dt * 0.1);
    }
  }
}
