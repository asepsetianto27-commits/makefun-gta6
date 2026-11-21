// Solmara Nights — save and load through localStorage.
// One clear job: persist cash, progress and position; restore them on Continue.
import { SAVE_KEY } from './config.js';

export function saveGame(S) {
  try {
    const data = {
      cash: S.cash,
      health: S.health,
      missionIndex: S.missionIndex,
      reputation: S.reputation,
      x: S.player.x,
      y: S.player.y,
      clock: S.clock,
      stats: S.stats,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    S.saveExists = true;
    return true;
  } catch (e) {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function applySave(S, data) {
  if (!data) return false;
  S.cash = data.cash || 0;
  S.health = data.health || 100;
  S.missionIndex = data.missionIndex || 0;
  S.reputation = data.reputation || 0;
  S.player.x = data.x || S.player.x;
  S.player.y = data.y || S.player.y;
  S.clock = data.clock || 17.2;
  if (data.stats) S.stats = data.stats;
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
  return true;
}

export function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}
