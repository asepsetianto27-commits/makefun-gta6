// Solmara Nights — save system (localStorage): cash, story progress,
// health, pistol, position and clock. Continue appears on the start screen.

function saveGame() {
  if (!G) return;
  try {
    const data = {
      cash: Math.round(G.cash),
      missionIndex: G.missionIndex,
      health: Math.round(G.player.health),
      hasPistol: G.hasPistol,
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
      clockMin: Math.round(G.clockMin),
      wanted: G.wanted,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) {
    // Private mode or no storage: the game still plays, it just won't save.
  }
}

function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch (err) {
    return null;
  }
}

function hasSave() {
  return loadSaveData() !== null;
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
}
