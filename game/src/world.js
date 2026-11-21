// Solmara city generation: roads, building blocks, park, plaza, beach.
import { WORLD_W, WORLD_H, ROADS_X, ROADS_Y, ROAD_W, BEACH_Y, SEA_Y } from './config.js';
import { makeRng, pick, range, int } from './rng.js';

export class World {
  constructor(seed) {
    this.rng = makeRng(seed);
    this.buildings = [];
    this.parks = [];
    this.trees = [];
    this.lamps = [];
    this.build();
  }
  build() {
    const rng = this.rng;
    // Buildings fill the blocks between roads (skip beach strip and park block).
    for (let ix = 0; ix < ROADS_X.length - 1; ix++) {
      for (let iy = 0; iy < ROADS_Y.length - 1; iy++) {
        const x0 = ROADS_X[ix] + ROAD_W / 2 + 14, x1 = ROADS_X[ix + 1] - ROAD_W / 2 - 14;
        const y0 = ROADS_Y[iy] + ROAD_W / 2 + 14, y1 = ROADS_Y[iy + 1] - ROAD_W / 2 - 14;
        if (y0 > BEACH_Y - 40) continue;
        if (ix === 2 && iy === 2) { // central park block
          this.parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
          continue;
        }
        if (ix === 5 && iy === 0) { // plaza block
          this.parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, plaza: true });
          continue;
        }
        // 1-4 buildings per block
        const n = int(rng, 1, 3);
        for (let k = 0; k < n; k++) {
          const w = range(rng, 90, Math.min(200, (x1 - x0) / n));
          const h = range(rng, 80, Math.min(180, y1 - y0));
          const bx = x0 + ((x1 - x0) / n) * k + range(rng, 4, 20);
          const by = y0 + range(rng, 4, Math.max(5, (y1 - y0) - h - 8));
          const bw = Math.min(w, x1 - bx - 6), bh = Math.min(h, y1 - by - 6);
          if (bw < 50 || bh < 40) continue;
          this.buildings.push({
            x: bx, y: by, w: bw, h: bh,
            height: int(rng, 1, 6),
            hue: pick(rng, ['#b08968', '#8d99ae', '#c9ada7', '#a3b18a', '#e0a458', '#7d8597', '#d6a419', '#e07a5f']),
            roof: pick(rng, ['#6d597a', '#355070', '#6a994e', '#9c6644', '#5f6c7b']),
          });
        }
      }
    }
    // Trees in parks and along sidewalks
    for (const p of this.parks) {
      const n = p.plaza ? 4 : 12;
      for (let i = 0; i < n; i++) this.trees.push({ x: range(rng, p.x + 15, p.x + p.w - 15), y: range(rng, p.y + 15, p.y + p.h - 15), r: range(rng, 10, 18) });
    }
    for (let i = 0; i < 90; i++) {
      const rx = pick(rng, ROADS_X), ry = range(rng, 120, BEACH_Y - 60);
      this.trees.push({ x: rx + (rng() < 0.5 ? -ROAD_W / 2 - 12 : ROAD_W / 2 + 12), y: ry, r: range(rng, 8, 14) });
    }
    // Street lamps at intersections
    for (const rx of ROADS_X) for (const ry of ROADS_Y) this.lamps.push({ x: rx + ROAD_W / 2 + 6, y: ry - ROAD_W / 2 - 6 });
  }
  onRoad(x, y) {
    for (const rx of ROADS_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
    for (const ry of ROADS_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
    return false;
  }
  inSea(x, y) { return y > SEA_Y; }
  inSand(x, y) { return y > BEACH_Y && y <= SEA_Y; }
  // Resolve a circle (x,y,r) out of buildings; returns corrected position.
  collide(x, y, r) {
    let nx = x, ny = y;
    for (const b of this.buildings) {
      const cx = Math.max(b.x, Math.min(nx, b.x + b.w));
      const cy = Math.max(b.y, Math.min(ny, b.y + b.h));
      const dx = nx - cx, dy = ny - cy, d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 > 0.001) { const d = Math.sqrt(d2); nx = cx + (dx / d) * r; ny = cy + (dy / d) * r; }
        else { nx += r; }
      }
    }
    nx = Math.max(20, Math.min(WORLD_W - 20, nx));
    ny = Math.max(20, Math.min(WORLD_H - 20, ny));
    return { x: nx, y: ny };
  }
  hitsBuilding(x, y, r) {
    for (const b of this.buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }
  nearestRoadPoint(x, y) {
    let best = null, bd = 1e9;
    for (const rx of ROADS_X) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y, axis: 'v' }; } }
    for (const ry of ROADS_Y) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry, axis: 'h' }; } }
    return best;
  }
}
