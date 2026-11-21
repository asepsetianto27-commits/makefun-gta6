// Solmara Nights — HUD: health, cash, wanted stars, objective, clock, speed.
// One clear job: everything the player reads on screen, plus the live minimap.
import { WORLD_W, WORLD_H, MISSION_DEFS } from './config.js';
import { formatClock, formatMoney } from './util.js';
import { missionObjective, missionMarker } from './missions.js';

export function drawHUD(S, ctx) {
  const W = 1280;
  const H = 720;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left: health bar + cash + reputation.
  ctx.fillStyle = 'rgba(10,12,16,0.55)';
  ctx.fillRect(14, 12, 250, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('JAX MARLOW', 24, 34);
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 42, 180, 12);
  const hpFrac = Math.max(0, S.health) / 100;
  ctx.fillStyle = hpFrac > 0.5 ? '#37d67a' : hpFrac > 0.25 ? '#f5a623' : '#e74c3c';
  ctx.fillRect(24, 42, 180 * hpFrac, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(formatMoney(S.cash), 24, 70);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#ffd34d';
  ctx.fillText('REP ' + S.reputation, 120, 70);

  // Top-centre: wanted stars.
  ctx.fillStyle = 'rgba(10,12,16,0.55)';
  ctx.fillRect(W / 2 - 110, 12, 220, 40);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < S.wanted ? '#ffd34d' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W / 2 - 80 + i * 40, 41);
  }
  ctx.textAlign = 'left';
  if (S.wanted > 0) {
    ctx.fillStyle = '#ff8a8a';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WANTED — LOSE THE COPS', W / 2, 68);
    ctx.textAlign = 'left';
  }

  // Top-right: clock + speed (minimap sits below these).
  ctx.fillStyle = 'rgba(10,12,16,0.55)';
  ctx.fillRect(W - 264, 12, 250, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatClock(S.clock), W - 24, 38);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#9fd8ff';
  const speedKmh = S.player.car ? Math.abs(S.player.car.speed) * 0.9 : 0;
  ctx.fillText(S.player.car ? Math.round(speedKmh) + ' km/h' : 'ON FOOT', W - 24, 60);
  ctx.textAlign = 'left';

  // Bottom-left: mission objective + distance + timer.
  const obj = missionObjective(S);
  ctx.fillStyle = 'rgba(10,12,16,0.6)';
  ctx.fillRect(14, H - 78, 460, 64);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px system-ui, sans-serif';
  const missionLabel = S.mission
    ? 'MISSION ' + S.mission.def.id + ' — ' + S.mission.def.title
    : (S.missionIndex < 4 ? 'MISSION ' + (S.missionIndex + 1) + ' — ' + MISSION_DEFS[S.missionIndex].title + ' (press M to start)' : 'FREE ROAM');
  ctx.fillText(missionLabel, 24, H - 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(obj, 24, H - 34);
  const mk = missionMarker(S);
  let distText = '';
  if (mk) distText = Math.round(Math.hypot(mk.x - S.player.x, mk.y - S.player.y)) + ' m';
  if (S.mission) distText += '   ⏱ ' + Math.max(0, Math.ceil(S.missionTimer)) + 's';
  if (S.taxi && S.taxi.stage === 'ride') distText += '   TAXI ' + Math.round(Math.hypot(S.taxi.tx - S.player.x, S.taxi.ty - S.player.y)) + ' m';
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText(distText, 24, H - 18);

  // Bottom-centre: contextual message.
  if (S.messageTimer > 0 && S.message) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(S.message).width + 28;
    ctx.fillStyle = 'rgba(10,12,16,0.65)';
    ctx.fillRect(W / 2 - w / 2, H - 130, w, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(S.message, W / 2, H - 109);
    ctx.textAlign = 'left';
  }

  // Dialogue box.
  if (S.dialogueTimer > 0 && S.dialogue.length) {
    ctx.fillStyle = 'rgba(12,10,20,0.78)';
    ctx.fillRect(280, H - 210, 720, 66);
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 2;
    ctx.strokeRect(280, H - 210, 720, 66);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'italic 15px system-ui, sans-serif';
    ctx.fillText(S.dialogue[0], 296, H - 186);
    if (S.dialogue[1]) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(S.dialogue[1], 296, H - 162);
    }
  }

  drawMinimap(S, ctx, W - 264, 84, 250, 178);
  ctx.restore();
}

export function drawMinimap(S, ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(x, y, 150 * sx + 12, h); // west sea
  ctx.fillRect(x + 2980 * sx, y, w - 2980 * sx, h); // east river
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const rx of [340, 740, 1140, 1540, 1940, 2340, 2740]) {
    ctx.moveTo(x + rx * sx, y);
    ctx.lineTo(x + rx * sx, y + h);
  }
  for (const ry of [320, 720, 1120, 1520, 1920, 2220]) {
    ctx.moveTo(x, y + ry * sy);
    ctx.lineTo(x + w, y + ry * sy);
  }
  ctx.stroke();
  // Mission / taxi marker.
  const mk = missionMarker(S);
  if (mk) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(x + mk.x * sx, y + mk.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }
  if (S.taxi) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('$', x + S.taxi.x * sx - 4, y + (S.taxi.stage === 'ride' ? S.taxi.ty : S.taxi.y) * sy + 4);
  }
  // Police as red dots, traffic as pale dots.
  ctx.fillStyle = '#ff4d4d';
  for (const p of S.police) {
    ctx.beginPath();
    ctx.arc(x + p.x * sx, y + p.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const car of S.cars) {
    if (car.driver === 'traffic') {
      ctx.fillRect(x + car.x * sx - 1, y + car.y * sy - 1, 2, 2);
    }
  }
  // Player: white dot with a direction tick.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + S.player.x * sx, y + S.player.y * sy, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + S.player.x * sx, y + S.player.y * sy, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('SOLMARA', x + 6, y + h - 6);
  ctx.restore();
}
