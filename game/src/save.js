// localStorage save / load for Solmara Nights.
import { SAVE_KEY } from './config.js';

export function saveGame(game) {
  try {
    const data = {
      cash: game.player.cash, missionIndex: game.missions.index,
      completed: game.missions.completed,
      x: game.player.x, y: game.player.y, health: game.player.health,
      hasGun: game.player.hasGun, clock: game.clock, reputation: game.reputation,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
