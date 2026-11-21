// Solmara Nights — story missions and the taxi side activity.
// One clear job: the 4-mission story arc, objectives, timers, dialogue and payouts.
import { MISSION_DEFS } from './config.js';
import { dist, randRange } from './util.js';
import { nearestRoadPoint } from './world.js';
import { showMessage, showDialogue, addFloater, spawnParticles } from './state.js';
import { makeCar } from './traffic.js';
import { addWanted } from './police.js';

export function missionObjective(S) {
  if (S.mission) return S.mission.objective;
  if (S.missionIndex >= 4) return 'Solmara is yours. Free roam — take fares, steal cars, stay out of trouble.';
  return 'Talk to Mama Rosa: press M for the mission list, then start mission ' + (S.missionIndex + 1);
}

export function missionMarker(S) {
  if (!S.mission) return null;
  return { x: S.mission.tx, y: S.mission.ty, label: S.mission.markerLabel };
}

export function startMission(S, index, audio) {
  const def = MISSION_DEFS[index];
  if (!def) return false;
  const w = S.world;
  const m = { def, index, objective: def.objective, timer: def.timeLimit, stage: 0, tx: 0, ty: 0, markerLabel: '', car: null };
  if (index === 0) {
    // Client waits at the kerb; drive them to the north-east drop-off.
    m.tx = w.clientSpot.x; m.ty = w.clientSpot.y; m.markerLabel = 'CLIENT';
    m.stage = 0; // 0 = pick up client, 1 = drive to drop-off
    m.objective = 'Pick up the client at the marker';
  } else if (index === 1) {
    // The red Comet waits by the marina.
    const comet = makeCar(S, w.marina.x + 60, w.marina.y + 30, -Math.PI / 2, {
      color: '#d21f2b', type: 'sport', driver: 'parked',
    });
    comet.hp = 120;
    m.car = comet;
    m.tx = comet.x; m.ty = comet.y; m.markerLabel = 'COMET';
    m.stage = 0; // 0 = steal Comet, 1 = deliver to garage
    m.objective = 'Steal the red Comet at the marina';
  } else if (index === 2) {
    addWanted(S, 3);
    m.tx = S.player.x; m.ty = S.player.y; m.markerLabel = 'HIDE';
    m.stage = 0;
    m.objective = 'Lose the 3-star wanted level — stay out of sight';
  } else if (index === 3) {
    S.packageTaken = false;
    m.tx = w.packageSpot.x; m.ty = w.packageSpot.y; m.markerLabel = 'PACKAGE';
    m.stage = 0; // 0 = grab package, 1 = deliver across town
    m.objective = 'Pick up the package at the marker';
  }
  S.mission = m;
  S.missionTimer = def.timeLimit;
  showDialogue(S, ['MAMA ROSA: ' + def.briefing, def.title + ' — ' + def.objective], 6);
  showMessage(S, 'Mission started: ' + def.title, 3);
  if (audio) audio.blip(660, 0.15, 'triangle', 0.12);
  return true;
}

function completeMission(S, audio) {
  const def = S.mission.def;
  const payout = [300, 500, 400, 800][S.mission.index];
  S.cash += payout;
  S.stats.earned += payout;
  S.reputation += 25;
  S.missionIndex++;
  showMessage(S, 'Mission complete: ' + def.title + '  +' + '$' + payout, 4);
  showDialogue(S, ['MAMA ROSA: Good work, Jax. ' + (S.missionIndex >= 4 ? 'Your debt is gone.' : 'One more job and we are square.'), 'Earned $' + payout], 5);
  addFloater(S, S.player.x, S.player.y - 30, '+$' + payout, '#7dff8a');
  if (audio) audio.missionDone();
  S.mission = null;
  if (S.missionIndex >= 4) {
    S.mode = 'done';
    S.endStats = { cash: S.cash, earned: S.stats.earned, stolen: S.stats.carsStolen, fares: S.stats.faresDone };
  } else {
    S.mode = 'missiondone';
  }
}

function failMission(S, reason) {
  showMessage(S, 'Mission failed: ' + reason + ' — try again (press M).', 4);
  showDialogue(S, ['MAMA ROSA: ' + reason + ' Come back when you are ready.'], 5);
  S.mission = null;
  S.wanted = Math.min(S.wanted, 1);
}

export function updateMissions(S, dt, audio) {
  const m = S.mission;
  if (!m) return;
  S.missionTimer -= dt;
  if (S.missionTimer <= 0) {
    failMission(S, 'Out of time on "' + m.def.title + '"');
    return;
  }
  const p = S.player;
  if (m.index === 0) {
    if (m.stage === 0) {
      if (dist(p.x, p.y, m.tx, m.ty) < 70) {
        m.stage = 1;
        m.tx = S.world.dropoff.x; m.ty = S.world.dropoff.y; m.markerLabel = 'DROP-OFF';
        m.objective = 'Drive the client to the drop-off — ' + Math.ceil(S.missionTimer) + 's left';
        showDialogue(S, ['CLIENT: Nice wheels. The north-east corner, fast — I am late.'], 4);
      }
    } else if (dist(p.x, p.y, m.tx, m.ty) < 80 && p.car) {
      completeMission(S, audio);
    }
  } else if (m.index === 1) {
    if (m.stage === 0) {
      if (p.car === m.car) {
        m.stage = 1;
        m.tx = S.world.garage.x; m.ty = S.world.garage.y; m.markerLabel = 'GARAGE';
        m.objective = 'Deliver the Comet to the garage — avoid the police';
        showDialogue(S, ['MAMA ROSA: That is my car now. Garage, east side. Quietly.'], 4);
      }
    } else if (dist(p.x, p.y, m.tx, m.ty) < 90 && p.car === m.car) {
      completeMission(S, audio);
    }
  } else if (m.index === 2) {
    m.objective = 'Lose the wanted level — hide until the stars fade';
    if (S.wanted === 0) completeMission(S, audio);
  } else if (m.index === 3) {
    if (m.stage === 0) {
      if (dist(p.x, p.y, m.tx, m.ty) < 70) {
        S.packageTaken = true;
        m.stage = 1;
        m.tx = S.world.dropoff.x; m.ty = S.world.dropoff.y; m.markerLabel = 'DROP-OFF';
        m.objective = 'Deliver the package — the police are on you';
        addWanted(S, 2);
        showDialogue(S, ['MAMA ROSA: Package is hot. Do not stop for anyone.'], 4);
      }
    } else if (dist(p.x, p.y, m.tx, m.ty) < 80) {
      completeMission(S, audio);
    }
  }
}

// --- Taxi side activity -------------------------------------------------
export function updateTaxi(S, dt, audio) {
  const p = S.player;
  if (!S.taxi) {
    S.taxiCooldown -= dt;
    if (S.taxiCooldown <= 0 && S.mode === 'play') {
      // A pedestrian flags a cab: a "$" marker appears near the player.
      const rp = nearestRoadPoint(p.x + randRange(S.rng, -450, 450), p.y + randRange(S.rng, -450, 450));
      S.taxi = { stage: 'wait', x: rp.x, y: rp.y, tx: 0, ty: 0, fare: 40 + Math.floor(S.rng() * 5) * 10, timer: 60 };
      showMessage(S, 'Taxi fare nearby — drive to the $ marker and pick up the passenger.', 3);
    }
    return;
  }
  const t = S.taxi;
  t.timer -= dt;
  if (t.timer <= 0) {
    showMessage(S, 'The taxi passenger gave up and walked away.', 2.5);
    S.taxi = null;
    S.taxiCooldown = 8;
    return;
  }
  if (t.stage === 'wait') {
    if (p.car && dist(p.x, p.y, t.x, t.y) < 80) {
      t.stage = 'ride';
      const rp = nearestRoadPoint(p.x + randRange(S.rng, -900, 900), p.y + randRange(S.rng, -900, 900));
      t.tx = rp.x; t.ty = rp.y;
      t.timer = 75;
      showDialogue(S, ['PASSENGER: Take me to the marker. Keep the meter running, driver.'], 4);
    }
  } else if (dist(p.x, p.y, t.tx, t.ty) < 80 && p.car) {
    S.cash += t.fare;
    S.stats.earned += t.fare;
    S.stats.faresDone++;
    addFloater(S, p.x, p.y - 30, '+$' + t.fare + ' fare', '#7dff8a');
    showMessage(S, 'Fare complete! +$' + t.fare, 3);
    if (audio) audio.pickup();
    S.taxi = null;
    S.taxiCooldown = 10;
  }
}
