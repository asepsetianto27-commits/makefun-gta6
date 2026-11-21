// Solmara Nights — the wanted system and the Solmara police.
// Stars rise on crimes and fall when the player hides; police cars chase and
// ram, officers on foot chase and arrest, and at high heat officers shoot.

function addWanted(n, reason) {
  if (!G || G.state !== 'playing') return;
  const before = G.wanted;
  G.wanted = clamp(G.wanted + n, 0, 5);
  G.crimeTimer = 0;
  if (G.wanted > before && G.wanted >= 1) {
    G.hudFlash = 1.2;
  }
}

function updateWanted(dt) {
  if (G.wanted <= 0) return;
  G.crimeTimer += dt;
  const policeNear = G.cars.some((c) => c.police && dist(c.x, c.y, G.player.x, G.player.y) < 520);
  // Heat dies down only when the player has been clean and unseen for a while.
  if (G.crimeTimer > 14 && !policeNear) {
    G.wanted -= 1;
    G.crimeTimer = 0;
    if (G.wanted === 0) say('The heat is off. For now.', 'Jax Marlow');
  }
}

function policeTargetCount() {
  return G.wanted >= 1 ? Math.min(2 + G.wanted, 7) : 0;
}

function spawnPoliceCar() {
  const a = rr(0, Math.PI * 2);
  const d = rr(620, 900);
  let x = clamp(G.player.x + Math.cos(a) * d, 380, WORLD_W - 60);
  let y = clamp(G.player.y + Math.sin(a) * d, 60, WORLD_H - 60);
  const rp = nearestRoadPoint(x, y);
  x = rp.x; y = rp.y;
  const car = makeCar(x, y, angleTo(x, y, G.player.x, G.player.y), 'police', 'sedan', '#1c2733');
  car.maxSpeed = 340 + G.wanted * 12;
  G.cars.push(car);
  return car;
}

function spawnOfficer() {
  const a = rr(0, Math.PI * 2);
  const x = clamp(G.player.x + Math.cos(a) * rr(180, 320), 60, WORLD_W - 60);
  const y = clamp(G.player.y + Math.sin(a) * rr(180, 320), 60, WORLD_H - 60);
  const off = spawnPed(x, y, 'officer');
  off.color = '#24344d';
  off.speed = 150;
  G.peds.push(off);
  return off;
}

function updatePolice(dt) {
  // Spawn police cars up to the wanted level's demand.
  const want = policeTargetCount();
  const have = G.cars.filter((c) => c.police).length;
  G.spawnT -= dt;
  if (have < want && G.spawnT <= 0) {
    spawnPoliceCar();
    G.spawnT = 2.2;
  }
  if (G.wanted >= 3) {
    const officers = G.peds.filter((p) => p.kind === 'officer').length;
    if (officers < 2 && G.spawnT <= 0) {
      spawnOfficer();
      G.spawnT = 3;
    }
  }
  // Police cars: steer at the player, ram, and try to box the player in.
  for (const car of G.cars) {
    if (!car.police) continue;
    const d = dist(car.x, car.y, G.player.x, G.player.y);
    const targetAngle = angleTo(car.x, car.y, G.player.x, G.player.y);
    car.angle = angleLerp(car.angle, targetAngle, dt * 2.4);
    const wantSpeed = d > 600 ? car.maxSpeed * 0.6 : d > 420 ? car.maxSpeed : car.maxSpeed * 0.85;
    car.speed = lerp(car.speed, wantSpeed, dt * 1.2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.sirenT += dt;
    car.sirenPhase = Math.floor(car.sirenT * 1.4) % 2 === 0;
    // Ram the player's car.
    if (G.player.car && d < 48) {
      const push = angleTo(car.x, car.y, G.player.car.x, G.player.car.y);
      G.player.car.x += Math.cos(push) * 26 * dt * 10;
      G.player.car.y += Math.sin(push) * 26 * dt * 10;
      if (Math.abs(car.speed) > 180) {
        damagePlayer(2, 'rammed by police');
        screenShake(6);
        AudioSys.crash();
        car.speed *= 0.4;
      }
    }
    // Despawn far-away cruisers once the heat is gone.
    if (G.wanted === 0 && d > 1100) {
      G.cars = G.cars.filter((c) => c !== car);
    }
  }
  // Officers on foot: chase the player, arrest on foot, shoot at 3+ stars.
  for (const off of G.peds) {
    if (off.kind !== 'officer') continue;
    const d = dist(off.x, off.y, G.player.x, G.player.y);
    if (G.wanted === 0) {
      off.state = 'walk';
      continue;
    }
    off.angle = angleTo(off.x, off.y, G.player.x, G.player.y);
    const run = G.player.car ? 165 : 150;
    off.x += Math.cos(off.angle) * run * dt;
    off.y += Math.sin(off.angle) * run * dt;
    collideWorld(off, 12);
    // Arrest: standing next to an on-foot player for a moment ends the run.
    if (!G.player.car && d < 42) {
      G.arrestT += dt;
      if (G.arrestT > 1.6) {
        bustPlayer();
        return;
      }
    } else {
      G.arrestT = Math.max(0, G.arrestT - dt * 2);
    }
    // Armed response at 3 stars and above.
    if (G.wanted >= 3 && d < 420 && d > 90) {
      off.shootT -= dt;
      if (off.shootT <= 0) {
        off.shootT = rr(0.9, 1.8);
        officerShoot(off);
      }
    }
  }
  // Siren audio follows the nearest cruiser.
  const anySiren = G.cars.some((c) => c.police && dist(c.x, c.y, G.player.x, G.player.y) < 700);
  AudioSys.siren(anySiren, Math.floor(performance.now() / 450) % 2 === 0);
}

function officerShoot(off) {
  const a = angleTo(off.x, off.y, G.player.x, G.player.y) + rr(-0.14, 0.14);
  G.bullets.push({ x: off.x, y: off.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 1.1, hostile: true });
  spawnParticles(off.x + Math.cos(a) * 16, off.y + Math.sin(a) * 16, 4, '#ffd76a');
  AudioSys.gunshot();
}

function bustPlayer() {
  if (G.state !== 'playing') return;
  G.state = 'busted';
  AudioSys.busted();
  AudioSys.engine(0, false);
  saveGame();
}
