// Solmara Nights — deterministic staged shots for screenshots.
// ?shot=<name>&seed=<n> places the camera, player, traffic, police and
// mission deterministically so every screenshot is reproducible.

function stageCommon(seed) {
  resetGame(seed);
  G.dialogue = [];
  G.state = 'playing';
}

function placePlayerCarAt(x, y, angle, speed) {
  const car = G.playerCar;
  car.x = x; car.y = y; car.angle = angle; car.speed = speed || 0;
  G.player.car = car;
  G.player.x = x; G.player.y = y; G.player.angle = angle;
}

function scatterTrafficNear(x, y, n) {
  for (let i = 0; i < n; i++) {
    // Snap onto the nearest road so no car ever starts inside a building.
    const rp = nearestRoadPoint(clamp(x + rr(-420, 420), 380, WORLD_W - 60), clamp(y + rr(-260, 260), 60, WORLD_H - 60));
    const car = makeCar(rp.x, rp.y, rp.vertical ? (R() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (R() < 0.5 ? 0 : Math.PI), 'traffic');
    car.speed = rr(90, 150);
    G.cars.push(car);
  }
}

function scatterPedsNear(x, y, n) {
  for (let i = 0; i < n; i++) {
    const t = sidewalkPointNear(clamp(x + rr(-300, 300), 60, WORLD_W - 60), clamp(y + rr(-220, 220), 60, WORLD_H - 60));
    G.peds.push(spawnPed(t.x, t.y));
  }
}

function scatterPoliceNear(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = rr(0, Math.PI * 2);
    const rp = nearestRoadPoint(clamp(x + Math.cos(a) * rr(220, 420), 380, WORLD_W - 60), clamp(y + Math.sin(a) * rr(220, 420), 60, WORLD_H - 60));
    const car = makeCar(rp.x, rp.y, angleTo(rp.x, rp.y, x, y), 'police', 'sedan', '#1c2733');
    car.maxSpeed = 400;
    car.speed = 300;
    G.cars.push(car);
  }
}

function applyShot(name, seed) {
  seed = seed || 1;
  if (name === 'cover') {
    stageCommon(seed);
    G.clockMin = 17 * 60 + 45; // golden dusk
    placePlayerCarAt(1400, 1050, -Math.PI / 2, 210);
    G.wanted = 2;
    startMission(0); // First Fare: HUD shows objective + timer + distance
    scatterTrafficNear(1400, 1050, 5);
    scatterPedsNear(1400, 1050, 6);
    scatterPoliceNear(1400, 1050, 2);
    say('Client: Palm Plaza, and step on it. I have a boat to catch.', 'Client');
  } else if (name === 'street') {
    stageCommon(seed + 10);
    G.clockMin = 12 * 60; // bright midday
    G.player.x = 1400; G.player.y = 1250; G.player.angle = -Math.PI / 2;
    G.player.car = null;
    G.mission = null;
    scatterTrafficNear(1400, 1250, 7);
    scatterPedsNear(1400, 1250, 14);
    say('Solmara at midday — every street is alive. Find a car, or just walk.', 'Jax Marlow');
  } else if (name === 'chase') {
    stageCommon(seed + 20);
    G.clockMin = 20 * 60 + 30; // night, headlights on
    placePlayerCarAt(1900, 800, 0, 380);
    G.wanted = 5;
    scatterTrafficNear(1900, 800, 4);
    scatterPedsNear(1900, 800, 4);
    scatterPoliceNear(1900, 800, 5);
    say('Five stars! The whole Solmara PD is on your tail — lose them!', 'Mama Rosa');
  } else if (name === 'mission') {
    stageCommon(seed + 30);
    G.clockMin = 18 * 60 + 30; // dusk
    placePlayerCarAt(420, 1250, 0, 120);
    G.wanted = 2;
    startMission(3); // The Drop: package at the pier
    scatterTrafficNear(420, 1250, 3);
    scatterPedsNear(420, 1250, 5);
    scatterPoliceNear(420, 1250, 3);
  } else {
    stageCommon(seed);
    G.clockMin = 17 * 60 + 45;
    placePlayerCarAt(1400, 1050, -Math.PI / 2, 150);
    startMission(0);
  }
  // One synchronous frame so the screenshot has a full render immediately.
  try { render(); } catch (err) { /* the rAF loop will retry */ }
}
