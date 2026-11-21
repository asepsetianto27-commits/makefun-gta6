// HUD, minimap, menus and on-screen text for Solmara Nights.
import { WORLD_W, WORLD_H, clamp, dist } from './config.js';

export function drawMinimap(ctx, g, x, y, size) {
  const scale = size / WORLD_W;
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,24,0.82)';
  ctx.fillRect(x - 4, y - 4, size + 8, size * (WORLD_H / WORLD_W) + 8);
  ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, size + 8, size * (WORLD_H / WORLD_W) + 8);
  const h = size * (WORLD_H / WORLD_W);
  ctx.fillStyle = '#3f7d3a'; ctx.fillRect(x, y, size, h);
  ctx.fillStyle = '#2f7fb8'; ctx.fillRect(x, y + h * 0.94, size, h * 0.06);
  ctx.fillStyle = '#e8d29a'; ctx.fillRect(x, y + h * 0.85, size, h * 0.09);
  ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 2;
  // roads
  ctx.strokeStyle = '#555b66'; ctx.lineWidth = 2;
  for (const rx of g.world.constructor.ROADS_X || []) {}
  const roadsX = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
  const roadsY = [250, 600, 950, 1300, 1650, 2000];
  for (const rx of roadsX) { ctx.beginPath(); ctx.moveTo(x + rx * scale, y); ctx.lineTo(x + rx * scale, y + h); ctx.stroke(); }
  for (const ry of roadsY) { ctx.beginPath(); ctx.moveTo(x, y + ry * scale); ctx.lineTo(x + size, y + ry * scale); ctx.stroke(); }
  // mission marker
  const tgt = g.missions.objectiveTarget();
  if (tgt) {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(x + tgt.x * scale, y + tgt.y * scale, 5, 0, Math.PI * 2); ctx.fill();
  }
  // police
  ctx.fillStyle = '#3a7bff';
  for (const c of g.police.cars) { ctx.beginPath(); ctx.arc(x + c.x * scale, y + c.y * scale, 3, 0, Math.PI * 2); ctx.fill(); }
  // traffic cars
  ctx.fillStyle = '#dddddd';
  for (const c of g.traffic.cars) {
    if (c.police || Math.abs(c.x - g.player.x) > 900) continue;
    ctx.fillRect(x + c.x * scale - 1, y + c.y * scale - 1, 2, 2);
  }
  // player arrow
  ctx.save();
  ctx.translate(x + g.player.x * scale, y + g.player.y * scale);
  ctx.rotate(g.player.car ? g.player.car.angle : g.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawHUD(ctx, g, W, H) {
  const p = g.player;
  ctx.save();
  // Top-left: cash + health
  ctx.fillStyle = 'rgba(8,14,24,0.72)'; roundRect(ctx, 12, 12, 210, 64, 8); ctx.fill();
  ctx.fillStyle = '#7CFC98'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('$' + p.cash.toLocaleString('en-US'), 24, 40);
  ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
  ctx.fillText('REP ' + g.reputation + '  •  Missions ' + g.missions.completed + '/4', 24, 60);
  // Health bar
  ctx.fillStyle = '#333'; ctx.fillRect(24, 66, 186, 8);
  ctx.fillStyle = p.health > 30 ? '#4caf50' : '#e74c3c';
  ctx.fillRect(24, 66, 186 * clamp(p.health / 100, 0, 1), 8);
  // Top-right: wanted stars + clock
  ctx.fillStyle = 'rgba(8,14,24,0.72)'; roundRect(ctx, W - 232, 12, 220, 64, 8); ctx.fill();
  ctx.font = '26px sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < g.wanted ? '#ffd94d' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W - 30 - i * 30, 42);
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif';
  const hh = Math.floor(g.clock) % 24, mm = Math.floor((g.clock % 1) * 60);
  ctx.fillText(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + '  •  ' + g.dayName(), W - 24, 66);
  // Speed (bottom-right, in car)
  if (p.car) {
    ctx.fillStyle = 'rgba(8,14,24,0.72)'; roundRect(ctx, W - 132, H - 92, 120, 60, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.55) + '', W - 24, H - 56);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#ccc';
    ctx.fillText('km/h', W - 24, H - 40);
  }
  // Objective (top-centre)
  const obj = g.missions.objectiveText();
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
  const tw = ctx.measureText(obj).width + 28;
  ctx.fillStyle = 'rgba(8,14,24,0.72)'; roundRect(ctx, W / 2 - tw / 2, 12, tw, 30, 8); ctx.fill();
  ctx.fillStyle = '#ffd94d'; ctx.fillText(obj, W / 2, 32);
  const tgt = g.missions.objectiveTarget();
  if (tgt) {
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    ctx.fillText(Math.round(dist(p.x, p.y, tgt.x, tgt.y)) + ' m', W / 2, 56);
  }
  if (g.missions.timerMax > 0 && g.missions.stage === 'active') {
    ctx.fillStyle = g.missions.timer < 15 ? '#ff5555' : '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(Math.ceil(g.missions.timer) + 's', W / 2, 78);
  }
  // Minimap (bottom-left)
  drawMinimap(ctx, g, 16, H - 176, 168);
  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('WASD drive / walk • E enter car • Space handbrake • F punch • Click shoot • M missions • Esc pause', 196, H - 14);
  // Dialogue
  if (g.missions.dialogue.length) {
    const line = g.missions.dialogue[0];
    ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
    const w = Math.min(W - 80, ctx.measureText(line).width + 30);
    ctx.fillStyle = 'rgba(8,14,24,0.85)'; roundRect(ctx, W / 2 - w / 2, H - 230, w, 34, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(line, W / 2, H - 208);
  }
  // Messages feed
  ctx.textAlign = 'left'; ctx.font = '14px sans-serif';
  g.messages.slice(-4).forEach((m, i) => {
    ctx.globalAlpha = clamp(m.life / 2, 0, 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(m.text, 196, H - 200 + i * 20);
  });
  ctx.globalAlpha = 1;
  // Gun indicator
  if (p.hasGun) {
    ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('PISTOL — click to shoot', W - 16, H - 110);
  }
  ctx.restore();
}

export function drawMenu(ctx, g, W, H, kind) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,22,0.78)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (kind === 'title') {
    ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 64px sans-serif';
    ctx.fillText('SOLMARA', W / 2, H / 2 - 150);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 64px sans-serif';
    ctx.fillText('NIGHTS', W / 2, H / 2 - 84);
    ctx.fillStyle = '#ff8c42'; ctx.font = 'italic 20px sans-serif';
    ctx.fillText('A sun-soaked open-world crime story — drive, steal, outrun, survive.', W / 2, H / 2 - 44);
    ctx.fillStyle = '#ddd'; ctx.font = '15px sans-serif';
    ctx.fillText('Jax Marlow owes fixer Mama Rosa $4,000. Four jobs stand between him and freedom.', W / 2, H / 2 - 8);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('WASD / arrows — move & drive      E — enter / exit car      Space — handbrake', W / 2, H / 2 + 34);
    ctx.fillText('Shift — run      F — punch      Mouse aim + click — shoot      M — missions      Esc — pause', W / 2, H / 2 + 60);
    ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(g.hasSave ? '[ ENTER ]  NEW GAME        [ C ]  CONTINUE' : '[ ENTER ]  START NEW GAME', W / 2, H / 2 + 108);
    ctx.fillStyle = '#aaa'; ctx.font = '13px sans-serif';
    ctx.fillText('Steal cars, take taxi fares, lose the police. Original city, story and art — no Rockstar content.', W / 2, H / 2 + 140);
  } else if (kind === 'pause') {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif';
    ctx.fillText('PAUSED', W / 2, H / 2 - 60);
    ctx.font = '17px sans-serif'; ctx.fillStyle = '#ddd';
    ctx.fillText('[ Esc ] resume      [ R ] restart mission      [ S ] save game      [ Q ] quit to title', W / 2, H / 2 - 10);
    ctx.fillText('Mission ' + (g.missions.index + 1) + ' of 4: ' + g.missions.name + '   •   Cash $' + g.player.cash, W / 2, H / 2 + 26);
  } else if (kind === 'busted') {
    ctx.fillStyle = '#3a7bff'; ctx.font = 'bold 56px sans-serif';
    ctx.fillText('BUSTED', W / 2, H / 2 - 40);
    ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif';
    ctx.fillText(g.endReason || 'The Solmara police caught you.', W / 2, H / 2 + 4);
    ctx.fillText('You paid $150 bail. Press ENTER to get back on the street.', W / 2, H / 2 + 34);
  } else if (kind === 'wasted') {
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 56px sans-serif';
    ctx.fillText('WASTED', W / 2, H / 2 - 40);
    ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif';
    ctx.fillText(g.endReason || 'Jax went down in the streets of Solmara.', W / 2, H / 2 + 4);
    ctx.fillText('Press ENTER to wake up at the hospital ($200 bill).', W / 2, H / 2 + 34);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
