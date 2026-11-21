// Solmara Nights — main game: loop, states, player, driving, camera, self-test.
import { WORLD_W, WORLD_H, clamp, dist, angDiff } from './config.js';
import { World } from './world.js';
import { Traffic, makeCar, makePed } from './entities.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { drawWorld, drawCar, drawPed, drawParticles, drawSkids, drawMarker } from './render.js';
import { drawHUD, drawMenu } from './hud.js';
import { stageShot } from './shots.js';
import { makeRng, range } from './rng.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '20261121', 10);

class Game {
  constructor() {
    this.world = new World(seed);
    this.traffic = new Traffic(this.world, seed);
    this.audio = new SoundBank();
    this.input = new Input(canvas);
    this.police = new Police(this);
    this.combat = new Combat(this);
    this.missions = new Missions(this);
    this.player = {
      x: 700, y: 1650, angle: -Math.PI / 2, speed: 0,
      health: 100, cash: 120, hasGun: false, car: null, run: false,
    };
    this.state = 'title'; // title | play | pause | busted | wasted
    this.wanted = 0;
    this.reputation = 0;
    this.clock = 9.0; // hours, 0..24
    this.particles = [];
    this.skids = [];
    this.messages = [];
    this.camera = { x: 0, y: 0, w: 1280, h: 720 };
    this.shake = 0;
    this.endReason = '';
    this.hasSave = hasSave();
    this.time = 0;
    this.missionListOpen = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    this.camera.w = canvas.width; this.camera.h = canvas.height;
  }
  dayName() {
    if (this.clock < 6 || this.clock >= 20) return 'NIGHT';
    if (this.clock < 11) return 'MORNING';
    if (this.clock < 16) return 'DAY';
    return 'DUSK';
  }
  addMessage(text) {
    this.messages.push({ text, life: 6 });
    if (this.messages.length > 6) this.messages.shift();
  }
  spawnParticles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = range(makeRng((Math.random() * 1e9) | 0), 20, 90);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, maxLife: 0.6, size: 3 + Math.random() * 3, color });
    }
  }
  spawnTrafficNear(x, y, n) {
    const rng = makeRng(seed + 5);
    for (let i = 0; i < n; i++) {
      const rx = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100][Math.floor(rng() * 8)];
      const car = makeCar(rx + (rng() < 0.5 ? -22 : 22), clamp(y + range(rng, -500, 500), 120, 2100), rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2,
        { traffic: true, axis: 'v', dir: rng() < 0.5 ? 1 : -1 });
      car.speed = car.targetSpeed;
      this.traffic.cars.push(car);
    }
  }
  spawnPedsNear(x, y, n) {
    const rng = makeRng(seed + 9);
    for (let i = 0; i < n; i++) {
      this.traffic.peds.push(makePed(clamp(x + range(rng, -450, 450), 40, WORLD_W - 40), clamp(y + range(rng, -350, 350), 40, 2100), rng));
    }
  }
  saveGame() { saveGame(this); }
  newGame() {
    this.player.cash = 120; this.player.health = 100; this.player.hasGun = false;
    this.player.x = 700; this.player.y = 1650; this.player.car = null; this.player.angle = -Math.PI / 2;
    this.wanted = 0; this.reputation = 0; this.clock = 9.0;
    this.missions.index = 0; this.missions.stage = 'idle'; this.missions.completed = 0;
    this.missions.say(['MAMA ROSA: Jax. You owe me $4,000. Drive for me, and maybe I forget the interest.', 'JAX: One job at a time, Rosa. Where is the first fare?']);
    this.state = 'play';
    this.audio.ensure(); this.audio.startMusic();
    this.addMessage('Welcome to Solmara. Press M to start Mission 1 — First Fare.');
    // A starter car parked nearby
    const car = makeCar(760, 1650, 0, { color: '#e8b73a', kind: 'sedan' });
    this.traffic.cars.push(car);
    this.addMessage('Your yellow sedan is parked to the east. Press E to get in.');
  }
  continueGame() {
    const s = loadGame();
    if (!s) { this.newGame(); return; }
    this.player.cash = s.cash; this.player.health = s.health; this.player.hasGun = s.hasGun;
    this.player.x = s.x; this.player.y = s.y; this.clock = s.clock || 9;
    this.reputation = s.reputation || 0;
    this.missions.index = s.missionIndex || 0; this.missions.completed = s.completed || 0;
    this.missions.stage = 'idle';
    this.state = 'play';
    this.audio.ensure(); this.audio.startMusic();
    this.addMessage('Welcome back to Solmara, Jax.');
  }
  damagePlayer(n, cause) {
    const p = this.player;
    p.health -= n;
    this.shake = Math.max(this.shake, 4);
    this.spawnParticles(p.x, p.y, 6, '#ff5555');
    if (p.health <= 0) {
      p.health = 0;
      this.state = 'wasted';
      this.endReason = cause === 'shot' ? 'Jax was gunned down in the streets of Solmara.' : 'Jax went down in the streets of Solmara.';
      this.audio.busted();
    }
  }
  busted(reason) {
    if (this.state !== 'play') return;
    this.state = 'busted';
    this.endReason = reason;
    this.player.cash = Math.max(0, this.player.cash - 150);
    this.wanted = 0;
    this.police.cars = []; this.police.officers = [];
    this.audio.setSiren(false);
    this.audio.busted();
  }
  enterExitCar() {
    const p = this.player;
    if (p.car) {
      const c = p.car;
      p.x = c.x + Math.cos(c.angle + Math.PI / 2) * 34;
      p.y = c.y + Math.sin(c.angle + Math.PI / 2) * 34;
      p.angle = c.angle;
      p.car = null;
      this.audio.setEngine(0, false);
    } else {
      const c = this.traffic.nearestCar(p.x, p.y, 70, null);
      if (c) {
        p.car = c;
        c.traffic = false;
        p.x = c.x; p.y = c.y;
        if (c.police) this.police.addHeat(2, 'stealing a police car');
        else if (Math.random() < 0.6) this.police.addHeat(1, 'car theft witnessed');
        this.audio.startEngine();
        this.addMessage(c.police ? 'You stole a POLICE car. Bold.' : 'Car taken. Drive it like you own it.');
      }
    }
  }
  updateCamera(dt) {
    const cam = this.camera;
    const tx = clamp(this.player.x - cam.w / 2, 0, WORLD_W - cam.w);
    const ty = clamp(this.player.y - cam.h / 2, 0, WORLD_H - cam.h);
    cam.x += (tx - cam.x) * Math.min(1, dt * 5);
    cam.y += (ty - cam.y) * Math.min(1, dt * 5);
    if (this.shake > 0) {
      cam.x += (Math.random() - 0.5) * this.shake;
      cam.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 30);
    }
  }
  update(dt) {
    const p = this.player;
    const inp = this.input;
    this.time += dt;
    this.clock = (this.clock + dt * 0.06) % 24; // a full day in ~6.5 min
    for (const m of this.messages) m.life -= dt;
    this.messages = this.messages.filter((m) => m.life > 0);
    for (const pt of this.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const s of this.skids) s.life -= dt;
    this.skids = this.skids.filter((s) => s.life > 0);

    if (inp.wasPressed('escape')) { this.state = 'pause'; this.audio.setEngine(0, false); return; }
    if (inp.wasPressed('m')) this.missionListOpen = !this.missionListOpen;
    if (inp.wasPressed('s') && this.state === 'pause') {} // handled in pause branch
    if (inp.wasPressed('e')) this.enterExitCar();
    if (inp.wasPressed('f')) this.combat.punch();
    if (inp.clicked) {
      const wx = this.camera.x + inp.mouseX, wy = this.camera.y + inp.mouseY;
      this.combat.shoot(wx, wy);
    }

    if (p.car) this.updateDriving(dt);
    else this.updateOnFoot(dt);

    this.traffic.update(dt, p, this);
    this.police.update(dt);
    this.combat.update(dt);
    this.missions.update(dt);

    // Car vs ped collisions (running someone over = crime)
    if (p.car && Math.abs(p.car.speed) > 80) {
      for (const ped of this.traffic.peds) {
        if (!ped.dead && dist(ped.x, ped.y, p.car.x, p.car.y) < 30) {
          ped.dead = true;
          this.police.addHeat(1, 'running over a pedestrian');
          this.spawnParticles(ped.x, ped.y, 10, '#ff5555');
          this.audio.crash();
          p.car.speed *= 0.7;
        }
      }
    }
    // Car vs traffic car collisions
    if (p.car) {
      for (const c of this.traffic.cars) {
        if (c === p.car || c.dead) continue;
        if (dist(c.x, c.y, p.car.x, p.car.y) < 42) {
          if (Math.abs(p.car.speed) > 120 || Math.abs(c.speed) > 60) {
            this.shake = Math.max(this.shake, 6);
            this.audio.crash();
            this.spawnParticles((c.x + p.car.x) / 2, (c.y + p.car.y) / 2, 10, '#ffcc33');
            p.car.speed *= 0.45; c.speed *= 0.4;
            if (Math.abs(p.car.speed) > 200) this.police.addHeat(1, 'reckless driving — crash');
          } else { p.car.speed *= 0.7; c.speed = 0; }
        }
      }
    }
    // Health regen slowly when calm
    if (this.wanted === 0 && p.health < 100) p.health = Math.min(100, p.health + dt * 1.5);
    this.updateCamera(dt);
    this.audio.setEngine(p.car ? Math.abs(p.car.speed) / 340 : 0, !!p.car);
  }
  updateDriving(dt) {
    const p = this.player, c = p.car, inp = this.input;
    const ax = inp.axis();
    const forward = ax.y < 0 ? 1 : ax.y > 0 ? -0.55 : 0;
    const accel = forward > 0 ? 260 : 170;
    c.speed += forward * accel * dt;
    if (inp.down(' ')) { // handbrake
      c.speed *= Math.max(0, 1 - 2.2 * dt);
      if (Math.abs(c.speed) > 140 && Math.random() < dt * 20) {
        this.skids.push({ x1: c.x, y1: c.y, x2: c.x + Math.cos(c.angle) * 10, y2: c.y + Math.sin(c.angle) * 10, life: 6 });
        this.spawnParticles(c.x, c.y, 2, '#aaaaaa');
      }
    }
    // drag + rolling resistance
    c.speed -= c.speed * 0.35 * dt;
    if (Math.abs(c.speed) < 4 && forward === 0) c.speed = 0;
    c.speed = clamp(c.speed, -120, 340);
    const steer = ax.x * clamp(Math.abs(c.speed) / 120, 0, 1) * (c.speed >= 0 ? 1 : -1);
    c.angle += steer * 2.1 * dt;
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (this.world.hitsBuilding(nx, ny, 20)) {
      c.speed *= 0.4;
      this.shake = Math.max(this.shake, 5);
      if (Math.abs(c.speed) > 100) this.audio.crash();
      const fixed = this.world.collide(nx, ny, 20);
      c.x = fixed.x; c.y = fixed.y;
    } else {
      c.x = nx; c.y = ny;
    }
    if (this.world.inSea(c.x, c.y)) { c.x -= Math.cos(c.angle) * c.speed * dt; c.y -= Math.sin(c.angle) * c.speed * dt; c.speed = 0; this.addMessage('The sea is not a road, Jax.'); }
    c.x = clamp(c.x, 20, WORLD_W - 20); c.y = clamp(c.y, 20, WORLD_H - 20);
    p.x = c.x; p.y = c.y; p.angle = c.angle;
    // Speeding through a crowd raises heat slowly
    if (Math.abs(c.speed) > 280 && this.world.onRoad(c.x, c.y)) {
      if (Math.random() < dt * 0.15) this.police.addHeat(1, 'speeding through downtown');
    }
  }
  updateOnFoot(dt) {
    const p = this.player, inp = this.input;
    const ax = inp.axis();
    const run = inp.down('shift');
    const speed = run ? 240 : 130;
    const len = Math.hypot(ax.x, ax.y);
    if (len > 0) {
      const nx = p.x + (ax.x / len) * speed * dt;
      const ny = p.y + (ax.y / len) * speed * dt;
      p.angle = Math.atan2(ax.y, ax.x);
      p.speed = speed;
      const fixed = this.world.collide(nx, ny, 12);
      if (this.world.inSea(fixed.x, fixed.y)) { p.x = clamp(fixed.x, 20, WORLD_W - 20); p.y = Math.min(fixed.y, 2430); }
      else { p.x = fixed.x; p.y = fixed.y; }
    } else p.speed = 0;
    // Aim follows the mouse
    const wx = this.camera.x + inp.mouseX, wy = this.camera.y + inp.mouseY;
    if (p.hasGun && (inp.mouseDown || Math.hypot(wx - p.x, wy - p.y) > 60)) p.aimAngle = Math.atan2(wy - p.y, wx - p.x);
  }
  render() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (this.state === 'title') {
      // Animated backdrop: the city at dusk behind the title
      this.camera.x = clamp(1200 - W / 2, 0, WORLD_W - W);
      this.camera.y = clamp(900 - H / 2, 0, WORLD_H - H);
      ctx.save(); ctx.translate(-this.camera.x, -this.camera.y);
      drawWorld(ctx, this, this.camera);
      for (const c of this.traffic.cars.slice(0, 14)) drawCar(ctx, c, false);
      for (const p of this.traffic.peds.slice(0, 20)) drawPed(ctx, p);
      ctx.restore();
      drawMenu(ctx, this, W, H, 'title');
      return;
    }
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    const cam = { x: this.camera.x, y: this.camera.y, w: W, h: H };
    drawWorld(ctx, this, cam);
    drawSkids(ctx, this.skids);
    // Mission markers + pickups
    const tgt = this.missions.objectiveTarget();
    if (tgt && this.state === 'play') drawMarker(ctx, tgt.x, tgt.y, '#ffd94d', null, this.time);
    if (this.missions.client) drawMarker(ctx, this.missions.client.x, this.missions.client.y, '#7CFC98', 'CLIENT', this.time);
    if (this.missions.taxi && this.missions.taxi.state === 'pickup') drawMarker(ctx, this.missions.taxi.ped.x, this.missions.taxi.ped.y, '#7CFC98', '$', this.time);
    for (const pk of this.combat.pickups) {
      if (pk.taken) continue;
      ctx.fillStyle = pk.kind === 'pistol' ? '#ffd94d' : '#4caf50';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 12 + Math.sin(this.time * 3) * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(pk.kind === 'pistol' ? 'GUN' : '+', pk.x, pk.y + 4);
    }
    // Cars
    for (const c of this.traffic.cars) drawCar(ctx, c, c === this.player.car);
    for (const c of this.police.cars) drawCar(ctx, c, false);
    // Peds + officers
    for (const p of this.traffic.peds) drawPed(ctx, p);
    for (const o of this.police.officers) {
      ctx.save(); ctx.translate(o.x, o.y);
      ctx.fillStyle = '#1c2733'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(0, -2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a7bff'; ctx.fillRect(-9, 2, 18, 3);
      ctx.restore();
    }
    // Bullets
    ctx.fillStyle = '#ffe14d';
    for (const b of this.combat.bullets) { ctx.fillRect(b.x - 3, b.y - 1, 6, 2); }
    // Player on foot
    if (!this.player.car) {
      const p = this.player;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 5, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 4, Math.sin(p.angle) * 4 - 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(-8, 6, 5, 8); ctx.fillRect(3, 6, 5, 8);
      if (p.hasGun) {
        ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
        const a = p.aimAngle !== undefined ? p.aimAngle : p.angle;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.stroke();
      }
      ctx.restore();
      // aim reticle
      if (p.hasGun) {
        const wx = this.camera.x + this.input.mouseX, wy = this.camera.y + this.input.mouseY;
        ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(wx, wy, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx - 13, wy); ctx.lineTo(wx + 13, wy); ctx.moveTo(wx, wy - 13); ctx.lineTo(wx, wy + 13); ctx.stroke();
      }
    }
    drawParticles(ctx, this.particles);
    // Headlight cones at night
    if (this.clock < 6 || this.clock >= 19) {
      for (const c of [...this.traffic.cars, ...this.police.cars]) {
        if (Math.abs(c.speed) < 5) continue;
        const gx = c.x + Math.cos(c.angle) * 90, gy = c.y + Math.sin(c.angle) * 90;
        const grad = ctx.createRadialGradient(gx, gy, 10, gx, gy, 130);
        grad.addColorStop(0, 'rgba(255,248,190,0.20)'); grad.addColorStop(1, 'rgba(255,248,190,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(gx, gy, 130, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    // Day / dusk / night lighting overlay
    let night = 0;
    if (this.clock >= 19 || this.clock < 6) night = 0.42;
    else if (this.clock >= 17.5) night = 0.22;
    else if (this.clock < 7) night = 0.18;
    if (night > 0) {
      ctx.fillStyle = this.clock >= 17.5 && this.clock < 20 ? `rgba(40,20,80,${night})` : `rgba(8,12,40,${night})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawHUD(ctx, this, W, H);
    if (this.missionListOpen) {
      ctx.fillStyle = 'rgba(8,14,24,0.9)';
      const bw = 420, bh = 220;
      ctx.fillRect(W / 2 - bw / 2, H / 2 - bh / 2, bw, bh);
      ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - bw / 2, H / 2 - bh / 2, bw, bh);
      ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('MAMA ROSA — JOB LIST', W / 2, H / 2 - bh / 2 + 32);
      ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif'; ctx.textAlign = 'left';
      ['1. First Fare — drive a client across town ($250)', '2. Hot Wheels — steal the red coupe ($400)', '3. Heat — survive and lose 3 stars ($500)', '4. The Drop — deliver the package ($1,000)'].forEach((t, i) => {
        ctx.fillStyle = i < this.missions.index ? '#7CFC98' : (i === this.missions.index ? '#ffd94d' : '#aaa');
        ctx.fillText((i < this.missions.index ? '✓ ' : i === this.missions.index ? '► ' : '· ') + t, W / 2 - bw / 2 + 20, H / 2 - bh / 2 + 66 + i * 26);
      });
      ctx.fillStyle = '#ddd'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('[ M ] close — press [ R ] in pause to restart the current mission', W / 2, H / 2 + bh / 2 - 16);
    }
    if (this.state === 'pause') drawMenu(ctx, this, W, H, 'pause');
    if (this.state === 'busted') drawMenu(ctx, this, W, H, 'busted');
    if (this.state === 'wasted') drawMenu(ctx, this, W, H, 'wasted');
  }
  // Headless verification: simulate play, then report in the document title.
  selfTest() {
    const log = [];
    try {
      this.newGame();
      log.push('newGame');
      // Get in the starter car first, then drive: hold W for 300 ticks, steer a little
      this.input.pressed['e'] = true;
      this.update(1 / 60);
      this.input.endFrame();
      log.push('enteredCar=' + !!this.player.car);
      this.input.keys['w'] = true;
      for (let i = 0; i < 300; i++) {
        if (i === 120) this.input.keys['a'] = true;
        if (i === 200) { this.input.keys['a'] = false; this.input.keys['d'] = true; }
        this.update(1 / 60);
        this.input.endFrame();
      }
      this.input.keys = {};
      log.push('drove px=' + Math.round(this.player.x) + ' py=' + Math.round(this.player.y) + ' inCar=' + !!this.player.car);
      // Raise wanted, start a mission, spawn police
      this.police.addHeat(3, 'selftest');
      this.missions.startMission(0);
      for (let i = 0; i < 300; i++) { this.update(1 / 60); this.input.endFrame(); }
      log.push('wanted=' + this.wanted + ' police=' + this.police.cars.length + ' mission=' + this.missions.name + ' traffic=' + this.traffic.cars.length + ' peds=' + this.traffic.peds.filter((p) => !p.dead).length);
      this.render();
      log.push('rendered');
      document.title = 'SELFTEST OK ' + log.join(' | ');
    } catch (err) {
      document.title = 'SELFTEST FAIL ' + err.message;
    }
  }
}

const game = new Game();
window.__solmara = game;

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, 1 / 60);
  const inp = game.input;
  if (game.state === 'title') {
    if (inp.wasPressed('enter')) game.newGame();
    else if (inp.wasPressed('c') && game.hasSave) game.continueGame();
    game.render();
  } else if (game.state === 'play') {
    game.update(dt);
    game.render();
  } else if (game.state === 'pause') {
    if (inp.wasPressed('escape') || inp.wasPressed('enter')) { game.state = 'play'; }
    else if (inp.wasPressed('r')) {
      game.missions.stage = 'idle'; game.missions.startMission(game.missions.index);
      game.state = 'play';
    } else if (inp.wasPressed('s')) { game.saveGame(); game.addMessage('Game saved.'); }
    else if (inp.wasPressed('q')) { game.state = 'title'; game.hasSave = hasSave(); }
    game.render();
  } else if (game.state === 'busted' || game.state === 'wasted') {
    if (inp.wasPressed('enter')) {
      game.player.health = 100;
      game.player.x = 700; game.player.y = 1650; game.player.car = null;
      game.state = 'play';
      game.addMessage(game.state === 'play' ? 'Back on the street. Stay out of trouble.' : '');
    }
    game.render();
  }
  inp.endFrame();
}

if (params.get('selftest') === '1') {
  game.selfTest();
} else {
  const shot = params.get('shot');
  if (shot) {
    // Staged shot: render the exact staged frame once and freeze it, so the
    // screenshot is deterministic and the player/police stay where staged.
    try { stageShot(game, shot, seed); } catch (e) { document.title = 'SHOT FAIL ' + e.message; }
    game.render();
    requestAnimationFrame(() => game.render());
    // Frozen staged frame: do not start the live loop.
  } else {
    requestAnimationFrame(loop);
  }
}
