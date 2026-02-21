import { createNewState, SAVE_VERSION } from "./state.js";
import { generatePlanetMap } from "./mapgen.js";

const KEY = "planetary_dominion_save";

export function saveGame(state) {
  const payload = {
    version: SAVE_VERSION,
    lastSeen: Date.now(),
    activePlanetId: state.activePlanetId,
    resources: state.resources,
    caps: state.caps,
    tech: state.tech,
    settings: state.settings,
    planets: Object.fromEntries(
      Object.entries(state.planets).map(([id, p]) => [
        id,
        {
          unlocked: p.unlocked,
          seed: p.seed,
          buildings: p.buildings,
        },
      ])
    ),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadGame() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return createNewState();
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== SAVE_VERSION) throw new Error("version mismatch");

    const state = createNewState();
    state.lastSeen = parsed.lastSeen || Date.now();
    state.activePlanetId = parsed.activePlanetId || "terra";
    state.resources = { ...state.resources, ...(parsed.resources || {}) };
    state.caps = { ...state.caps, ...(parsed.caps || {}) };
    state.tech = { ...state.tech, ...(parsed.tech || {}) };
    state.settings = { ...state.settings, ...(parsed.settings || {}) };

    for (const [id, p] of Object.entries(parsed.planets || {})) {
      if (!state.planets[id]) continue;
      state.planets[id].unlocked = !!p.unlocked;
      state.planets[id].seed = p.seed || state.planets[id].seed;
      state.planets[id].map = generatePlanetMap(id, state.planets[id].seed);
      state.planets[id].buildings = p.buildings || state.planets[id].buildings;
    }
    return state;
  } catch {
    return createNewState();
  }
}

export function exportSave(state) {
  const data = localStorage.getItem(KEY);
  return data || JSON.stringify(state);
}

export function importSave(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object") throw new Error("invalid");
    localStorage.setItem(KEY, JSON.stringify(parsed));
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid JSON save" };
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
