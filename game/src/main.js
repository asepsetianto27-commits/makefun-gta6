// Solmara Nights — main loop, game state, player driving / walking,
// entering cars, menus, the self-test harness and boot.
// Solmara Nights: a complete open-world crime game built for make.fun gta6-01.

function resetGame(seed) {
  seed = seed || 20261121;
  G = {
    seed,
    state: 'menu',
    ctx: G ? G.ctx : null,
    canvas: G ? G.canvas : null,
    world: null,
    player: { x: 1400, y: 1250, angle: -Math.PI / 2, speed: 0, health: 100, car: null, aimAngle: 0 },
    playerCar: null,
    cars: [],
    peds: [],
    bullets: [],
    particles: [],
    skids: [],
    pickups: [],
    cash: 120,
    wanted: 0,
    crimeTimer: 0,
    spawnT: 0,
    arrestT: 0,
    clockMin: 17 * 60 + 35,
    mission: null,
    missionIndex: 0,
    missionComplete: null,
    missionFailed: '',
    endingShown: false,
    taxi: { active: false, tx: 0, ty: 0, fare: 0, ped: null, farePed: null },
    fareT: 12,
    dialogue: [],
    hasPistol: false,
    shotCrime: false,
    camX: 0, camY: 0,
    shake: 0,
    hurtT: 0,
    godT: 0,
    punchT: 0,
    muzzleT: 0,
    hudFlash: 0,
    saveT: 0,
    menuButtons: [],
    selfTest: false,
  };
  G.world = buildWorld(seed);
  G.player.x = G.world.spawn.x;
  G.player.y = G.world.spawn.y;
  // Jax's own car: teal sedan parked by the spawn. Entering it is free —
  // stealing anyone else's car is what brings the heat.
  const own = makeCar(G.world.spawn.x + 70, G.world.spawn.y + 10, -Math.PI / 2, 'player', 'sedan', '#14b8a6');
  own.owner = 'jax';
  G.playerCar = own;
  G.cars.push(own);
  initTraffic();
  initPeds(20);
  // Pickups near the spawn: pistol, health, cash.
  spawnPickup('pistol', G.world.spawn.x - 70, G.world.spawn.y - 30);
  spawnPickup('health', G.world.spawn.x - 40, G.world.spawn.y + 60);
  spawnPickup('cash', G.world.spawn.x + 120, G.world.spawn.y - 60);
  say('Solmara. My city, my debt, my rules. Find my car — teal sedan, by the plaza.', 'Jax Marlow');
}

function applySaveData(save) {
  G.cash = save.cash;
  G.missionIndex = save.missionIndex;
  G.player.health = save.health || 100;
  G.hasPistol = !!save.hasPistol;
  G.clockMin = save.clockMin || G.clockMin;
  G.wanted = 0;
  if (save.x && save.y) {
    G.player.x = save.x; G.player.y = save.y;
    G.playerCar.x = save.x + 70; G.playerCar.y = save.y + 10;
  }
}

function startNewGame() {
  resetGame((Math.random() * 1e9) | 0);
  G.state = 'playing';
  AudioSys.init(); AudioSys.resume(); AudioSys.startMusic();
  startMission(0);
}

function continueGame() {
  const save = loadSaveData();
  resetGame((Math.random() * 1e9) | 0);
  if (save) applySaveData(save);
  G.state = 'playing';
  AudioSys.init(); AudioSys.resume(); AudioSys.startMusic();
  if (G.missionIndex < MISSIONS.length) startMission(G.missionIndex);
}

function retryAfterFail() {
  const save = loadSaveData();
  const cash = save ? save.cash : G.cash;
  const mi = save ? save.missionIndex : G.missionIndex;
  resetGame((Math.random() * 1e9) | 0);
  G.cash = cash;
  G.missionIndex = mi;
  G.state = 'playing';
  if (mi < MISSIONS.length) startMission(mi);
}

function enterCar(car) {
  if (!car || G.player.car) return;
  const stolen = car.owner !== 'jax';
  if (G.playerCar && G.playerCar !== car) G.playerCar.kind = 'parked';
  G.player.car = car;
  car.kind = 'player';
  G.playerCar = car;
  car.speed = 0;
  if (stolen) {
    addWanted(1, 'stole a car');
    say('That was easy. That was also a crime. Drive.', 'Jax Marlow');
  } else {
    say('My car. My city. Let\u2019s roll.', 'Jax Marlow');
  }
  AudioSys.blip(180, 0.1, 'square', 0.08);
}

function exitCar() {
  const car = G.player.car;
  if (!car) return;
  car.speed = 0;
  const a = car.angle + Math.PI / 2;
  G.player.x = car.x + Math.cos(a) * 34;
  G.player.y = car.y + Math.sin(a) * 34;
  G.player.angle = car.angle;
  G.player.car = null;
  collideWorld(G.player, 12);
  if (G.taxi.active) cancelFare('Your passenger gave up and walked away.');
}

function updatePlayer(dt) {
  const p = G.player;
  const ax = Keys.axis();
  if (p.car) {
    const car = p.car;
    const fwd = ax.y < 0, back = ax.y > 0;
    const handbrake = Keys.held('Space');
    if (fwd) car.speed += 300 * dt;
    else if (back) car.speed -= car.speed > 10 ? 420 * dt : 200 * dt;
    else car.speed = lerp(car.speed, 0, dt * (handbrake ? 4 : 0.7));
    car.speed = clamp(car.speed, -140, car.maxSpeed);
    const steerInput = ax.x;
    const spdFactor = clamp(Math.abs(car.speed) / 200, 0, 1);
    const steerRate = (handbrake ? 3.4 : 2.3) * spdFactor * (car.speed < 0 ? -1 : 1);
    car.angle += steerInput * steerRate * dt;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    car.x = nx; car.y = ny;
    const hitBuilding = collideWorld(car, 20);
    if (hitBuilding && Math.abs(car.speed) > 160) {
      onPlayerCrash(Math.abs(car.speed));
      car.speed *= 0.4;
    }
    if (handbrake && Math.abs(car.speed) > 150) {
      addSkid(car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, car.angle);
      if (Math.random() < 0.3) spawnParticles(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, 1, 'rgba(200,200,200,0.7)');
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    AudioSys.engine(Math.abs(car.speed) / car.maxSpeed, true);
  } else {
    const run = Keys.held('ShiftLeft') || Keys.held('ShiftRight');
    const speed = run ? 255 : 150;
    if (ax.x !== 0 || ax.y !== 0) {
      const len = Math.hypot(ax.x, ax.y);
      p.angle = Math.atan2(ax.y / len, ax.x / len);
      p.x += (ax.x / len) * speed * dt;
      p.y += (ax.y / len) * speed * dt;
      collideWorld(p, 12);
    }
    AudioSys.engine(0, false);
  }
  // Timers.
  if (G.hurtT > 0) G.hurtT -= dt;
  if (G.godT > 0) G.godT -= dt;
  if (G.punchT > 0) G.punchT -= dt;
  if (G.muzzleT > 0) G.muzzleT -= dt;
  if (G.hudFlash > 0) G.hudFlash -= dt;
  // Slow health regen when calm.
  if (G.wanted === 0 && G.player.health > 0 && G.player.health < 100) {
    G.player.health = Math.min(100, G.player.health + 1.5 * dt);
  }
  // Enter / exit car.
  if (Keys.pressed('KeyE')) {
    if (p.car) exitCar();
    else {
      const car = nearestCarTo(p.x, p.y, 78);
      if (car) enterCar(car);
    }
  }
  if (Keys.pressed('KeyF')) punch();
  if (Keys.mouseClicked && G.hasPistol) {
    const wx = Keys.mouseX + G.camX, wy = Keys.mouseY + G.camY;
    shootAt(wx, wy);
  }
  if (Keys.pressed('KeyM')) {
    MISSIONS.forEach((m, i) => {
      const done = i < G.missionIndex ? 'DONE' : i === G.missionIndex ? 'CURRENT' : 'LOCKED';
      say('Mission ' + (i + 1) + ': ' + m.name + ' — ' + done, 'Missions');
    });
  }
}

function onPlayerCrash(speed) {
  damagePlayer(Math.min(9, speed / 60), 'crash');
  screenShake(8);
  AudioSys.crash();
  spawnParticles(G.player.x, G.player.y, 8, '#ffb347');
}

function update(dt) {
  if (G.state !== 'playing') return;
  G.clockMin += dt * 0.5;
  updatePlayer(dt);
  updateTraffic(dt);
  updatePeds(dt);
  resolveCarCollisions(dt);
  checkCarPedHits();
  updatePolice(dt);
  updateWanted(dt);
  updateBullets(dt);
  updatePickups(dt);
  updateMission(dt);
  updateTaxi(dt);
  maybeSpawnFare(dt);
  updateParticles(dt);
  updateDialogue(dt);
  // Autosave while playing.
  G.saveT += dt;
  if (G.saveT > 20) {
    G.saveT = 0;
    saveGame();
  }
}

function handleMenuClick(id) {
  if (id === 'new') startNewGame();
  else if (id === 'continue') continueGame();
  else if (id === 'resume') { G.state = 'playing'; }
  else if (id === 'quit') { resetGame(G.seed); G.state = 'menu'; }
  else if (id === 'retry') retryAfterFail();
  else if (id === 'next') {
    G.state = 'playing';
    if (G.missionIndex < MISSIONS.length) startMission(G.missionIndex);
  } else if (id === 'roam') {
    G.mission = null;
    G.state = 'playing';
  }
}

function handleClick(mx, my) {
  if (G.state === 'playing') return; // clicks in play are shooting, handled in update
  if (!G.menuButtons) return;
  for (const b of G.menuButtons) {
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      handleMenuClick(b.id);
      return;
    }
  }
}

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = 1 / 60;
  if (G.state === 'playing' && Keys.pressed('Escape')) {
    G.state = 'paused';
    AudioSys.engine(0, false);
  } else if (G.state === 'paused' && Keys.pressed('Escape')) {
    G.state = 'playing';
  }
  if (Keys.mouseClicked) {
    handleClick(Keys.mouseX, Keys.mouseY);
  }
  if (Keys.pressed('Enter')) {
    if (G.state === 'menu') startNewGame();
    else if (G.state === 'paused') G.state = 'playing';
    else if (G.state === 'busted' || G.state === 'wasted') retryAfterFail();
    else if (G.state === 'missionComplete') handleMenuClick('next');
    else if (G.state === 'missionFailed') retryAfterFail();
    else if (G.state === 'ending') handleMenuClick('roam');
  }
  update(dt);
  render();
  Keys.endFrame();
}

// Headless self-test: boots the game, simulates ~600 ticks (spawn traffic
// and peds, drive a car, raise the wanted level, start a mission, shoot and
// punch), then writes SELFTEST OK into document.title.
function runSelfTest() {
  try {
    resetGame(424242);
    G.state = 'playing';
    G.selfTest = true;
    startMission(0);
    for (let tick = 0; tick < 600; tick++) {
      Keys.down['KeyW'] = tick < 550;
      if (tick === 100) {
        const car = nearestCarTo(G.player.x, G.player.y, 400) || G.playerCar;
        G.player.x = car.x - 30; G.player.y = car.y;
        enterCar(car);
      }
      if (tick === 200) addWanted(2, 'self-test crime');
      if (tick === 350) { G.hasPistol = true; }
      if (tick === 400) shootAt(G.player.x + 120, G.player.y + 40);
      if (tick === 450) punch();
      if (tick === 500) startFareRideTest();
      update(1 / 60);
      if (G.state !== 'playing') {
        // Busted / wasted mid-test still counts as a run; respawn and continue.
        retryAfterFail();
      }
    }
    render();
    const detail = 'ticks=600 cars=' + G.cars.length + ' peds=' + G.peds.length +
      ' wanted=' + G.wanted + ' mission=' + (G.mission ? G.mission.def.name : 'none') +
      ' cash=' + Math.round(G.cash) + ' health=' + Math.round(G.player.health) +
      ' player=' + Math.round(G.player.x) + ',' + Math.round(G.player.y);
    document.title = 'SELFTEST OK ' + detail;
    window.__selftest = detail;
  } catch (err) {
    document.title = 'SELFTEST FAIL ' + (err && err.message ? err.message : err);
  }
}

function startFareRideTest() {
  const ped = nearestPedTo(G.player.x, G.player.y, 500);
  if (ped && G.player.car) {
    ped.state = 'boarding';
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  resetGame(20261121);
  G.ctx = ctx;
  G.canvas = canvas;
  Keys.init(canvas);
  const params = new URLSearchParams(window.location.search);
  if (params.get('selftest') === '1') {
    runSelfTest();
    return;
  }
  const shot = params.get('shot');
  if (shot) {
    const seed = parseInt(params.get('seed') || '1', 10) || 1;
    applyShot(shot, seed);
    requestAnimationFrame(frame);
    return;
  }
  G.state = 'menu';
  requestAnimationFrame(frame);
}

boot();
