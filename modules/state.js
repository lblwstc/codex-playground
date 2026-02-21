import { planets, storageCap } from "./balance.js";
import { generatePlanetMap } from "./mapgen.js";

export const SAVE_VERSION = 1;

function planetTemplate(planet) {
  return {
    unlocked: planet.id === "terra",
    seed: `${planet.id}-001`,
    map: generatePlanetMap(planet.id, `${planet.id}-001`),
    buildings: {
      extractors: [],
      power: { placed: false, x: -1, y: -1, level: 0 },
      lab: { placed: false, x: -1, y: -1, level: 0 },
      storage: { placed: false, x: -1, y: -1, level: 0 },
    },
  };
}

export function createNewState() {
  const state = {
    version: SAVE_VERSION,
    lastSeen: Date.now(),
    activePlanetId: "terra",
    resources: { minerals: 500, energy: 0, biomass: 0, rareGas: 0 },
    caps: { minerals: storageCap(0), energy: storageCap(0), biomass: storageCap(0), rareGas: storageCap(0) },
    tech: { extraction: 0, energyOpt: 0, logistics: 0, automation: 0 },
    settings: {
      reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    },
    ui: {
      currentTab: "planet",
      placeMode: null,
      ghostTile: null,
      selectedTile: null,
      message: "Welcome Commander",
      invalidPulseUntil: 0,
      resourcePulse: 0,
    },
    metrics: {
      terraProd: 0,
      totalProdByRes: { minerals: 0, energy: 0, biomass: 0, rareGas: 0 },
    },
    planets: {},
    camera: {
      x: 0,
      y: 0,
      zoom: 1,
    },
  };

  for (const planet of planets) {
    state.planets[planet.id] = planetTemplate(planet);
  }

  return state;
}
