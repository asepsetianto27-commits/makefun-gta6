// Solmara Nights — traffic cars that obey lanes, parked cars, pedestrians
// who walk the sidewalks and flee danger, and car-vs-car / car-vs-ped hits.

function makeCar(x, y, angle, kind, model, color) {
  return {
    x, y, angle, speed: 0, kind, model: model || 'sedan',
    color: color || pick(CAR_COLORS),
    maxSpeed: model === 'sport' ? 470 : model === 'van' ? 330 : 400,
    // traffic AI
    road: null, along: 0, dir: 1, lane: 0, wait: 0,
    police: kind === 'police',
    target: null, sirenPhase: false, sirenT: 0,
  };
}

function spawnTrafficCar() {
  const p = randomRoadPoint();
  const car = makeCar(p.x, p.y, p.vertical ? (R() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (R() < 0.5 ? 0 : Math.PI), 'traffic');
  car.road = p;
  car.dir = R() < 0.5 ? 1 : -1;
  car.lane = (R() < 0.5 ? -1 : 1) * 22;
  car.speed = rr(90, 150);
  return car;
}

function initTraffic() {
  G.cars = [];
  for (let i = 0; i < 11; i++) G.cars.push(spawnTrafficCar());
  // Parked cars along the roads, snapped onto the road so none ends up
  // inside a building.
  for (let i = 0; i < 7; i++) {
    const p = randomRoadPoint();
    const parked = makeCar(p.x + (p.vertical ? 34 : 0), p.y + (p.vertical ? 0 : 34),
      p.vertical ? Math.PI / 2 : 0, 'parked', R() < 0.3 ? 'sport' : 'sedan');
    const rp = nearestRoadPoint(parked.x, parked.y);
    parked.x = rp.x + (p.vertical ? 34 : 0);
    parked.y = rp.y + (p.vertical ? 0 : 34);
    G.cars.push(parked);
  }
}

// A sidewalk point on the SAME road as (x, y), so pedestrians walk along
// roads and sidewalks instead of cutting straight across buildings.
function sidewalkPointNear(x, y) {
  const rp = nearestRoadPoint(x, y);
  const off = ROAD_W / 2 + 16;
  if (rp.vertical) {
    return { x: rp.x + (R() < 0.5 ? -off : off), y: clamp(y + rr(-280, 280), 60, WORLD_H - 60) };
  }
  return { x: clamp(x + rr(-280, 280), BEACH_X + 30, WORLD_W - 60), y: rp.y + (R() < 0.5 ? -off : off) };
}

function spawnPed(x, y, kind) {
  const p = { x, y, angle: rr(0, Math.PI * 2), speed: rr(28, 52), kind: kind || 'civilian',
    color: pick(PED_COLORS), tx: x, ty: y, state: 'walk', wait: rr(0, 2),
    fleeX: 0, fleeY: 0, down: 0, shootT: rr(1, 3), scared: 0 };
  const t = sidewalkPointNear(x, y);
  p.tx = t.x; p.ty = t.y;
  return p;
}

function initPeds(n) {
  G.peds = [];
  for (let i = 0; i < (n || 20); i++) {
    const t = randomSidewalkPoint();
    G.peds.push(spawnPed(t.x, t.y));
  }
}

function updateTraffic(dt) {
  for (const car of G.cars) {
    if (car.kind !== 'traffic') continue;
    // Follow the current road; turn at intersections sometimes.
    const vertical = Math.abs(Math.sin(car.angle)) > 0.7;
    let ahead = 99;
    for (const other of G.cars) {
      if (other === car || other.kind === 'parked') continue;
      const d = dist(car.x, car.y, other.x, other.y);
      if (d < 70) {
        const a = angleDiff(car.angle, angleTo(car.x, car.y, other.x, other.y));
        if (Math.abs(a) < 0.6) ahead = Math.min(ahead, d);
      }
    }
    const want = ahead < 70 ? 0 : rr(95, 150);
    car.speed = lerp(car.speed, want, dt * 1.5);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Snap back onto the lane and turn at a crossing road.
    const rp = nearestRoadPoint(car.x, car.y);
    const onX = Math.abs(car.x - rp.x) < 4 || !rp.vertical;
    if (vertical) {
      car.x = lerp(car.x, rp.x + car.lane, dt * 2);
      for (const ry of ROAD_YS) {
        if (Math.abs(car.y - ry) < 6 && R() < 0.25) {
          car.angle = R() < 0.5 ? 0 : Math.PI;
          car.lane = (R() < 0.5 ? -1 : 1) * 22;
          break;
        }
      }
    } else {
      car.y = lerp(car.y, rp.y + car.lane, dt * 2);
      for (const rx of ROAD_XS) {
        if (Math.abs(car.x - rx) < 6 && R() < 0.25) {
          car.angle = R() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
          car.lane = (R() < 0.5 ? -1 : 1) * 22;
          break;
        }
      }
    }
    if (car.x < 340) { car.x = 340; car.angle = 0; }
    if (car.x > WORLD_W - 30) { car.x = WORLD_W - 30; car.angle = Math.PI; }
    if (car.y < 30) { car.y = 30; car.angle = Math.PI / 2; }
    if (car.y > WORLD_H - 30) { car.y = WORLD_H - 30; car.angle = -Math.PI / 2; }
    collideWorld(car, 20);
  }
}

function updatePeds(dt) {
  const px = G.player.x, py = G.player.y;
  const danger = G.player.car ? G.player.car.speed > 120 : false;
  for (const ped of G.peds) {
    if (ped.down > 0) { ped.down -= dt; continue; }
    const dPlayer = dist(ped.x, ped.y, px, py);
    if (ped.kind === 'officer') continue; // officers are driven by police.js
    if (ped.state === 'fare') {
      // Waiting for a taxi: wave when the player drives close in a car.
      if (G.player.car && dPlayer < 90) {
        ped.state = 'boarding';
        say('Taxi! Over here — I need a ride across town!', 'Pedestrian');
      }
      continue;
    }
    if (ped.state === 'boarding') {
      // Walk to the player's car and climb in.
      const car = G.player.car;
      if (!car) { ped.state = 'walk'; continue; }
      ped.angle = angleTo(ped.x, ped.y, car.x, car.y);
      ped.x += Math.cos(ped.angle) * 120 * dt;
      ped.y += Math.sin(ped.angle) * 120 * dt;
      if (dist(ped.x, ped.y, car.x, car.y) < 34) {
        startFareRide(ped);
        ped.state = 'riding';
      }
      continue;
    }
    if (ped.state === 'riding') continue;
    if (danger && dPlayer < 160) {
      ped.state = 'flee';
      ped.fleeX = px; ped.fleeY = py;
      ped.scared = 1.6;
    } else if (ped.state === 'flee') {
      ped.scared -= dt;
      const a = angleTo(ped.fleeX, ped.fleeY, ped.x, ped.y);
      ped.angle = a;
      ped.x += Math.cos(a) * 150 * dt;
      ped.y += Math.sin(a) * 150 * dt;
      collideWorld(ped, 12);
      if (ped.scared <= 0) ped.state = 'walk';
      continue;
    }
    // Stroll to the current sidewalk target, then pick a new one.
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    const d = dist(ped.x, ped.y, ped.tx, ped.ty);
    if (d < 20) {
      const t = sidewalkPointNear(ped.x, ped.y);
      ped.tx = t.x; ped.ty = t.y;
      ped.wait = rr(0, 2.5);
      continue;
    }
    ped.angle = angleTo(ped.x, ped.y, ped.tx, ped.ty);
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    collideWorld(ped, 12);
  }
  // Remove riders that finished (handled by missions) and keep counts healthy.
  G.peds = G.peds.filter((p) => p.state !== 'gone');
}

function nearestCarTo(x, y, maxD) {
  let best = null, bd = maxD;
  for (const car of G.cars) {
    const d = dist(x, y, car.x, car.y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

function nearestPedTo(x, y, maxD, kind) {
  let best = null, bd = maxD;
  for (const ped of G.peds) {
    if (kind && ped.kind !== kind) continue;
    if (ped.state === 'riding' || ped.down > 0) continue;
    const d = dist(x, y, ped.x, ped.y);
    if (d < bd) { bd = d; best = ped; }
  }
  return best;
}

// Simple circle bumps between cars; the player car is handled here too.
function resolveCarCollisions(dt) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 44 && d > 0.01) {
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        const push = (44 - d) / 2;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const hard = Math.abs(a.speed) + Math.abs(b.speed) > 240;
        if (hard) {
          if (a === G.player.car || b === G.player.car) {
            onPlayerCrash(Math.abs(a.speed) + Math.abs(b.speed));
          }
          a.speed *= 0.45; b.speed *= 0.45;
        } else {
          a.speed *= 0.85; b.speed *= 0.85;
        }
      }
    }
  }
}

// Player car hitting a pedestrian: the ped goes down, the law notices.
function checkCarPedHits() {
  const car = G.player.car;
  if (!car) return;
  for (const ped of G.peds) {
    if (ped.down > 0 || ped.state === 'riding' || ped.kind === 'officer') continue;
    if (dist(car.x, car.y, ped.x, ped.y) < 34) {
      if (Math.abs(car.speed) > 70) {
        ped.down = 2.5;
        ped.state = 'flee';
        spawnParticles(ped.x, ped.y, 10, '#ff6b6b');
        addWanted(1, 'hit a pedestrian');
        screenShake(7);
        AudioSys.crash();
        say('Hey! Watch it!', 'Pedestrian');
      } else {
        const a = angleTo(car.x, car.y, ped.x, ped.y);
        ped.x += Math.cos(a) * 30; ped.y += Math.sin(a) * 30;
      }
    }
  }
}

function drawCarShape(c, car) {
  c.save();
  c.translate(car.x, car.y);
  c.rotate(car.angle);
  const len = car.model === 'van' ? 52 : 46;
  const wid = car.model === 'van' ? 26 : 22;
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
  // body
  c.fillStyle = car.color;
  roundRect(c, -len / 2, -wid / 2, len, wid, 7);
  c.fill();
  if (car === G.player.car) {
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 2;
    c.stroke();
  }
  // cabin + windshield (smaller than the body so the paint colour reads)
  c.fillStyle = 'rgba(20,30,40,0.85)';
  roundRect(c, -len / 2 + 12, -wid / 2 + 5, len - 30, wid - 10, 4);
  c.fill();
  c.fillStyle = 'rgba(180,220,255,0.7)';
  c.fillRect(len / 2 - 14, -wid / 2 + 4, 4, wid - 8);
  // headlights
  c.fillStyle = '#fff8c0';
  c.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 5);
  c.fillRect(len / 2 - 2, wid / 2 - 7, 3, 5);
  // police light bar
  if (car.police) {
    const on = Math.floor(performance.now() / 180) % 2 === 0;
    c.fillStyle = on ? '#ff2d2d' : '#2d7dff';
    c.fillRect(-6, -wid / 2 + 2, 12, 5);
    c.fillStyle = on ? '#2d7dff' : '#ff2d2d';
    c.fillRect(-6, wid / 2 - 7, 12, 5);
  }
  c.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
