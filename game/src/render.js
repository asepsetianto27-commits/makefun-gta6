// Solmara Nights — rendering: the city, vehicles, people, effects, lighting, menus.
// One clear job: turn the state into pictures on the canvas.
import {
  WORLD_W, WORLD_H, ROAD_W, VERTICAL_ROADS, HORIZONTAL_ROADS,
  WATER_WEST, SAND_WEST, RIVER_EAST, COLORS, GAME_NAME, GAME_TAGLINE, MISSION_DEFS, ENDING_TEXT,
} from './config.js';
import { clamp, dist } from './util.js';
import { missionMarker } from './missions.js';

const VIEW_W = 1280;
const VIEW_H = 720;

export function daylightFactor(clock) {
  // 1.0 bright midday, 0.55 dusk, 0.35 night.
  const h = ((clock % 24) + 24) % 24;
  if (h >= 7 && h < 17) return 1.0;
  if (h >= 17 && h < 19) return 0.72;
  if (h >= 19 && h < 21) return 0.55;
  if (h >= 5 && h < 7) return 0.7;
  return 0.38;
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 4, car.w, car.h);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 10, -car.h / 2 + 4, car.w / 2 - 8, car.h - 8, 3);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(car.w / 2 - 3, -car.h / 2 + 3, 3, 5);
  ctx.fillRect(car.w / 2 - 3, car.h / 2 - 8, 3, 5);
  ctx.fillStyle = '#ff4d4d';
  ctx.fillRect(-car.w / 2, -car.h / 2 + 3, 3, 5);
  ctx.fillRect(-car.w / 2, car.h / 2 - 8, 3, 5);
  if (car.driver === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawPedShape(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.state === 'down') {
    ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.8;
  } else {
    ctx.rotate(ped.angle);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerShape(ctx, S) {
  const p = S.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(6, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(8, -4, 7, 3);
  ctx.fillRect(8, 1, 7, 3);
  if (p.hasPistol) {
    ctx.fillStyle = '#222';
    ctx.fillRect(10, -2, 9, 3);
  }
  ctx.restore();
  // Aim line when armed on foot.
  if (p.onFoot && p.hasPistol) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 90, p.y + Math.sin(p.angle) * 90);
    ctx.stroke();
    ctx.restore();
  }
}

export function render(S, ctx) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (S.mode === 'menu') { drawMenu(S, ctx); return; }
  if (S.mode === 'busted') { drawWorld(S, ctx); drawEndCard(ctx, 'BUSTED', 'The Solmara police took you in. Mama Rosa is not happy.', '#3d7dd9'); return; }
  if (S.mode === 'wasted') { drawWorld(S, ctx); drawEndCard(ctx, 'WASTED', 'Jax went down in the streets of Solmara.', '#e74c3c'); return; }
  if (S.mode === 'done') { drawWorld(S, ctx); drawEndCard(ctx, 'THE DEBT IS PAID', ENDING_TEXT.slice(1).join(' '), '#37d67a', true); return; }
  drawWorld(S, ctx);
  if (S.mode === 'pause') drawPause(ctx);
  if (S.mode === 'missiondone') drawMissionDone(S, ctx);
}

function drawWorld(S, ctx) {
  const cam = S.camera;
  const shakeX = S.shake > 0 ? (S.rng() - 0.5) * S.shake * 2 : 0;
  const shakeY = S.shake > 0 ? (S.rng() - 0.5) * S.shake * 2 : 0;
  const ox = cam.x - VIEW_W / 2 + shakeX;
  const oy = cam.y - VIEW_H / 2 + shakeY;
  ctx.save();
  ctx.translate(-ox, -oy);

  const world = S.world;
  const vx0 = ox - 60, vy0 = oy - 60, vx1 = ox + VIEW_W + 60, vy1 = oy + VIEW_H + 60;

  // Ground: grass, then sand and water on the west, river on the east.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(vx0, vy0, WATER_WEST - vx0 > 0 ? WATER_WEST - vx0 : 0, vy1 - vy0);
  ctx.fillRect(RIVER_EAST, vy0, vx1 - RIVER_EAST, vy1 - vy0);
  ctx.fillStyle = COLORS.waterDeep;
  ctx.fillRect(vx0, vy0, 60, vy1 - vy0);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(WATER_WEST, vy0, SAND_WEST - WATER_WEST, vy1 - vy0);
  // Beach umbrellas for the coastal postcard look.
  ctx.fillStyle = '#e74c3c';
  for (let y = 420; y < WORLD_H; y += 420) {
    ctx.beginPath(); ctx.arc(215, y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(213, y, 4, 22);
    ctx.fillStyle = '#e74c3c';
  }

  // Parks.
  for (const park of world.parks) {
    ctx.fillStyle = COLORS.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = '#4a7d3c';
    ctx.lineWidth = 3;
    ctx.strokeRect(park.x, park.y, park.w, park.h);
  }

  // Roads.
  ctx.fillStyle = COLORS.road;
  for (const rx of VERTICAL_ROADS) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of HORIZONTAL_ROADS) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Lane dashes.
  ctx.fillStyle = COLORS.lane;
  for (const rx of VERTICAL_ROADS) {
    for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(rx - 2, y, 4, 30);
  }
  for (const ry of HORIZONTAL_ROADS) {
    for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x, ry - 2, 30, 4);
  }
  // Sidewalks.
  ctx.strokeStyle = COLORS.sidewalk;
  ctx.lineWidth = 10;
  for (const rx of VERTICAL_ROADS) {
    ctx.beginPath(); ctx.moveTo(rx - ROAD_W / 2 - 5, 0); ctx.lineTo(rx - ROAD_W / 2 - 5, WORLD_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + ROAD_W / 2 + 5, 0); ctx.lineTo(rx + ROAD_W / 2 + 5, WORLD_H); ctx.stroke();
  }

  // Marina, garage and drop-off pads.
  ctx.fillStyle = '#8a6f4d';
  ctx.fillRect(world.marina.x, world.marina.y, world.marina.w, world.marina.h);
  ctx.fillStyle = '#4a5a6a';
  ctx.fillRect(world.garage.x, world.garage.y, world.garage.w, world.garage.h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('MARINA', world.marina.x + 40, world.marina.y + 50);
  ctx.fillText('GARAGE', world.garage.x + 45, world.garage.y + 55);

  // Trees.
  for (const t of world.trees) {
    if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
    ctx.fillStyle = '#2f6b2f';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f8a3f';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }

  // Buildings with roof detail and shadow.
  for (const b of world.buildings) {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 8, 16, 16);
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 10, b.y + b.h - 16, b.w - 20, 6);
    }
  }

  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,20,0.5)';
  ctx.lineWidth = 4;
  for (const s of S.skids) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // Mission marker: pulsing beacon + ground ring.
  const mk = missionMarker(S);
  if (mk) {
    const pulse = 1 + Math.sin(S.time * 4) * 0.15;
    ctx.save();
    ctx.translate(mk.x, mk.y);
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,211,77,0.25)';
    ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mk.label, 0, -44);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  if (S.taxi) {
    const t = S.taxi;
    const tx = t.stage === 'ride' ? t.tx : t.x;
    const ty = t.stage === 'ride' ? t.ty : t.y;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 8);
    ctx.strokeStyle = '#7dff8a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 24 + Math.sin(S.time * 4) * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Pistol pickup.
  if (!S.pistolPickup.taken) {
    ctx.save();
    ctx.translate(S.pistolPickup.x, S.pistolPickup.y);
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.arc(0, 0, 16 + Math.sin(S.time * 3) * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PISTOL', 0, 4);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Cars, peds, police officers, player, bullets, particles.
  for (const car of S.cars) drawCarShape(ctx, car);
  for (const ped of S.peds) drawPedShape(ctx, ped);
  for (const p of S.police) {
    if (p.kind === 'foot') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#20242e';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath(); ctx.arc(5, 0, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  if (!S.player.car) drawPlayerShape(ctx, S);
  for (const b of S.bullets) {
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  for (const pt of S.particles) {
    ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating texts.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of S.floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  // Night lighting: dark overlay + headlight cones.
  const light = daylightFactor(S.clock);
  if (light < 0.95) {
    ctx.fillStyle = 'rgba(8,12,34,' + (0.55 * (1 - light)).toFixed(2) + ')';
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    for (const car of S.cars) {
      if (car.driver !== 'player' && car.driver !== 'traffic' && car.driver !== 'police') continue;
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      const grad = ctx.createRadialGradient(30, 0, 10, 60, 0, 130);
      grad.addColorStop(0, 'rgba(255,240,180,0.35)');
      grad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(20, -8);
      ctx.lineTo(140, -42);
      ctx.lineTo(140, 42);
      ctx.lineTo(20, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawEndCard(ctx, title, sub, color, small) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,16,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = color;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, 300);
  ctx.fillStyle = '#ffffff';
  ctx.font = (small ? 17 : 20) + 'px system-ui, sans-serif';
  const words = sub.split(' ');
  let line = '';
  let y = 350;
  for (const w of words) {
    if ((line + ' ' + w).length > 80) {
      ctx.fillText(line, VIEW_W / 2, y);
      y += 28;
      line = w;
    } else line = line ? line + ' ' + w : w;
  }
  ctx.fillText(line, VIEW_W / 2, y);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText('Press ENTER to keep playing in free roam — or R to restart the story.', VIEW_W / 2, y + 60);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,16,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW_W / 2, 300);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Esc — resume   ·   M — mission list   ·   Q — save game   ·   R — restart story', VIEW_W / 2, 340);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawMissionDone(S, ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,16,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MISSION COMPLETE', VIEW_W / 2, 300);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(S.missionIndex < 4 ? 'Next: ' + MISSION_DEFS[S.missionIndex].title + ' — press M to start it.' : 'All missions done!', VIEW_W / 2, 340);
  ctx.fillText('Press ENTER to keep driving.', VIEW_W / 2, 372);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawMenu(S, ctx) {
  // A painted title backdrop: dusk sky gradient, sea, skyline, a parked car.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#ff9a5a');
  grad.addColorStop(0.55, '#c96f8a');
  grad.addColorStop(1, '#2b3a67');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(0, 520, VIEW_W, 200);
  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(0, 500, VIEW_W, 22);
  ctx.fillStyle = '#1c2438';
  for (let i = 0; i < 14; i++) {
    const bx = 40 + i * 92;
    const bh = 120 + ((i * 37) % 130);
    ctx.fillRect(bx, 500 - bh, 70, bh);
    ctx.fillStyle = '#ffd34d';
    for (let wnd = 0; wnd < 4; wnd++) {
      ctx.fillRect(bx + 10 + (wnd % 2) * 34, 500 - bh + 16 + Math.floor(wnd / 2) * 34, 12, 14);
    }
    ctx.fillStyle = '#1c2438';
  }
  // Hero car on the beach road.
  ctx.save();
  ctx.translate(920, 560);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#d21f2b';
  ctx.beginPath(); ctx.roundRect(-70, -22, 140, 44, 12); ctx.fill();
  ctx.fillStyle = 'rgba(20,30,40,0.9)';
  ctx.beginPath(); ctx.roundRect(-40, -16, 70, 32, 6); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(62, -14, 6, 10);
  ctx.fillRect(62, 4, 6, 10);
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(-40, 22, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(42, 22, 14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(8,10,16,0.45)';
  ctx.fillRect(0, 0, VIEW_W, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(GAME_NAME.toUpperCase(), VIEW_W / 2, 92);
  ctx.font = 'italic 20px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(GAME_TAGLINE, VIEW_W / 2, 128);

  ctx.fillStyle = 'rgba(8,10,16,0.72)';
  ctx.fillRect(240, 210, 800, 330);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.strokeRect(240, 210, 800, 330);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const lines = [
    'Jax Marlow owes fixer Mama Rosa a debt. Four jobs stand between him',
    'and freedom — across a living coastal city of traffic, cops and fares.',
    '',
    'WASD / arrows — move & drive      E — enter / exit car      Space — handbrake',
    'Shift — run      F — punch      Mouse aim + click — shoot (after the pistol pickup)',
    'M — mission list      Q — save      Esc — pause',
    '',
    S.saveExists ? 'ENTER — Continue your saved game      N — New game' : 'ENTER — New game',
    'Steal cars, lose the cops, run fares. Watch the minimap. Mind the stars.',
  ];
  let y = 250;
  for (const line of lines) {
    ctx.fillText(line, 270, y);
    y += 30;
  }
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(S.saveExists ? 'Press ENTER to continue — or N for a new game' : 'Press ENTER to start', VIEW_W / 2, 512);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText('An original game. No real city, no real gangster, no borrowed art — every pixel drawn by code.', VIEW_W / 2, 690);
  ctx.textAlign = 'left';
}
