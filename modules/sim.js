import {
  planets,
  techDiscount,
  techMultipliers,
  powerBonus,
  storageCap,
  extractorRate,
  extractorBuildCost,
  extractorUpgradeCost,
  powerUpgradeCost,
  labUpgradeCost,
  storageUpgradeCost,
  techCost,
  canUnlockPlanet,
  payUnlockCost,
  clampResourceToCap,
} from "./balance.js";
import { tileIndex } from "./mapgen.js";
import { RES_KEYS } from "./utils.js";

export function getPlanet(state, planetId = state.activePlanetId) {
  return planets.find((p) => p.id === planetId);
}

export function recalcCaps(state) {
  const base = { minerals: 1000, energy: 1000, biomass: 1000, rareGas: 1000 };
  for (const planet of planets) {
    const pState = state.planets[planet.id];
    base[planet.resource] = storageCap(pState.buildings.storage.level);
  }
  state.caps = base;
  clampResourceToCap(state);
}

export function getResourcePerSecond(state) {
  const rates = { minerals: 0, energy: 0, biomass: 0, rareGas: 0 };
  const techMults = techMultipliers(state.tech);

  for (const planet of planets) {
    const pState = state.planets[planet.id];
    if (!pState.unlocked) continue;

    const powerLvl = pState.buildings.power.level;
    const powerMult = 1 + powerBonus(powerLvl, techMults.energy);

    for (const ext of pState.buildings.extractors) {
      const tile = pState.map.tiles[tileIndex(ext.x, ext.y)];
      if (!tile || tile.type !== "node") continue;
      rates[planet.resource] += extractorRate({
        planet,
        richness: tile.richness,
        level: ext.level,
        powerMult,
        extractionTechMult: techMults.extraction,
        automationMult: techMults.automation,
      });
    }
  }

  state.metrics.terraProd = rates.minerals;
  state.metrics.totalProdByRes = rates;
  return rates;
}

export function tick(state, dtSec) {
  const rates = getResourcePerSecond(state);
  for (const r of RES_KEYS) {
    state.resources[r] = Math.min(state.caps[r], state.resources[r] + rates[r] * dtSec);
  }
}

export function applyOfflineProgress(state) {
  const now = Date.now();
  const dt = Math.min(12 * 3600, Math.max(0, (now - state.lastSeen) / 1000));
  if (dt > 0) tick(state, dt);
  state.lastSeen = now;
  return dt;
}

function canAfford(state, cost) {
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}

function spend(state, cost) {
  for (const [k, v] of Object.entries(cost)) state.resources[k] -= v;
}

export function tryPlaceBuilding(state, planetId, x, y, type) {
  const planet = getPlanet(state, planetId);
  const pState = state.planets[planetId];
  const tile = pState.map.tiles[tileIndex(x, y)];
  if (!tile) return { ok: false, reason: "out" };

  if (pState.buildings.extractors.some((b) => b.x === x && b.y === y)) return { ok: false, reason: "occupied" };
  for (const t of ["power", "lab", "storage"]) {
    const b = pState.buildings[t];
    if (b.placed && b.x === x && b.y === y) return { ok: false, reason: "occupied" };
  }

  const discount = techDiscount(pState.buildings.lab.level);
  const logistics = state.tech.logistics;
  if (type === "extractor") {
    if (tile.type !== "node") return { ok: false, reason: "needsNode" };
    const cost = extractorBuildCost(planet, pState.buildings.extractors.length + 1, discount, logistics);
    if (!canAfford(state, cost)) return { ok: false, reason: "cost", cost };
    spend(state, cost);
    pState.buildings.extractors.push({ x, y, level: 1 });
    return { ok: true, cost };
  }

  if (tile.type !== "empty") return { ok: false, reason: "needsEmpty" };
  const slot = pState.buildings[type];
  if (!slot || slot.placed) return { ok: false, reason: "exists" };

  const level = 1;
  const costByType = {
    power: powerUpgradeCost,
    lab: labUpgradeCost,
    storage: storageUpgradeCost,
  };
  const cost = costByType[type](planet, level, discount, logistics);
  if (!canAfford(state, cost)) return { ok: false, reason: "cost", cost };
  spend(state, cost);
  pState.buildings[type] = { placed: true, x, y, level };
  recalcCaps(state);
  return { ok: true, cost };
}

export function tryUpgrade(state, planetId, type, idx = -1) {
  const pState = state.planets[planetId];
  const planet = getPlanet(state, planetId);
  const discount = techDiscount(pState.buildings.lab.level);
  const logistics = state.tech.logistics;

  if (type === "extractor") {
    const ext = pState.buildings.extractors[idx];
    if (!ext || ext.level >= 10) return { ok: false };
    const cost = extractorUpgradeCost(planet, ext.level, discount, logistics);
    if (!canAfford(state, cost)) return { ok: false, cost };
    spend(state, cost);
    ext.level += 1;
    return { ok: true, cost };
  }

  const b = pState.buildings[type];
  if (!b.placed || b.level >= 10) return { ok: false };
  const fns = { power: powerUpgradeCost, lab: labUpgradeCost, storage: storageUpgradeCost };
  const cost = fns[type](planet, b.level + 1, discount, logistics);
  if (!canAfford(state, cost)) return { ok: false, cost };
  spend(state, cost);
  b.level += 1;
  if (type === "storage") recalcCaps(state);
  return { ok: true, cost };
}

export function tryBuyTech(state, key) {
  const rank = state.tech[key];
  if (rank >= 10) return { ok: false };
  const terraLab = state.planets.terra.buildings.lab.level;
  const cost = techCost(key, rank + 1, techDiscount(terraLab));
  if (!canAfford(state, cost)) return { ok: false, cost };
  spend(state, cost);
  state.tech[key] += 1;
  return { ok: true, cost };
}

export function tryUnlock(state, planetId) {
  if (state.planets[planetId].unlocked) return { ok: false };
  if (!canUnlockPlanet(state, planetId)) return { ok: false };
  payUnlockCost(state, planetId);
  state.planets[planetId].unlocked = true;
  return { ok: true };
}
