// Solmara Nights — the 4-mission story, the taxi side activity, dialogue,
// objectives, markers, timers, rewards and the ending.

function say(text, who) {
  G.dialogue.push({ text, who: who || '', t: 0 });
  if (G.dialogue.length > 4) G.dialogue.shift();
}

function updateDialogue(dt) {
  if (!G.dialogue.length) return;
  G.dialogue[0].t += dt;
  if (G.dialogue[0].t > 4.2) G.dialogue.shift();
}

function missionMarker() {
  const m = G.mission;
  if (!m || m.done) return null;
  if (m.step === 'getcar') return { x: G.player.x, y: G.player.y, label: 'Get in a car' };
  if (m.step === 'drive') return { x: m.tx, y: m.ty, label: m.label };
  if (m.step === 'steal') return { x: m.tx, y: m.ty, label: m.label };
  if (m.step === 'deliver') return { x: m.tx, y: m.ty, label: m.label };
  if (m.step === 'pickup') return { x: m.tx, y: m.ty, label: m.label };
  if (m.step === 'survive') return null;
  if (m.step === 'hide') return null;
  return null;
}

function currentObjective() {
  const m = G.mission;
  if (G.taxi.active) {
    return { text: 'Taxi fare: drop your passenger at the marker', x: G.taxi.tx, y: G.taxi.ty };
  }
  if (!m || m.done) {
    return { text: G.missionIndex >= MISSIONS.length ? 'Free roam — fares, chases and the open city are yours' : 'Press M for the mission list', x: null, y: null };
  }
  const mk = missionMarker();
  const texts = {
    getcar: 'Get in a car',
    drive: 'Drive the client to Palm Plaza — beat the clock!',
    steal: 'Steal the yellow Comet GT at the marina',
    deliver: 'Deliver the car to Rosa\u2019s Garage',
    pickup: 'Pick up the package at Solmara Pier',
    survive: 'Survive the heat — 3 stars on you!',
    hide: 'Lose the cops — let your wanted level fall to zero',
  };
  return { text: texts[m.step] || m.name, x: mk ? mk.x : null, y: mk ? mk.y : null };
}

function startMission(i) {
  const def = MISSIONS[i];
  if (!def) return;
  G.missionIndex = i;
  const m = { def, index: i, name: def.name, step: 'getcar', tx: 0, ty: 0, label: '', timer: 0, done: false };
  if (i === 0) {
    m.step = 'getcar';
    m.tx = G.world.plaza.x; m.ty = G.world.plaza.y;
    m.label = 'Palm Plaza';
    m.timer = 110;
  } else if (i === 1) {
    m.step = 'steal';
    m.tx = G.world.marina.x; m.ty = G.world.marina.y;
    m.label = 'Steal the Comet GT';
    m.targetCar = makeCar(G.world.marina.x + 60, G.world.marina.y + 30, 0, 'parked', 'sport', '#f1c40f');
    // Keep the target car out of any building so it is always reachable.
    let guard = 0;
    while (guard++ < 40 && G.world.buildings.some((b) => pointInRect(m.targetCar.x, m.targetCar.y, { x: b.x - 26, y: b.y - 26, w: b.w + 52, h: b.h + 52 }))) {
      m.targetCar.x += 44;
    }
    G.cars.push(m.targetCar);
  } else if (i === 2) {
    m.step = 'survive';
    m.timer = 60;
    G.wanted = 3;
    G.crimeTimer = 0;
  } else if (i === 3) {
    m.step = 'pickup';
    m.tx = G.world.pier.x; m.ty = G.world.pier.y;
    m.label = 'Pick up the package';
  }
  G.mission = m;
  def.dialogue.forEach(([who, line]) => say(line, who));
  saveGame();
}

function completeMission() {
  const m = G.mission;
  if (!m) return;
  G.cash += m.def.reward;
  AudioSys.missionDone();
  G.missionComplete = { name: m.def.name, reward: m.def.reward };
  G.state = 'missionComplete';
  G.mission = null;
  G.missionIndex += 1;
  if (G.missionIndex >= MISSIONS.length) {
    G.endingShown = true;
  }
  saveGame();
}

function failMission(reason) {
  G.missionFailed = reason || 'Mission failed';
  G.state = 'missionFailed';
  AudioSys.busted();
}

function updateMission(dt) {
  const m = G.mission;
  if (!m) return;
  if (m.step === 'getcar') {
    if (G.player.car) {
      if (m.index === 0) {
        m.step = 'drive';
        m.tx = G.world.plaza.x; m.ty = G.world.plaza.y; m.label = 'Palm Plaza';
        say('Client: Palm Plaza, and step on it. I have a boat to catch.', 'Client');
      } else {
        m.step = 'drive';
      }
    }
    return;
  }
  if (m.step === 'drive' || m.step === 'deliver' || m.step === 'pickup') {
    const d = dist(G.player.x, G.player.y, m.tx, m.ty);
    const radius = (m.step === 'deliver' || m.step === 'pickup') ? 120 : 70;
    if (m.index === 0) {
      m.timer -= dt;
      if (m.timer <= 0) { failMission('Out of time — the client missed his boat.'); return; }
    }
    if (d < radius) {
      if (m.index === 0) { completeMission(); return; }
      if (m.index === 1 && m.step === 'deliver') { completeMission(); return; }
      if (m.index === 3 && m.step === 'pickup') {
        m.step = 'deliver';
        m.tx = G.world.warehouse.x; m.ty = G.world.warehouse.y; m.label = 'Harbor Warehouse';
        G.wanted = Math.max(G.wanted, 2);
        say('Package secured. Now the warehouse — and the whole Solmara PD is awake.', 'Jax Marlow');
        return;
      }
      if (m.index === 3 && m.step === 'deliver') { completeMission(); return; }
    }
    return;
  }
  if (m.step === 'steal') {
    if (G.player.car === m.targetCar) {
      m.step = 'deliver';
      m.tx = G.world.garage.x; m.ty = G.world.garage.y; m.label = "Rosa's Garage";
      say('Nice. Yellow suits you. Now the garage — easy does it.', 'Mama Rosa');
    }
    return;
  }
  if (m.step === 'survive') {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.step = 'hide';
      say('You lived. Now vanish — get that wanted level to zero.', 'Mama Rosa');
    }
    return;
  }
  if (m.step === 'hide') {
    if (G.wanted <= 0) completeMission();
    return;
  }
}

// ---- Taxi side activity ----

function maybeSpawnFare(dt) {
  G.fareT -= dt;
  if (G.fareT > 0 || G.taxi.active) return;
  G.fareT = rr(14, 26);
  const t = randomSidewalkPoint();
  const ped = spawnPed(t.x, t.y);
  ped.state = 'fare';
  G.peds.push(ped);
  G.taxi.farePed = ped;
}

function startFareRide(ped) {
  const dest = randomRoadPoint();
  G.taxi.active = true;
  G.taxi.tx = dest.x; G.taxi.ty = dest.y;
  G.taxi.fare = ri(25, 60);
  G.taxi.ped = ped;
  say('Passenger: Take me to the marker, driver. No funny business.', 'Passenger');
}

function updateTaxi(dt) {
  if (!G.taxi.active) return;
  if (!G.player.car) {
    // Passenger bails if the driver abandons the car.
    cancelFare('Your passenger gave up and walked away.');
    return;
  }
  const d = dist(G.player.x, G.player.y, G.taxi.tx, G.taxi.ty);
  if (d < 70) {
    G.cash += G.taxi.fare;
    AudioSys.cash();
    say('Passenger: Keep the change. Five stars, driver.', 'Passenger');
    spawnParticles(G.player.x, G.player.y, 12, '#7CFC98');
    if (G.taxi.ped) G.taxi.ped.state = 'gone';
    G.taxi.active = false;
    G.taxi.ped = null;
    saveGame();
  }
}

function cancelFare(reason) {
  if (G.taxi.ped) G.taxi.ped.state = 'walk';
  G.taxi.active = false;
  G.taxi.ped = null;
  if (reason) say(reason, '');
}
