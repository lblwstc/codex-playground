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
  const totalTicks = Math.floor(capped / 100);
  const SIM_LIMIT = 3000;
  const ticksToRun = Math.min(totalTicks, SIM_LIMIT);
  for (let i = 0; i < ticksToRun; i++) tick(state);
  const remaining = totalTicks - ticksToRun;
  if (remaining > 0) {
    const dt = remaining * 0.1;
    for (const p of state.planets) {
      if (!p.unlocked) continue;
      const base = 0.9 * p.richness * p.extractorLevel * p.extractorSlots * state.modifiers.extractorOutput * dt;
      for (const item of (p.resourceProfile || [])) {
        p.buffer[item.id] += base * item.share;
      }
    }
  }
}
