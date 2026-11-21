// Canvas rendering: city, beach, cars, people, particles, lighting.
import { WORLD_W, WORLD_H, ROADS_X, ROADS_Y, ROAD_W, COLORS, BEACH_Y, SEA_Y, clamp } from './config.js';

export function drawWorld(ctx, g, cam) {
  const { world } = g;
  const x0 = cam.x - 40, y0 = cam.y - 40, x1 = cam.x + cam.w + 40, y1 = cam.y + cam.h + 40;
  // Ground
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Beach + sea
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(x0, Math.max(y0, BEACH_Y), x1 - x0, Math.min(y1, SEA_Y) - Math.max(y0, BEACH_Y));
  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(x0, Math.max(y0, SEA_Y), x1 - x0, y1 - Math.max(y0, SEA_Y));
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, SEA_Y + 4); ctx.lineTo(x1, SEA_Y + 4); ctx.stroke();
  // Parks
  for (const p of world.parks) {
    if (p.x > x1 || p.x + p.w < x0 || p.y > y1 || p.y + p.h < y0) continue;
    ctx.fillStyle = p.plaza ? COLORS.plaza : COLORS.park;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    if (p.plaza) {
      ctx.fillStyle = '#7fb3d5';
      ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 34, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Roads
  ctx.fillStyle = COLORS.road;
  for (const rx of ROADS_X) if (rx > x0 - 60 && rx < x1 + 60) ctx.fillRect(rx - ROAD_W / 2, y0, ROAD_W, y1 - y0);
  for (const ry of ROADS_Y) if (ry > y0 - 60 && ry < y1 + 60) ctx.fillRect(x0, ry - ROAD_W / 2, x1 - x0, ROAD_W);
  // Sidewalks
  ctx.fillStyle = COLORS.sidewalk;
  for (const rx of ROADS_X) {
    if (rx < x0 - 70 || rx > x1 + 70) continue;
    ctx.fillRect(rx - ROAD_W / 2 - 12, y0, 12, y1 - y0);
    ctx.fillRect(rx + ROAD_W / 2, y0, 12, y1 - y0);
  }
  for (const ry of ROADS_Y) {
    if (ry < y0 - 70 || ry > y1 + 70) continue;
    ctx.fillRect(x0, ry - ROAD_W / 2 - 12, x1 - x0, 12);
    ctx.fillRect(x0, ry + ROAD_W / 2, x1 - x0, 12);
  }
  // Lane dashes
  ctx.strokeStyle = COLORS.roadLine; ctx.lineWidth = 3; ctx.setLineDash([22, 26]);
  for (const rx of ROADS_X) {
    if (rx < x0 - 60 || rx > x1 + 60) continue;
    ctx.beginPath(); ctx.moveTo(rx, y0); ctx.lineTo(rx, y1); ctx.stroke();
  }
  for (const ry of ROADS_Y) {
    if (ry < y0 - 60 || ry > y1 + 60) continue;
    ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x1, ry); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Buildings with fake 3D side + roof detail
  for (const b of world.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.hue;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    const cols = Math.max(1, Math.floor(b.w / 34)), rows = Math.max(1, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i + j) % 2 === 0) ctx.fillRect(b.x + 10 + i * 34, b.y + 10 + j * 34, 14, 10);
    }
    if (b.height >= 4) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('▲'.repeat(Math.min(3, b.height - 2)), b.x + 10, b.y + 18); }
  }
  // Trees
  for (const t of world.trees) {
    if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
    ctx.fillStyle = '#2d6a2d'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  // Road names
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 13px sans-serif';
  const names = ['Marina Ave', 'Palm Blvd', 'Coral St', 'Sunset Dr', 'Harbor Rd', 'Cactus Ln', 'Ocean View', 'Dockside Way'];
  ROADS_X.forEach((rx, i) => { if (rx > x0 && rx < x1) ctx.fillText(names[i % names.length], rx - 34, 2360); });
}

export function drawCar(ctx, c, isPlayer) {
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-c.len / 2 + 3, -c.wid / 2 + 3, c.len, c.wid);
  // body
  ctx.fillStyle = c.color;
  roundRect(ctx, -c.len / 2, -c.wid / 2, c.len, c.wid, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(ctx, -c.len / 2 + 4, -c.wid / 2 + 3, c.len - 8, 6, 3); ctx.fill();
  // cabin + windows
  ctx.fillStyle = c.police ? '#dfe6ee' : '#20242c';
  roundRect(ctx, -8, -c.wid / 2 + 4, 18, c.wid - 8, 4); ctx.fill();
  // wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(-c.len / 2 + 4, -c.wid / 2 - 3, 10, 5); ctx.fillRect(-c.len / 2 + 4, c.wid / 2 - 2, 10, 5);
  ctx.fillRect(c.len / 2 - 14, -c.wid / 2 - 3, 10, 5); ctx.fillRect(c.len / 2 - 14, c.wid / 2 - 2, 10, 5);
  // headlights
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(c.len / 2 - 2, -c.wid / 2 + 3, 3, 5); ctx.fillRect(c.len / 2 - 2, c.wid / 2 - 8, 3, 5);
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(-c.len / 2 - 1, -c.wid / 2 + 3, 3, 5); ctx.fillRect(-c.len / 2 - 1, c.wid / 2 - 8, 3, 5);
  if (c.police) {
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, -c.wid / 2 - 4);
    const flash = Math.floor(performance.now() / 260) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2222' : '#2244ff';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left';
  }
  if (isPlayer) {
    ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2;
    roundRect(ctx, -c.len / 2 - 4, -c.wid / 2 - 4, c.len + 8, c.wid + 8, 9); ctx.stroke();
  }
  ctx.restore();
}

export function drawPed(ctx, p) {
  if (p.inCar) return;
  if (p.dead) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(1.2);
    ctx.fillStyle = p.shirt; ctx.fillRect(-8, -4, 16, 8);
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(11, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(p.walkPhase) * 2;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.arc(0, bob * 0.4, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3 - 2, 5, 0, Math.PI * 2); ctx.fill();
  if (p.armed) { ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(14, 0); ctx.stroke(); }
  ctx.restore();
}

export function drawParticles(ctx, particles) {
  for (const pt of particles) {
    ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawSkids(ctx, skids) {
  ctx.strokeStyle = 'rgba(20,20,20,0.45)'; ctx.lineWidth = 4;
  for (const s of skids) {
    ctx.globalAlpha = clamp(s.life / 6, 0, 0.5);
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawMarker(ctx, x, y, color, label, pulse) {
  const r = 16 + Math.sin(pulse * 4) * 4;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x - 8, y - 18); ctx.lineTo(x + 8, y - 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  if (label) ctx.fillText(label, x, y - 42);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
