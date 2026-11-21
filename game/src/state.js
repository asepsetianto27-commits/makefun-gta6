// Solmara Nights — the single game state object every system reads and writes.
// One clear job: hold all mutable state in one place so systems stay decoupled.
import { mulberry32 } from './util.js';
import { PLAYER_START, PISTOL_PICKUP } from './config.js';

export function createState(seed) {
  const rng = mulberry32(seed);
  return {
    seed,
    rng,
    mode: 'menu', // menu | play | pause | busted | wasted | done | missiondone
    time: 0, // seconds since boot
    clock: 17.2, // game clock in hours; starts late afternoon, drifts to night
    cash: 120,
    health: 100,
    wanted: 0,
    wantedQuiet: 0, // seconds with no crime and no police nearby
    reputation: 0,
    missionIndex: 0, // 0..3 story missions, 4 = finished
    mission: null, // active mission runtime state
    missionTimer: 0,
    taxi: null, // active taxi fare runtime state
    taxiCooldown: 4,
    player: {
      x: PLAYER_START.x, y: PLAYER_START.y, angle: -Math.PI / 2,
      speed: 0, onFoot: true, car: null, hasPistol: false,
      punchCooldown: 0, shootCooldown: 0, invuln: 0,
    },
    pistolPickup: { x: PISTOL_PICKUP.x, y: PISTOL_PICKUP.y, taken: false },
    packageTaken: false,
    cars: [],
    peds: [],
    police: [],
    bullets: [],
    particles: [],
    skids: [],
    floaters: [], // floating score/cash texts
    camera: { x: PLAYER_START.x, y: PLAYER_START.y },
    shake: 0,
    stats: { earned: 0, carsStolen: 0, faresDone: 0, shotsFired: 0 },
    message: '',
    messageTimer: 0,
    dialogue: [],
    dialogueTimer: 0,
    endStats: null,
    saveExists: false,
  };
}

export function showMessage(S, text, seconds) {
  S.message = text;
  S.messageTimer = seconds || 3;
}

export function showDialogue(S, lines, seconds) {
  S.dialogue = lines;
  S.dialogueTimer = seconds || 5;
}

export function addFloater(S, x, y, text, color) {
  S.floaters.push({ x, y, text, color: color || '#ffffff', life: 1.4 });
}

export function spawnParticles(S, x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = S.rng() * Math.PI * 2;
    const sp = (speed || 120) * (0.4 + S.rng() * 0.8);
    S.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + S.rng() * 0.5, maxLife: 1, color, size: 2 + S.rng() * 3,
    });
  }
}

export function updateParticles(S, dt) {
  for (const p of S.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  S.particles = S.particles.filter((p) => p.life > 0);
  for (const f of S.floaters) {
    f.y -= 28 * dt;
    f.life -= dt;
  }
  S.floaters = S.floaters.filter((f) => f.life > 0);
  if (S.skids.length > 600) S.skids.splice(0, S.skids.length - 600);
}
