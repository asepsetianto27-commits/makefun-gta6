// Solmara Nights — rendering: camera, city, cars, people, particles,
// skid marks, day/dusk/night lighting and car headlights. Plain Canvas 2D.

function spawnParticles(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = rr(0, Math.PI * 2), s = rr(30, 160);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rr(0.3, 0.8), max: 0.8, color, size: rr(2, 5) });
  }
}

function updateParticles(dt) {
  for (const p of G.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life -= dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const s of G.skids) s.life -= dt * 0.4;
  G.skids = G.skids.filter((s) => s.life > 0);
  if (G.skids.length > 400) G.skids.splice(0, G.skids.length - 400);
}

function addSkid(x, y, angle) {
  G.skids.push({ x, y, angle, life: 1 });
}

function screenShake(m) {
  G.shake = Math.min(14, G.shake + m);
}

// 0 = pitch dark, 1 = full daylight. Drives the lighting overlay.
function daylightFactor() {
  const h = (G.clockMin / 60) % 24;
  if (h >= 7 && h < 17) return 1;
  if (h >= 17 && h < 19) return lerp(1, 0.45, (h - 17) / 2);
  if (h >= 19 || h < 5.5) return 0.42;
  if (h >= 5.5 && h < 7) return lerp(0.42, 1, (h - 5.5) / 1.5);
  return 1;
}

function isNight() {
  return daylightFactor() < 0.6;
}

function render() {
  const c = G.ctx;
  const W = 1280, H = 720;
  c.save();
  c.clearRect(0, 0, W, H);
  // Camera follows the player, with shake and world clamping.
  G.shake = Math.max(0, G.shake - 0.6);
  const shx = G.shake > 0 ? rr(-G.shake, G.shake) : 0;
  const shy = G.shake > 0 ? rr(-G.shake, G.shake) : 0;
  const camX = clamp(G.player.x - W / 2 + shx, 0, Math.max(0, WORLD_W - W));
  const camY = clamp(G.player.y - H / 2 + shy, 0, Math.max(0, WORLD_H - H));
  G.camX = camX; G.camY = camY;
  c.translate(-camX, -camY);
  drawGround(c);
  drawRoads(c);
  drawParksAndTrees(c);
  drawBuildings(c);
  drawGarage(c);
  drawSkids(c);
  drawPickups(c);
  drawMissionBeacon(c);
  for (const car of G.cars) drawCarShape(c, car);
  // A green ring marks the player's car so it is always easy to spot.
  if (G.player.car) {
    c.save();
    c.strokeStyle = '#2ecc71';
    c.lineWidth = 3;
    c.beginPath(); c.arc(G.player.car.x, G.player.car.y, 34, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(46,204,113,0.4)';
    c.beginPath(); c.arc(G.player.car.x, G.player.car.y, 40, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  drawPeds(c);
  drawPlayer(c);
  if (!G.player.car) {
    c.save();
    c.strokeStyle = '#2ecc71';
    c.lineWidth = 3;
    c.beginPath(); c.arc(G.player.x, G.player.y, 20, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  drawBullets(c);
  drawParticles(c);
  drawHeadlights(c);
  c.restore();
  drawLighting(c);
  if (G.state === 'playing' || G.state === 'paused') drawHUD(c);
  if (G.state === 'menu') drawStartScreen(c);
  if (G.state === 'paused') drawPauseScreen(c);
  if (G.state === 'busted') drawBustedScreen(c);
  if (G.state === 'wasted') drawWastedScreen(c);
  if (G.state === 'missionComplete') drawMissionCompleteScreen(c);
  if (G.state === 'missionFailed') drawMissionFailedScreen(c);
  if (G.state === 'ending') drawEndingScreen(c);
  if (G.state === 'playing') drawDialogue(c);
}

function drawGround(c) {
  // Grass base.
  c.fillStyle = PALETTE.grass;
  c.fillRect(0, 0, WORLD_W, WORLD_H);
  // Sea and sand on the west edge.
  c.fillStyle = PALETTE.waterDeep;
  c.fillRect(0, 0, WATER_X, WORLD_H);
  c.fillStyle = PALETTE.water;
  c.fillRect(WATER_X, 0, 46, WORLD_H);
  c.fillStyle = PALETTE.sand;
  c.fillRect(WATER_X + 46, 0, BEACH_X - WATER_X - 46, WORLD_H);
  // Boardwalk line along the beach.
  c.fillStyle = '#b98d5f';
  c.fillRect(BEACH_X - 8, 0, 10, WORLD_H);
  // Pier.
  c.fillStyle = '#8a6a44';
  c.fillRect(60, G.world.pier.y - 16, 260, 32);
  c.fillStyle = '#a8815a';
  for (let x = 80; x < 320; x += 26) c.fillRect(x, G.world.pier.y - 16, 4, 32);
}

function drawRoads(c) {
  c.fillStyle = PALETTE.asphalt;
  for (const rx of ROAD_XS) c.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROAD_YS) c.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Sidewalks.
  c.fillStyle = PALETTE.sidewalk;
  for (const rx of ROAD_XS) {
    c.fillRect(rx - ROAD_W / 2 - 14, 0, 10, WORLD_H);
    c.fillRect(rx + ROAD_W / 2 + 4, 0, 10, WORLD_H);
  }
  for (const ry of ROAD_YS) {
    c.fillRect(0, ry - ROAD_W / 2 - 14, WORLD_W, 10);
    c.fillRect(0, ry + ROAD_W / 2 + 4, WORLD_W, 10);
  }
  // Lane dashes.
  c.fillStyle = PALETTE.lane;
  for (const rx of ROAD_XS) {
    for (let y = 40; y < WORLD_H; y += 70) c.fillRect(rx - 2, y, 4, 34);
  }
  for (const ry of ROAD_YS) {
    for (let x = 380; x < WORLD_W; x += 70) c.fillRect(x, ry - 2, 34, 4);
  }
  // Crosswalks at intersections.
  c.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of ROAD_XS) {
    for (const ry of ROAD_YS) {
      for (let i = -3; i <= 3; i++) {
        c.fillRect(rx + i * 12 - 4, ry - ROAD_W / 2 - 12, 7, 10);
        c.fillRect(rx + i * 12 - 4, ry + ROAD_W / 2 + 2, 7, 10);
      }
    }
  }
}

function drawParksAndTrees(c) {
  for (const p of G.world.parks) {
    c.fillStyle = PALETTE.park;
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle = '#6ab04c';
    c.fillRect(p.x + 8, p.y + 8, p.w - 16, 10);
  }
  for (const t of G.world.trees) {
    c.fillStyle = '#2e6b25';
    c.beginPath(); c.arc(t.x, t.y, t.r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4caf50';
    c.beginPath(); c.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); c.fill();
  }
}

function drawBuildings(c) {
  for (const b of G.world.buildings) {
    // Drop shadow.
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    // Walls and roof.
    c.fillStyle = b.wall;
    c.fillRect(b.x, b.y, b.w, b.h);
    c.fillStyle = b.color;
    c.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    // Roof details: vents and a lighter inner slab.
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fillRect(b.x + 10, b.y + 10, b.w - 20, Math.max(8, b.h * 0.22));
    c.fillStyle = 'rgba(0,0,0,0.25)';
    const nx = Math.floor(b.w / 46), ny = Math.floor(b.h / 46);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        c.fillRect(b.x + 14 + i * 46, b.y + 16 + j * 46, 18, 12);
      }
    }
  }
}

function drawGarage(c) {
  const g = G.world.garage;
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(g.x + 6, g.y + 8, g.w, g.h);
  c.fillStyle = '#7a4a21';
  c.fillRect(g.x, g.y, g.w, g.h);
  c.fillStyle = '#c9c9c9';
  c.fillRect(g.x + 10, g.y + 14, g.w - 20, 26);
  c.fillStyle = '#e74c3c';
  c.font = 'bold 20px sans-serif';
  c.textAlign = 'center';
  c.fillText("ROSA'S", g.x + g.w / 2, g.y + 66);
  c.fillStyle = '#f5f5f5';
  c.font = 'bold 16px sans-serif';
  c.fillText('GARAGE', g.x + g.w / 2, g.y + 90);
}

function drawSkids(c) {
  c.save();
  c.strokeStyle = 'rgba(20,20,20,0.55)';
  c.lineWidth = 4;
  for (const s of G.skids) {
    c.globalAlpha = s.life * 0.6;
    c.beginPath();
    c.moveTo(s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12);
    c.lineTo(s.x + Math.cos(s.angle) * 12, s.y + Math.sin(s.angle) * 12);
    c.stroke();
  }
  c.restore();
}

function drawPickups(c) {
  for (const pk of G.pickups) {
    const bob = Math.sin(pk.bob * 3) * 3;
    c.save();
    c.translate(pk.x, pk.y + bob);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.arc(0, 6 - bob, 12, 0, Math.PI * 2); c.fill();
    if (pk.kind === 'pistol') {
      c.fillStyle = '#222';
      c.fillRect(-12, -4, 22, 7);
      c.fillRect(-2, 2, 6, 9);
      c.fillStyle = '#ffd76a';
      c.font = 'bold 11px sans-serif'; c.textAlign = 'center';
      c.fillText('PISTOL', 0, -12);
    } else if (pk.kind === 'health') {
      c.fillStyle = '#fff';
      c.fillRect(-11, -11, 22, 22);
      c.fillStyle = '#e74c3c';
      c.fillRect(-3, -8, 6, 16);
      c.fillRect(-8, -3, 16, 6);
    } else {
      c.fillStyle = '#2ecc71';
      c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff';
      c.font = 'bold 13px sans-serif'; c.textAlign = 'center';
      c.fillText('$', 0, 5);
    }
    c.restore();
  }
}

function drawMissionBeacon(c) {
  const obj = currentObjective();
  if (!obj || obj.x === null || obj.x === undefined) return;
  const pulse = 1 + Math.sin(performance.now() / 300) * 0.15;
  c.save();
  c.translate(obj.x, obj.y);
  // Ground ring.
  c.strokeStyle = '#ffd76a';
  c.lineWidth = 4;
  c.beginPath(); c.arc(0, 0, 46 * pulse, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(255,215,106,0.5)';
  c.beginPath(); c.arc(0, 0, 60 * pulse, 0, Math.PI * 2); c.stroke();
  // Floating beam.
  const grad = c.createLinearGradient(0, -160, 0, 0);
  grad.addColorStop(0, 'rgba(255,215,106,0)');
  grad.addColorStop(1, 'rgba(255,215,106,0.5)');
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(-14, 0); c.lineTo(-6, -150); c.lineTo(6, -150); c.lineTo(14, 0);
  c.closePath(); c.fill();
  // Diamond marker.
  c.fillStyle = '#ffd76a';
  c.beginPath();
  c.moveTo(0, -168); c.lineTo(12, -152); c.lineTo(0, -136); c.lineTo(-12, -152);
  c.closePath(); c.fill();
  c.restore();
}

function drawPeds(c) {
  for (const ped of G.peds) {
    if (ped.state === 'riding' || ped.state === 'gone') continue;
    c.save();
    c.translate(ped.x, ped.y);
    if (ped.down > 0) {
      c.rotate(Math.PI / 2);
      c.globalAlpha = 0.85;
    }
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.ellipse(0, 8, 10, 5, 0, 0, Math.PI * 2); c.fill();
    // body
    c.fillStyle = ped.color;
    c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
    // head
    c.fillStyle = '#f0c8a0';
    c.beginPath(); c.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 - 2, 5.5, 0, Math.PI * 2); c.fill();
    // officer cap / fare marker
    if (ped.kind === 'officer') {
      c.fillStyle = '#16233a';
      c.beginPath(); c.arc(0, -2, 6, Math.PI, 0); c.fill();
    }
    c.restore();
    if (ped.state === 'fare') {
      c.save();
      c.fillStyle = '#2ecc71';
      c.font = 'bold 22px sans-serif'; c.textAlign = 'center';
      c.fillText('$', ped.x, ped.y - 22 + Math.sin(performance.now() / 300) * 3);
      c.restore();
    }
    if (ped.kind === 'officer' && G.wanted > 0) {
      c.save();
      c.fillStyle = '#ff5b5b';
      c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
      c.fillText('!', ped.x, ped.y - 20);
      c.restore();
    }
  }
}

function drawPlayer(c) {
  const p = G.player;
  if (p.car) {
    // Aim indicator when armed in a car.
    if (G.hasPistol && G.muzzleT > 0) {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.aimAngle);
      c.fillStyle = '#ffd76a';
      c.beginPath(); c.arc(30, 0, 8, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    return;
  }
  c.save();
  c.translate(p.x, p.y);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(0, 9, 11, 5, 0, 0, Math.PI * 2); c.fill();
  c.rotate(p.angle);
  // Jax: teal jacket, dark jeans.
  c.fillStyle = '#0e7c7b';
  c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f0c8a0';
  c.beginPath(); c.arc(7, 0, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#222';
  c.beginPath(); c.arc(6, -1, 6, Math.PI * 0.9, Math.PI * 2.1); c.fill();
  // Pistol in hand when armed.
  if (G.hasPistol) {
    c.fillStyle = '#1a1a1a';
    c.fillRect(8, -2, 12, 4);
  }
  // Punch swing.
  if (G.punchT > 0) {
    c.strokeStyle = '#ffe08a';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(10, 0); c.lineTo(26, 0); c.stroke();
  }
  c.restore();
  if (G.muzzleT > 0) {
    c.save();
    c.translate(p.x + Math.cos(p.aimAngle) * 26, p.y + Math.sin(p.aimAngle) * 26);
    c.fillStyle = '#ffe9a8';
    c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

function drawParticles(c) {
  for (const p of G.particles) {
    c.globalAlpha = clamp(p.life / p.max, 0, 1);
    c.fillStyle = p.color;
    c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

function drawHeadlights(c) {
  if (!isNight()) return;
  c.save();
  for (const car of G.cars) {
    if (Math.abs(car.speed) < 5 && car.kind !== 'police' && car !== G.player.car) continue;
    const a = car.angle;
    const gx = car.x + Math.cos(a) * 26, gy = car.y + Math.sin(a) * 26;
    const grad = c.createRadialGradient(gx, gy, 6, gx + Math.cos(a) * 110, gy + Math.sin(a) * 110, 150);
    grad.addColorStop(0, 'rgba(255,244,180,0.20)');
    grad.addColorStop(1, 'rgba(255,244,180,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(gx, gy);
    c.arc(gx + Math.cos(a) * 110, gy + Math.sin(a) * 110, 150, a - 0.45, a + 0.45);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawLighting(c) {
  const f = daylightFactor();
  if (f >= 0.98) return;
  const h = (G.clockMin / 60) % 24;
  const dusk = h >= 17 && h < 19.5;
  c.save();
  c.fillStyle = dusk ? 'rgba(70,30,90,' + (0.32 * (1 - f)) + ')' : 'rgba(8,12,40,' + (0.55 * (1 - f)) + ')';
  c.fillRect(0, 0, 1280, 720);
  if (dusk) {
    const grad = c.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, 'rgba(255,120,60,0)');
    grad.addColorStop(1, 'rgba(255,120,60,0.10)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 1280, 720);
  }
  c.restore();
  if (G.hurtT > 0) {
    c.save();
    c.fillStyle = 'rgba(200,0,0,' + (G.hurtT * 0.5) + ')';
    c.fillRect(0, 0, 1280, 720);
    c.restore();
  }
}
