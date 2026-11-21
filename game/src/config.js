// Solmara Nights — central tuning and city layout constants.
export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const ROAD_W = 96;
export const BLOCK = 400;
// Vertical road centre lines (x) and horizontal road centre lines (y).
export const ROADS_X = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
export const ROADS_Y = [250, 600, 950, 1300, 1650, 2000];
export const BEACH_Y = 2220; // sand starts here
export const SEA_Y = 2440;   // water starts here
export const COLORS = {
  grass: '#5da24a', grass2: '#548f42', sand: '#e8d29a', sea: '#2f7fb8', sea2: '#2a6ea6',
  road: '#3a3f4a', roadLine: '#e8d44d', sidewalk: '#9aa0a8', buildingRoof: '#7d6a5f',
  park: '#3f8f3a', plaza: '#b9b3a4',
};
export const CAR_COLORS = ['#d33a2c', '#2c6fd3', '#e8b73a', '#e8e8e8', '#222831', '#3aa655', '#8e44ad', '#e67e22', '#16a0a0'];
export const PED_SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8'];
export const MISSION_NAMES = ['First Fare', 'Hot Wheels', 'Heat', 'The Drop'];
export const SAVE_KEY = 'solmara-nights-save-v1';
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.hypot(dx, dy); }
export function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
