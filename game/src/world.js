// Solmara Nights — the city itself: roads, blocks, buildings, beach, parks.
// One clear job: build Solmara once from a seed and answer "what is here?" queries.
import {
  WORLD_W, WORLD_H, ROAD_W, VERTICAL_ROADS, HORIZONTAL_ROADS,
  WATER_WEST, SAND_WEST, RIVER_EAST, COLORS,
} from './config.js';
import { mulberry32, randRange, pick, circleRectResolve } from './util.js';

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const parks = [];
  const trees = [];
  const lamps = [];

  // Buildings fill the blocks between roads. Two named park blocks stay green.
  const parkBlocks = [
    { col: 2, row: 1 },
    { col: 4, row: 3 },
  ];
  for (let ci = 0; ci < VERTICAL_ROADS.length - 1; ci++) {
    for (let ri = 0; ri < HORIZONTAL_ROADS.length - 1; ri++) {
      const x0 = VERTICAL_ROADS[ci] + ROAD_W / 2 + 14;
      const y0 = HORIZONTAL_ROADS[ri] + ROAD_W / 2 + 14;
      const x1 = VERTICAL_ROADS[ci + 1] - ROAD_W / 2 - 14;
      const y1 = HORIZONTAL_ROADS[ri + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      if (parkBlocks.some((p) => p.col === ci && p.row === ri)) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let t = 0; t < 9; t++) {
          trees.push({
            x: randRange(rng, x0 + 14, x1 - 14),
            y: randRange(rng, y0 + 14, y1 - 14),
            r: randRange(rng, 10, 16),
          });
        }
        continue;
      }
      const n = 1 + Math.floor(rng() * 2);
      for (let b = 0; b < n; b++) {
        const bw = randRange(rng, 90, 170);
        const bh = randRange(rng, 70, 130);
        const bx = randRange(rng, x0, Math.max(x0 + 1, x1 - bw));
        const by = randRange(rng, y0, Math.max(y0 + 1, y1 - bh));
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          roof: pick(rng, COLORS.buildingRoof),
          tall: rng() < 0.3,
        });
      }
      // A couple of street trees on each block corner.
      trees.push({ x: x0 + 8, y: y0 + 8, r: 11 });
      trees.push({ x: x1 - 8, y: y1 - 8, r: 11 });
    }
  }

  // Marina and garage landmarks for the story missions.
  const marina = { x: 300, y: 2100, w: 150, h: 90 };
  const garage = { x: 2600, y: 1700, w: 170, h: 100 };
  const dropoff = { x: 2650, y: 350 };
  const packageSpot = { x: 420, y: 700 };
  const clientSpot = { x: 740, y: 1150 };

  // Lamp posts along the main avenue for night lighting.
  for (const y of HORIZONTAL_ROADS) {
    for (const x of VERTICAL_ROADS) {
      lamps.push({ x: x + ROAD_W / 2 + 8, y: y + ROAD_W / 2 + 8 });
    }
  }

  return { seed, buildings, parks, trees, lamps, marina, garage, dropoff, packageSpot, clientSpot };
}

export function isOnRoad(x, y) {
  if (x < SAND_WEST) return false;
  for (const rx of VERTICAL_ROADS) {
    if (Math.abs(x - rx) < ROAD_W / 2) return true;
  }
  for (const ry of HORIZONTAL_ROADS) {
    if (Math.abs(y - ry) < ROAD_W / 2) return true;
  }
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of VERTICAL_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of HORIZONTAL_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}

export function inWater(x, y) {
  if (x < WATER_WEST) return true;
  if (x > RIVER_EAST) return true;
  return false;
}

export function onSand(x, y) {
  return x >= WATER_WEST && x < SAND_WEST;
}

// Keep an entity out of buildings, water and the map edge. Returns 'building' | 'water' | null.
export function collideWorld(p, r, world) {
  let hit = null;
  for (const b of world.buildings) {
    if (circleRectResolve(p, r, b)) hit = 'building';
  }
  if (p.x < WATER_WEST + r) { p.x = WATER_WEST + r; hit = hit || 'water'; }
  if (p.x > RIVER_EAST - r) { p.x = RIVER_EAST - r; hit = hit || 'water'; }
  if (p.x < r) p.x = r;
  if (p.x > WORLD_W - r) p.x = WORLD_W - r;
  if (p.y < r) p.y = r;
  if (p.y > WORLD_H - r) p.y = WORLD_H - r;
  return hit;
}

export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    return { x: pick(rng, VERTICAL_ROADS), y: randRange(rng, 120, WORLD_H - 120) };
  }
  return { x: randRange(rng, 320, WORLD_W - 320), y: pick(rng, HORIZONTAL_ROADS) };
}
