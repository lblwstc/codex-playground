import { tick } from "./sim.js";

const KEY = "star-hauler-save-v1";

export function saveGame(state) {
  state.lastSaveAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function resetSave() {
  localStorage.removeItem(KEY);
}

export function applyOfflineProgress(state) {
  const elapsedMs = Date.now() - (state.lastSaveAt || Date.now());
  const capped = Math.min(elapsedMs, 8 * 3600_000);
  const ticks = Math.floor(capped / 100);
  for (let i = 0; i < ticks; i++) tick(state);
}
