// Solmara Nights — small math and random helpers (seeded, deterministic).

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let R = mulberry32(1);

function reseed(seed) {
  R = mulberry32(seed >>> 0 || 1);
}

function rr(a, b) {
  return a + R() * (b - a);
}

function ri(a, b) {
  return Math.floor(rr(a, b + 1));
}

function pick(arr) {
  return arr[Math.floor(R() * arr.length)];
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function angleLerp(a, b, t) {
  return a + angleDiff(a, b) * t;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// Push a circle out of a rectangle. Returns true when a collision happened.
function circleRectResolve(e, r, rect) {
  const cx = clamp(e.x, rect.x, rect.x + rect.w);
  const cy = clamp(e.y, rect.y, rect.y + rect.h);
  const dx = e.x - cx, dy = e.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    e.x = cx + (dx / d) * r;
    e.y = cy + (dy / d) * r;
  } else {
    e.x += r;
  }
  return true;
}

function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function fmtCash(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
