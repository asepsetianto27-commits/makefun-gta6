// Solmara Nights — the city of Solmara: roads, blocks, buildings, beach, parks.
// Generation is seeded so every staged screenshot and self-test is reproducible.

function buildWorld(seed) {
  reseed(seed);
  const buildings = [];
  const parks = [];
  const trees = [];
  const xs = [BEACH_X + 40].concat(ROAD_XS, [WORLD_W - 40]);
  const ys = [40].concat(ROAD_YS, [WORLD_H - 40]);
  // Cells between roads: each cell is a city block.
  for (let ci = 0; ci < xs.length - 1; ci++) {
    for (let cj = 0; cj < ys.length - 1; cj++) {
      const x0 = xs[ci] + ROAD_W / 2 + 14;
      const x1 = xs[ci + 1] - ROAD_W / 2 - 14;
      const y0 = ys[cj] + ROAD_W / 2 + 14;
      const y1 = ys[cj + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const isPark = (ci * 7 + cj * 3) % 5 === 2;
      if (isPark) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const n = Math.floor(((x1 - x0) * (y1 - y0)) / 9000);
        for (let t = 0; t < n; t++) {
          trees.push({ x: rr(x0 + 20, x1 - 20), y: rr(y0 + 20, y1 - 20), r: rr(9, 15) });
        }
        continue;
      }
      // One or two buildings per block, with a courtyard gap.
      const split = R() < 0.45 && (x1 - x0) > 260;
      const parts = split ? 2 : 1;
      for (let p = 0; p < parts; p++) {
        const bx = split ? x0 + p * ((x1 - x0) / 2) + 8 : x0 + 10;
        const bw = split ? (x1 - x0) / 2 - 24 : x1 - x0 - 20;
        const bh = (y1 - y0) - rr(20, 70);
        const by = y0 + rr(6, Math.max(8, (y1 - y0) - bh - 6));
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: pick(PALETTE.buildingRoof),
          wall: PALETTE.buildingWall,
          hgt: ri(14, 42),
        });
      }
      if (R() < 0.5) trees.push({ x: rr(x0 + 16, x1 - 16), y: rr(y0 + 16, y1 - 16), r: rr(8, 13) });
    }
  }
  // Named places (fixed, so missions always have a target).
  const garage = { x: 1900, y: 2150, w: 150, h: 110, label: "Rosa's Garage" };
  const plaza = { x: 1400, y: 800, label: 'Palm Plaza' };
  const marina = { x: 420, y: 350, label: 'Marina' };
  const pier = { x: 210, y: 1250, label: 'Solmara Pier' };
  const warehouse = { x: 2900, y: 1700, label: 'Harbor Warehouse' };
  const spawn = { x: 1400, y: 1250 };
  return { buildings, parks, trees, garage, plaza, marina, pier, warehouse, spawn };
}

function onRoad(x, y) {
  for (const rx of ROAD_XS) if (Math.abs(x - rx) <= ROAD_W / 2 + 6) return true;
  for (const ry of ROAD_YS) if (Math.abs(y - ry) <= ROAD_W / 2 + 6) return true;
  return false;
}

function nearestRoadPoint(x, y) {
  let best = null, bd = 1e9;
  for (const rx of ROAD_XS) {
    const d = Math.abs(x - rx);
    if (d < bd) { bd = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of ROAD_YS) {
    const d = Math.abs(y - ry);
    if (d < bd) { bd = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}

// Resolve a circle entity against buildings, the sea and the world border.
function collideWorld(e, r) {
  let hit = false;
  for (const b of G.world.buildings) {
    if (circleRectResolve(e, r, b)) hit = true;
  }
  if (circleRectResolve(e, r, G.world.garage)) hit = true;
  if (e.x < WATER_X + r) { e.x = WATER_X + r; hit = true; }
  if (e.x > WORLD_W - r) { e.x = WORLD_W - r; hit = true; }
  if (e.y < r) { e.y = r; hit = true; }
  if (e.y > WORLD_H - r) { e.y = WORLD_H - r; hit = true; }
  return hit;
}

function randomRoadPoint() {
  if (R() < 0.5) {
    return { x: pick(ROAD_XS) + rr(-ROAD_W / 4, ROAD_W / 4), y: rr(120, WORLD_H - 120), vertical: true };
  }
  return { x: rr(420, WORLD_W - 120), y: pick(ROAD_YS) + rr(-ROAD_W / 4, ROAD_W / 4), vertical: false };
}

function randomSidewalkPoint() {
  const p = randomRoadPoint();
  const off = ROAD_W / 2 + 16;
  if (p.vertical) return { x: p.x + (R() < 0.5 ? -off : off), y: p.y };
  return { x: p.x, y: p.y + (R() < 0.5 ? -off : off) };
}
