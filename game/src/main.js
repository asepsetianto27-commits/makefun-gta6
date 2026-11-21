// Solmara Nights — entry point: boot, game loop, driving, menus, self-test.
// One clear job: wire every system together and own the frame.
import { WORLD_W, WORLD_H, PLAYER_START } from './config.js';
import { clamp, dist, angleTo } from './util.js';
import { buildWorld, collideWorld } from './world.js';
import { createState, showMessage, showDialogue, spawnParticles, updateParticles } from './state.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { spawnTraffic, spawnPeds, makeCar, updateTraffic, updatePeds, nearestEnterableCar, enterCar, exitCar } from './traffic.js';
import { updateWanted, updatePolice, addWanted } from './police.js';
import { updateCombat, checkPedCollisions } from './combat.js';
import { startMission, updateMissions, updateTaxi, missionObjective } from './missions.js';
import { saveGame, loadSave, applySave, hasSave } from './save.js';
import { drawHUD } from './hud.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed')) || 20261121;
const shotParam = params.get('shot');
const selftestParam = params.get('selftest') === '1';

const S = createState(seedParam);
S.world = buildWorld(seedParam);
S.saveExists = hasSave();
const input = createInput(canvas);
const audio = createAudio();

window.addEventListener('pointerdown', () => audio.init(), { once: true });
window.addEventListener('keydown', () => audio.init(), { once: true });

function resetStory() {
  const fresh = createState(seedParam);
  fresh.world = S.world;
  Object.keys(S).forEach((k) => { S[k] = fresh[k]; });
  S.world = fresh.world;
  S.saveExists = hasSave();
  S.mode = 'menu';
  spawnTraffic(S, 12);
  spawnPeds(S, 20);
}

function startNewGame() {
  S.mode = 'play';
  S.player.x = PLAYER_START.x;
  S.player.y = PLAYER_START.y;
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
  showDialogue(S, ['MAMA ROSA: Jax. Four jobs, then your debt is gone. First fare — press M to start it.'], 6);
  showMessage(S, 'Welcome to Solmara. Press M to start Mission 1.', 4);
}

function startContinue() {
  const data = loadSave();
  if (data && applySave(S, data)) {
    S.mode = 'play';
    showMessage(S, 'Welcome back, Jax. Mission ' + (S.missionIndex + 1) + ' is waiting.', 4);
  } else {
    startNewGame();
  }
}

function driveCar(S, dt) {
  const car = S.player.car;
  if (!car) return;
  const maxSpeed = car.type === 'sport' ? 420 : car.type === 'truck' ? 260 : 340;
  let accel = 0;
  if (input.up) accel = 300;
  if (input.down) accel = car.speed > 10 ? -460 : -150;
  car.speed += accel * dt;
  car.speed *= (1 - 0.22 * dt);
  if (input.handbrake) {
    car.speed *= (1 - 2.4 * dt);
    if (Math.abs(car.speed) > 90) {
      const bx = car.x - Math.cos(car.angle) * 16;
      const by = car.y - Math.sin(car.angle) * 16;
      S.skids.push({ x1: bx, y1: by, x2: bx - Math.cos(car.angle) * car.speed * dt, y2: by - Math.sin(car.angle) * car.speed * dt });
      if (S.rng() < 0.5) spawnParticles(S, bx, by, 1, '#bbbbbb', 40);
    }
  }
  car.speed = clamp(car.speed, -150, maxSpeed);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const grip = clamp(Math.abs(car.speed) / 160, 0, 1);
  car.angle += steer * 2.5 * grip * (car.speed < 0 ? -1 : 1) * dt;
  const prevX = car.x;
  const prevY = car.y;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const hit = collideWorld(car, 18, S.world);
  if (hit === 'building') {
    const impact = Math.abs(car.speed);
    if (impact > 130) {
      car.hp -= 12;
      S.shake = Math.max(S.shake, 6);
      spawnParticles(S, car.x, car.y, 12, '#ffb347', 160);
      if (audio.enabled) audio.crash();
      showMessage(S, 'You crashed! Car damage rising.', 2);
    }
    car.speed *= 0.35;
  }
  // Car-to-car bumps.
  for (const other of S.cars) {
    if (other === car) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d < 40 && d > 0.01) {
      const push = (40 - d) / 2;
      const a = angleTo(other.x, other.y, car.x, car.y);
      car.x += Math.cos(a) * push;
      car.y += Math.sin(a) * push;
      other.x -= Math.cos(a) * push;
      other.y -= Math.sin(a) * push;
      if (Math.abs(car.speed) > 60 || Math.abs(other.speed) > 60) {
        S.shake = Math.max(S.shake, 4);
        spawnParticles(S, (car.x + other.x) / 2, (car.y + other.y) / 2, 6, '#ffb347', 120);
        if (audio.enabled) audio.crash();
        car.hp -= 4;
        other.hp -= 4;
        const tmp = car.speed;
        car.speed = other.speed * 0.5;
        other.speed = tmp * 0.5;
      }
    }
  }
  if (car.hp <= 0 && car.driver === 'player') {
    spawnParticles(S, car.x, car.y, 30, '#ff7b2f', 240);
    showMessage(S, 'Your car is wrecked! Get out and find another.', 3);
    exitCar(S);
  }
  S.player.x = car.x;
  S.player.y = car.y;
  S.player.angle = car.angle;
}

function walkPlayer(S, dt) {
  const p = S.player;
  const run = input.run;
  const sp = run ? 245 : 150;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    p.x += mx * sp * dt;
    p.y += my * sp * dt;
    if (!(p.hasPistol && input.mouseDown)) p.angle = Math.atan2(my, mx);
  }
  if (p.hasPistol && input.mouseDown) {
    const wx = S.camera.x - 640 + input.mouseX;
    const wy = S.camera.y - 360 + input.mouseY;
    p.angle = angleTo(p.x, p.y, wx, wy);
  }
  collideWorld(p, 10, S.world);
}

function updateCamera(S, dt) {
  const k = 1 - Math.exp(-5 * dt);
  S.camera.x += (S.player.x - S.camera.x) * k;
  S.camera.y += (S.player.y - S.camera.y) * k;
  S.camera.x = clamp(S.camera.x, 640, WORLD_W - 640);
  S.camera.y = clamp(S.camera.y, 360, WORLD_H - 360);
}

function tick(dt) {
  S.time += dt;
  S.clock += dt * 0.02;
  if (S.clock >= 24) S.clock -= 24;
  S.shake = Math.max(0, S.shake - dt * 22);
  if (S.messageTimer > 0) S.messageTimer -= dt;
  if (S.dialogueTimer > 0) S.dialogueTimer -= dt;

  if (S.mode === 'menu') {
    if (input.consume('enter')) {
      if (S.saveExists) startContinue();
      else startNewGame();
    }
    if (input.consume('n')) startNewGame();
    return;
  }
  if (S.mode === 'pause') {
    if (input.consume('escape') || input.consume('enter')) S.mode = 'play';
    return;
  }
  if (S.mode === 'busted' || S.mode === 'wasted') {
    if (input.consume('enter')) {
      S.mode = 'play';
      S.health = 100;
      S.wanted = 0;
      S.police = [];
      S.player.invuln = 2;
      showMessage(S, 'Back on the streets. Lay low for a while.', 3);
    }
    if (input.consume('r')) resetStory();
    return;
  }
  if (S.mode === 'missiondone') {
    if (input.consume('enter') || input.consume('escape')) S.mode = 'play';
    return;
  }
  if (S.mode === 'done') {
    if (input.consume('enter')) S.mode = 'play';
    if (input.consume('r')) resetStory();
    return;
  }
  if (S.mode !== 'play') return;

  // --- playing ---
  if (input.consume('escape')) { S.mode = 'pause'; return; }
  if (input.consume('q')) {
    if (saveGame(S)) showMessage(S, 'Game saved.', 2);
  }
  if (input.consume('m')) {
    if (!S.mission) {
      if (S.missionIndex < 4) startMission(S, S.missionIndex, audio);
      else showDialogue(S, ['MAMA ROSA: The debt is paid, Jax. Solmara is yours now.'], 4);
    } else {
      showDialogue(S, ['Current job: ' + S.mission.def.title + ' — ' + missionObjective(S)], 4);
    }
  }
  if (input.consume('e')) {
    if (S.player.car) exitCar(S);
    else {
      const car = nearestEnterableCar(S, 75);
      if (car) {
        enterCar(S, car);
        if (audio.enabled) audio.blip(440, 0.08, 'square', 0.1);
      }
    }
  }

  // Pistol pickup at the spawn corner.
  if (!S.pistolPickup.taken && S.player.onFoot && dist(S.player.x, S.player.y, S.pistolPickup.x, S.pistolPickup.y) < 40) {
    S.pistolPickup.taken = true;
    S.player.hasPistol = true;
    showMessage(S, 'Pistol picked up! Mouse aim + click to shoot.', 3.5);
    if (audio.enabled) audio.pickup();
  }

  if (S.player.car) driveCar(S, dt);
  else walkPlayer(S, dt);

  checkPedCollisions(S);
  updateTraffic(S, dt);
  updatePeds(S, dt);
  updateWanted(S, dt);
  updatePolice(S, dt);
  updateCombat(S, dt, input, audio);
  updateMissions(S, dt, audio);
  updateTaxi(S, dt, audio);
  updateParticles(S, dt);

  // Slow health recovery when the heat is off.
  if (S.wanted === 0 && S.health < 100) S.health = Math.min(100, S.health + 2 * dt);

  updateCamera(S, dt);
  if (audio.enabled) {
    audio.setEngine(S.player.car ? Math.abs(S.player.car.speed) / 420 : 0, !!S.player.car);
    audio.setSiren(S.wanted > 0);
  }
  input.clearPressed();
}

function frame(now) {
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
  frame.last = now;
  tick(dt);
  render(S, ctx);
  if (S.mode === 'play' || S.mode === 'pause' || S.mode === 'missiondone') drawHUD(S, ctx);
  requestAnimationFrame(frame);
}

function runSelfTest() {
  const log = [];
  try {
    S.mode = 'play';
    spawnTraffic(S, 10);
    spawnPeds(S, 12);
    const car = makeCar(S, S.player.x + 50, S.player.y, 0, { color: '#d21f2b', type: 'sport', driver: 'parked' });
    enterCar(S, car);
    log.push('car-entered');
    input.up = true;
    for (let i = 0; i < 600; i++) tick(1 / 60);
    input.up = false;
    log.push('ticks=600');
    log.push('player-x=' + Math.round(S.player.x) + ' speed=' + Math.round(S.player.car ? S.player.car.speed : 0));
    addWanted(S, 2);
    for (let i = 0; i < 120; i++) tick(1 / 60);
    log.push('wanted=' + S.wanted + ' police=' + S.police.length);
    startMission(S, 0, null);
    log.push('mission=' + (S.mission ? S.mission.def.title : 'none'));
    S.player.hasPistol = true;
    S.bullets.push({ x: S.player.x, y: S.player.y, vx: 600, vy: 0, life: 0.5, from: 'player' });
    for (let i = 0; i < 30; i++) tick(1 / 60);
    log.push('bullets-ok cars=' + S.cars.length + ' peds=' + S.peds.length);
    render(S, ctx);
    drawHUD(S, ctx);
    document.title = 'SELFTEST OK ' + log.join(' | ');
  } catch (err) {
    document.title = 'SELFTEST FAIL ' + (err && err.message ? err.message : err);
  }
}

// --- boot ---
if (shotParam) {
  applyShot(S, shotParam, seedParam);
  spawnTraffic(S, 0);
  // Let the world settle for a couple of simulated seconds so police and
  // traffic are visibly in place when the screenshot is taken. Keep the
  // throttle open while the player is in a car so the shot shows motion.
  for (let i = 0; i < 120; i++) {
    if (S.player.car) input.up = true;
    tick(1 / 60);
  }
  input.up = false;
  render(S, ctx);
  drawHUD(S, ctx);
  requestAnimationFrame(frame);
} else if (selftestParam) {
  runSelfTest();
  requestAnimationFrame(frame);
} else {
  spawnTraffic(S, 12);
  spawnPeds(S, 20);
  render(S, ctx);
  requestAnimationFrame(frame);
}
