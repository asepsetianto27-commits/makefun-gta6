// Solmara Nights — HUD (health, cash, wanted stars, objective + distance,
// clock, speed, live minimap) and all menus / end screens.

function drawHUD(c) {
  const p = G.player;
  c.save();
  // ---- Top-left: health + cash ----
  c.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(c, 16, 14, 240, 64, 10); c.fill();
  c.fillStyle = '#fff';
  c.font = 'bold 15px sans-serif'; c.textAlign = 'left';
  c.fillText('JAX MARLOW', 28, 36);
  c.fillStyle = '#222';
  c.fillRect(28, 44, 180, 12);
  c.fillStyle = p.health > 30 ? '#2ecc71' : '#e74c3c';
  c.fillRect(28, 44, 180 * clamp(p.health / 100, 0, 1), 12);
  c.fillStyle = '#7CFC98';
  c.font = 'bold 18px sans-serif';
  c.fillText(fmtCash(G.cash), 28, 74);
  if (G.hasPistol) {
    c.fillStyle = '#ffd76a';
    c.font = 'bold 13px sans-serif';
    c.fillText('PISTOL [click to shoot]', 130, 74);
  }
  // ---- Top-center: wanted stars ----
  const cx = 640;
  c.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(c, cx - 110, 14, 220, 40, 10); c.fill();
  c.font = '28px sans-serif'; c.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    c.fillStyle = i < G.wanted ? '#ffd700' : 'rgba(255,255,255,0.25)';
    c.fillText('★', cx - 80 + i * 40, 44);
  }
  if (G.wanted > 0) {
    c.fillStyle = '#ff6b6b';
    c.font = 'bold 12px sans-serif';
    c.fillText('WANTED', cx, 66);
  }
  // ---- Bottom-left: speed + clock ----
  c.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(c, 16, 640, 170, 62, 10); c.fill();
  c.fillStyle = '#fff';
  c.font = 'bold 26px sans-serif'; c.textAlign = 'left';
  const kmh = p.car ? Math.round(Math.abs(p.car.speed) * 0.36) : 0;
  c.fillText(p.car ? kmh + ' km/h' : 'ON FOOT', 28, 668);
  c.fillStyle = '#ffd76a';
  c.font = 'bold 16px sans-serif';
  c.fillText('TIME ' + fmtClock(G.clockMin) + (isNight() ? '  NIGHT' : '  DAY'), 28, 692);
  // ---- Bottom-center: objective ----
  const obj = currentObjective();
  c.fillStyle = 'rgba(0,0,0,0.6)';
  const ow = 560;
  roundRect(c, 640 - ow / 2, 648, ow, 56, 10); c.fill();
  c.fillStyle = '#ffd76a';
  c.font = 'bold 15px sans-serif'; c.textAlign = 'center';
  const missionName = G.mission ? G.mission.def.name.toUpperCase() + '  •  ' : '';
  c.fillText(missionName + obj.text, 640, 670);
  if (obj.x !== null && obj.x !== undefined) {
    const d = Math.round(dist(p.x, p.y, obj.x, obj.y));
    c.fillStyle = '#fff';
    c.font = '14px sans-serif';
    c.fillText(d + ' m', 640, 692);
    if (G.mission && G.mission.timer > 0 && (G.mission.step === 'drive' || G.mission.step === 'survive')) {
      c.fillStyle = G.mission.timer < 20 ? '#ff6b6b' : '#fff';
      c.font = 'bold 15px sans-serif';
      c.fillText('TIME LEFT ' + Math.ceil(G.mission.timer) + 's', 640, 640 - 8);
    }
  }
  // ---- Controls hint ----
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.font = '12px sans-serif'; c.textAlign = 'right';
  c.fillText('WASD drive / walk   E enter car   F punch   Space handbrake   M missions   Esc pause', 1264, 706);
  drawMinimap(c);
  c.restore();
}

function drawMinimap(c) {
  const mw = 200, mh = 146, mx = 1280 - mw - 16, my = 14;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(c, mx - 4, my - 4, mw + 8, mh + 8, 10); c.fill();
  // Sea + land.
  c.fillStyle = '#2f7fb8';
  c.fillRect(mx, my, mw, mh);
  c.fillStyle = '#4c8340';
  c.fillRect(mx + BEACH_X * sx, my, mw - BEACH_X * sx, mh);
  // Roads.
  c.strokeStyle = '#3a3a40';
  c.lineWidth = 3;
  for (const rx of ROAD_XS) {
    c.beginPath(); c.moveTo(mx + rx * sx, my); c.lineTo(mx + rx * sx, my + mh); c.stroke();
  }
  for (const ry of ROAD_YS) {
    c.beginPath(); c.moveTo(mx, my + ry * sy); c.lineTo(mx + mw, my + ry * sy); c.stroke();
  }
  // Parks.
  c.fillStyle = '#3f7d33';
  for (const p of G.world.parks) c.fillRect(mx + p.x * sx, my + p.y * sy, Math.max(2, p.w * sx), Math.max(2, p.h * sy));
  // Mission marker.
  const obj = currentObjective();
  if (obj && obj.x !== null && obj.x !== undefined) {
    const pulse = 1 + Math.sin(performance.now() / 250) * 0.3;
    c.fillStyle = '#ffd76a';
    c.beginPath(); c.arc(mx + obj.x * sx, my + obj.y * sy, 5 * pulse, 0, Math.PI * 2); c.fill();
  }
  // Police (blue), traffic (white), player (green ring).
  for (const car of G.cars) {
    if (car === G.player.car) continue;
    c.fillStyle = car.police ? '#2d7dff' : 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(mx + car.x * sx, my + car.y * sy, car.police ? 4 : 2.5, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = '#2ecc71';
  c.beginPath(); c.arc(mx + G.player.x * sx, my + G.player.y * sy, 5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2;
  c.beginPath(); c.arc(mx + G.player.x * sx, my + G.player.y * sy, 7, 0, Math.PI * 2); c.stroke();
  // North + label.
  c.fillStyle = '#fff';
  c.font = 'bold 11px sans-serif'; c.textAlign = 'left';
  c.fillText('SOLMARA', mx + 2, my + mh - 6);
  c.restore();
}

function drawDialogue(c) {
  if (!G.dialogue.length) return;
  const d = G.dialogue[0];
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.65)';
  const w = Math.min(760, 40 + d.text.length * 7.2);
  roundRect(c, 640 - w / 2, 560, w, 52, 10); c.fill();
  c.fillStyle = '#ffd76a';
  c.font = 'bold 13px sans-serif'; c.textAlign = 'center';
  if (d.who) c.fillText(d.who.toUpperCase(), 640, 580);
  c.fillStyle = '#fff';
  c.font = '15px sans-serif';
  c.fillText(d.text, 640, 600);
  c.restore();
}

// ---- Menus and end screens ----

function menuButton(c, id, x, y, w, h, label, active) {
  c.fillStyle = active ? '#ffd76a' : 'rgba(255,255,255,0.16)';
  roundRect(c, x, y, w, h, 10); c.fill();
  c.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.4)';
  c.lineWidth = 2;
  roundRect(c, x, y, w, h, 10); c.stroke();
  c.fillStyle = active ? '#222' : '#fff';
  c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
  c.fillText(label, x + w / 2, y + h / 2 + 6);
  return { id, x, y, w, h };
}

function drawStartScreen(c) {
  c.save();
  // Sunset gradient backdrop over the city.
  const grad = c.createLinearGradient(0, 0, 0, 720);
  grad.addColorStop(0, '#1a2a5e');
  grad.addColorStop(0.55, '#c65d7b');
  grad.addColorStop(1, '#f6a05c');
  c.fillStyle = grad;
  c.fillRect(0, 0, 1280, 720);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(0, 0, 1280, 720);
  c.textAlign = 'center';
  c.fillStyle = '#ffd76a';
  c.font = 'bold 84px sans-serif';
  c.fillText('SOLMARA', 640, 170);
  c.fillStyle = '#fff';
  c.font = 'bold 44px sans-serif';
  c.fillText('N I G H T S', 640, 224);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.font = '17px sans-serif';
  c.fillText('Jax Marlow owes Mama Rosa. One city. Four jobs. Every car is yours if you can take it.', 640, 268);
  c.fillText('Explore Solmara on foot and by car — steal cars, outrun the police, run the story.', 640, 294);
  G.menuButtons = [];
  const save = loadSaveData();
  G.menuButtons.push(menuButton(c, 'new', 490, 330, 300, 54, '▶  NEW GAME', true));
  if (save) {
    G.menuButtons.push(menuButton(c, 'continue', 490, 396, 300, 54, '↻  CONTINUE  (' + fmtCash(save.cash) + ' · Mission ' + (save.missionIndex + 1) + '/4)', false));
  }
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.font = '15px sans-serif';
  c.fillText('WASD / arrows — move & drive      E — enter / exit car      Space — handbrake      Shift — run', 640, 500);
  c.fillText('Mouse aim + click — shoot (after the pistol pickup)      F — punch      M — mission list      Esc — pause', 640, 526);
  c.fillText('Taxi fares pay cash. Wanted stars bring the Solmara police. Losing them takes patience.', 640, 552);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.font = '13px sans-serif';
  c.fillText('An original game for the make.fun “Make GTA 6” bounty — no Rockstar content. Progress saves automatically.', 640, 600);
  c.fillText('Click a button or press Enter to start.', 640, 626);
  c.restore();
}

function drawPauseScreen(c) {
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, 0, 1280, 720);
  c.textAlign = 'center';
  c.fillStyle = '#fff';
  c.font = 'bold 48px sans-serif';
  c.fillText('PAUSED', 640, 220);
  c.font = '17px sans-serif';
  c.fillStyle = 'rgba(255,255,255,0.9)';
  const obj = currentObjective();
  c.fillText('Objective: ' + obj.text, 640, 270);
  c.fillText('Cash ' + fmtCash(G.cash) + '   •   Mission ' + Math.min(G.missionIndex + 1, 4) + ' of 4   •   ' + fmtClock(G.clockMin), 640, 300);
  c.fillText('WASD drive / walk   •   E enter car   •   F punch   •   Click shoot   •   Space handbrake', 640, 340);
  G.menuButtons = [];
  G.menuButtons.push(menuButton(c, 'resume', 490, 380, 300, 54, '▶  RESUME', true));
  G.menuButtons.push(menuButton(c, 'quit', 490, 446, 300, 54, 'QUIT TO MENU', false));
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.font = '13px sans-serif';
  c.fillText('Press Esc or click Resume to keep playing.', 640, 540);
  c.restore();
}

function drawBustedScreen(c) {
  c.save();
  c.fillStyle = 'rgba(10,10,40,0.78)';
  c.fillRect(0, 0, 1280, 720);
  c.textAlign = 'center';
  c.fillStyle = '#5b8cff';
  c.font = 'bold 72px sans-serif';
  c.fillText('BUSTED', 640, 300);
  c.fillStyle = '#fff';
  c.font = '19px sans-serif';
  c.fillText('The Solmara police finally caught up with Jax. The cell has a great view of the harbor.', 640, 350);
  c.fillText('Cash kept: ' + fmtCash(G.cash) + '   •   Mission ' + Math.min(G.missionIndex + 1, 4) + ' of 4', 640, 384);
  G.menuButtons = [];
  G.menuButtons.push(menuButton(c, 'retry', 490, 420, 300, 54, '↻  TRY AGAIN', true));
  G.menuButtons.push(menuButton(c, 'quit', 490, 486, 300, 54, 'QUIT TO MENU', false));
  c.restore();
}

function drawWastedScreen(c) {
  c.save();
  c.fillStyle = 'rgba(40,5,5,0.78)';
  c.fillRect(0, 0, 1280, 720);
  c.textAlign = 'center';
  c.fillStyle = '#ff5b5b';
  c.font = 'bold 72px sans-serif';
  c.fillText('WASTED', 640, 300);
  c.fillStyle = '#fff';
  c.font = '19px sans-serif';
  c.fillText('Jax went down in the streets of Solmara. Mama Rosa is already hiring a replacement driver.', 640, 350);
  c.fillText('Cash kept: ' + fmtCash(G.cash) + '   •   Mission ' + Math.min(G.missionIndex + 1, 4) + ' of 4', 640, 384);
  G.menuButtons = [];
  G.menuButtons.push(menuButton(c, 'retry', 490, 420, 300, 54, '↻  TRY AGAIN', true));
  G.menuButtons.push(menuButton(c, 'quit', 490, 486, 300, 54, 'QUIT TO MENU', false));
  c.restore();
}

function drawMissionCompleteScreen(c) {
  const mc = G.missionComplete || { name: 'Mission', reward: 0 };
  c.save();
  c.fillStyle = 'rgba(0,30,10,0.72)';
  c.fillRect(0, 0, 1280, 720);
  c.textAlign = 'center';
  c.fillStyle = '#7CFC98';
  c.font = 'bold 56px sans-serif';
  c.fillText('MISSION COMPLETE', 640, 280);
  c.fillStyle = '#ffd76a';
  c.font = 'bold 30px sans-serif';
  c.fillText(mc.name + '   •   +' + fmtCash(mc.reward), 640, 340);
  c.fillStyle = '#fff';
  c.font = '18px sans-serif';
  const next = G.missionIndex < MISSIONS.length
    ? 'Next job: ' + MISSIONS[G.missionIndex].name + ' — ' + MISSIONS[G.missionIndex].brief
    : 'All four jobs done. Solmara is yours — keep driving.';
  c.fillText(next, 640, 388);
  G.menuButtons = [];
  G.menuButtons.push(menuButton(c, 'next', 490, 430, 300, 54, G.missionIndex < MISSIONS.length ? '▶  NEXT MISSION' : '▶  FREE ROAM', true));
  G.menuButtons.push(menuButton(c, 'roam', 490, 496, 300, 54, 'FREE ROAM INSTEAD', false));
  c.restore();
}

function drawMissionFailedScreen(c) {
  c.save();
  c.fillStyle = 'rgba(30,20,0,0.78)';
  c.fillRect(0, 0, 1280, 720);
  c.textAlign = 'center';
  c.fillStyle = '#ff9f43';
  c.font = 'bold 56px sans-serif';
  c.fillText('MISSION FAILED', 640, 300);
  c.fillStyle = '#fff';
  c.font = '19px sans-serif';
  c.fillText(G.missionFailed || 'The job went sideways.', 640, 350);
  G.menuButtons = [];
  G.menuButtons.push(menuButton(c, 'retry', 490, 400, 300, 54, '↻  RETRY MISSION', true));
  G.menuButtons.push(menuButton(c, 'roam', 490, 466, 300, 54, 'FREE ROAM INSTEAD', false));
  c.restore();
}

function drawEndingScreen(c) {
  c.save();
  const grad = c.createLinearGradient(0, 0, 0, 720);
  grad.addColorStop(0, '#1a2a5e');
  grad.addColorStop(1, '#f6a05c');
  c.fillStyle = grad;
  c.fillRect(0, 0, 1280, 720);
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.fillRect(0, 0, 1280, 720);
  c.textAlign = 'center';
  c.fillStyle = '#ffd76a';
  c.font = 'bold 56px sans-serif';
  c.fillText('DEBT PAID.', 640, 200);
  c.fillStyle = '#fff';
  c.font = '19px sans-serif';
  ENDING_LINES.forEach((line, i) => c.fillText(line, 640, 260 + i * 34));
  c.font = 'bold 17px sans-serif';
  c.fillText('Final cash: ' + fmtCash(G.cash), 640, 430);
  G.menuButtons = [];
  G.menuButtons.push(menuButton(c, 'roam', 490, 470, 300, 54, '▶  KEEP EXPLORING SOLMARA', true));
  G.menuButtons.push(menuButton(c, 'quit', 490, 536, 300, 54, 'QUIT TO MENU', false));
  c.restore();
}
