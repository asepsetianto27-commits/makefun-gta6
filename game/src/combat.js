// Solmara Nights — combat: fists on foot, a pistol with mouse aim once picked
// up, bullets, muzzle flash, and damage to the player, peds and officers.

function updateBullets(dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // Hit a building: spark and stop.
    for (const bd of G.world.buildings) {
      if (pointInRect(b.x, b.y, bd)) { b.life = 0; spawnParticles(b.x, b.y, 4, '#ffb347'); break; }
    }
    if (b.life <= 0) continue;
    if (b.hostile) {
      if (dist(b.x, b.y, G.player.x, G.player.y) < (G.player.car ? 24 : 13)) {
        b.life = 0;
        damagePlayer(6, 'shot by police');
      }
    } else {
      for (const ped of G.peds) {
        if (ped.down > 0 || ped.state === 'riding') continue;
        if (dist(b.x, b.y, ped.x, ped.y) < 15) {
          b.life = 0;
          damagePed(ped, 34);
          break;
        }
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < WORLD_W && b.y > 0 && b.y < WORLD_H);
}

function shootAt(wx, wy) {
  if (!G.hasPistol || G.state !== 'playing') return;
  const ox = G.player.x, oy = G.player.y;
  const a = angleTo(ox, oy, wx, wy) + rr(-0.03, 0.03);
  G.bullets.push({ x: ox + Math.cos(a) * 20, y: oy + Math.sin(a) * 20, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, life: 1.0, hostile: false });
  G.player.aimAngle = a;
  G.muzzleT = 0.07;
  spawnParticles(ox + Math.cos(a) * 24, oy + Math.sin(a) * 24, 5, '#ffd76a');
  AudioSys.gunshot();
  if (!G.shotCrime) {
    // Firing a gun in the city draws the law.
    addWanted(1, 'fired a gun');
  }
}

function punch() {
  if (G.state !== 'playing' || G.player.car) return;
  const a = G.player.angle;
  const tx = G.player.x + Math.cos(a) * 40, ty = G.player.y + Math.sin(a) * 40;
  const ped = nearestPedTo(tx, ty, 46);
  G.punchT = 0.18;
  AudioSys.punch();
  if (ped) {
    damagePed(ped, 25);
    const ka = angleTo(G.player.x, G.player.y, ped.x, ped.y);
    ped.x += Math.cos(ka) * 26; ped.y += Math.sin(ka) * 26;
    spawnParticles(ped.x, ped.y, 6, '#ffe08a');
    if (ped.kind === 'officer' || ped.kind === 'civilian') addWanted(1, 'assault');
  }
}

function damagePed(ped, n) {
  ped.hp = (ped.hp === undefined ? 50 : ped.hp) - n;
  ped.state = 'flee';
  ped.fleeX = G.player.x; ped.fleeY = G.player.y;
  ped.scared = 2.5;
  if (ped.hp <= 0) {
    ped.down = 4;
    ped.state = 'walk';
    if (ped.kind === 'officer') {
      addWanted(2, 'downed an officer');
      G.cash = Math.max(0, G.cash);
    }
  }
}

function damagePlayer(n, src) {
  if (G.state !== 'playing' || G.godT > 0) return;
  G.player.health -= n;
  G.hurtT = 0.35;
  G.godT = 0.4;
  screenShake(5);
  if (G.player.health <= 0) {
    G.player.health = 0;
    G.state = 'wasted';
    AudioSys.engine(0, false);
    AudioSys.busted();
    saveGame();
  }
}

function updatePickups(dt) {
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    pk.bob += dt;
    if (dist(pk.x, pk.y, G.player.x, G.player.y) < 30) {
      pk.taken = true;
      if (pk.kind === 'pistol') {
        G.hasPistol = true;
        say('Pistol picked up. Click to shoot — and try not to need it.', 'Jax Marlow');
      } else if (pk.kind === 'health') {
        G.player.health = Math.min(100, G.player.health + 40);
        say('Patched up. Good as new.', 'Jax Marlow');
      } else if (pk.kind === 'cash') {
        G.cash += 50;
        AudioSys.cash();
      }
      AudioSys.pickup();
      spawnParticles(pk.x, pk.y, 10, '#7CFC98');
    }
  }
  G.pickups = G.pickups.filter((p) => !p.taken);
}

function spawnPickup(kind, x, y) {
  G.pickups.push({ kind, x, y, bob: 0, taken: false });
}

function drawBullets(c) {
  c.save();
  c.strokeStyle = '#ffe9a8';
  c.lineWidth = 3;
  for (const b of G.bullets) {
    c.beginPath();
    c.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    c.lineTo(b.x, b.y);
    c.stroke();
  }
  c.restore();
}
