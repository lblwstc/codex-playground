import { hydrateState } from './state.js';
import { runTick, TICK_DT } from './sim.js';

const KEY = 'planet-hauler-save-v1';
const OFFLINE_CAP_S = 8 * 60 * 60;

export const loadGame = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return hydrateState(null);
    const data = JSON.parse(raw);
    const state = hydrateState(data);
    const elapsed = Math.max(0, (Date.now() - (state.lastSaveAt || Date.now())) / 1000);
    const offline = Math.min(elapsed, OFFLINE_CAP_S);
    const steps = Math.floor(offline / TICK_DT);
    for (let i = 0; i < steps; i += 1) runTick(state);
    if (steps > 0) state.ui.toast = `Offline progress applied: ${(offline / 60).toFixed(1)} min`;
    return state;
  } catch {
    return hydrateState(null);
  }
};

export const saveGame = (state) => {
  const snapshot = JSON.parse(JSON.stringify({
    time: state.time,
    resources: state.resources,
    rates: state.rates,
    mothership: state.mothership,
    planets: state.planets,
    ships: state.ships,
    selected: state.selected,
    unlockedTech: state.unlockedTech,
    flags: state.flags,
    modifiers: state.modifiers,
    lastSaveAt: Date.now()
  }));
  localStorage.setItem(KEY, JSON.stringify(snapshot));
  state.lastSaveAt = Date.now();
};
