import { clamp } from "./utils.js";

export const resourceWeights = {
  minerals: 1,
  energy: 3,
  biomass: 4,
  rareGas: 10,
};

export const planets = [
  {
    id: "terra",
    name: "Terra Nova",
    resource: "minerals",
    baseRate: 1.2,
    yieldMult: 1,
    costMult: 1,
    accent: "#2cc4d7",
    bg: "#122649",
  },
  {
    id: "ignis",
    name: "Ignis Prime",
    resource: "energy",
    baseRate: 0.8,
    yieldMult: 1.15,
    costMult: 1.15,
    accent: "#df7b37",
    bg: "#2a1835",
  },
  {
    id: "aqua",
    name: "Aqua Minor",
    resource: "biomass",
    baseRate: 0.9,
    yieldMult: 1.1,
    costMult: 1.1,
    accent: "#43d7b2",
    bg: "#0f2840",
  },
  {
    id: "zephyria",
    name: "Zephyria",
    resource: "rareGas",
    baseRate: 0.35,
    yieldMult: 1.25,
    costMult: 1.35,
    accent: "#6f8dff",
    bg: "#151f53",
  },
];

export const BUILDING_TYPES = ["extractor", "power", "lab", "storage"];

export const constants = {
  alpha: 1.1,
  powerPmax: 0.55,
  powerDecay: 0.88,
  baseCap: 1000,
  capGain: 0.35,
  capExp: 0.85,
  buildGrowth: 1.55,
  extractorUpgradeGrowth: 1.28,
  powerGrowth: 1.25,
  labGrowth: 1.27,
  storageGrowth: 1.22,
  techGrowth: 1.35,
  techDiscountMax: 0.18,
  techDiscountDecay: 0.85,
};

const baseBuild = {
  terra: { minerals: 150 },
  ignis: { minerals: 220, energy: 80 },
  aqua: { minerals: 240, energy: 120 },
  zephyria: { minerals: 300, energy: 180, biomass: 80 },
};

const baseUpgradeExtractor = {
  terra: { minerals: 40 },
  ignis: { minerals: 55, energy: 25 },
  aqua: { minerals: 60, biomass: 25 },
  zephyria: { minerals: 70, rareGas: 18 },
};

const basePower = {
  terra: { minerals: 120 },
  ignis: { minerals: 120, energy: 40 },
  aqua: { minerals: 120, energy: 40 },
  zephyria: { minerals: 140, energy: 55, rareGas: 15 },
};

const baseLab = {
  terra: { minerals: 160 },
  ignis: { minerals: 160, energy: 60 },
  aqua: { minerals: 160, biomass: 60 },
  zephyria: { minerals: 180, biomass: 80, rareGas: 20 },
};

const baseStorage = {
  terra: { minerals: 80 },
  ignis: { minerals: 90, energy: 30 },
  aqua: { minerals: 90, biomass: 30 },
  zephyria: { minerals: 110, rareGas: 25 },
};

export const techDefs = {
  extraction: {
    label: "Extraction Efficiency",
    maxBonus: 1,
    decay: 0.85,
    baseCost: { minerals: 90 },
  },
  energyOpt: {
    label: "Energy Optimization",
    baseCost: { minerals: 120, energy: 45 },
  },
  logistics: {
    label: "Logistics",
    baseCost: { minerals: 140, energy: 35 },
  },
  automation: {
    label: "Automation",
    maxBonus: 0.5,
    decay: 0.9,
    baseCost: { minerals: 160, energy: 50, biomass: 30 },
  },
};

export function roundCost(x) {
  return Math.ceil(x / 5) * 5;
}

export function techDiscount(labLevel) {
  const { techDiscountMax, techDiscountDecay } = constants;
  return techDiscountMax * (1 - techDiscountDecay ** labLevel);
}

export function logisticsCostMult(rank, baseMult) {
  return baseMult * (1 - 0.2 * (1 - 0.88 ** rank));
}

function scaleCostVector(base, scalar) {
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = roundCost(v * scalar);
  }
  return out;
}

export function extractorBuildCost(planet, nPlaced, discount, logisticsRank) {
  const baseMult = logisticsCostMult(logisticsRank, planet.costMult);
  const scalar = constants.buildGrowth ** Math.max(0, nPlaced - 1) * baseMult * (1 - discount);
  return scaleCostVector(baseBuild[planet.id], scalar);
}

export function extractorUpgradeCost(planet, level, discount, logisticsRank) {
  const scalar = constants.extractorUpgradeGrowth ** Math.max(0, level - 1) * logisticsCostMult(logisticsRank, planet.costMult) * (1 - discount);
  return scaleCostVector(baseUpgradeExtractor[planet.id], scalar);
}

export function powerUpgradeCost(planet, level, discount, logisticsRank) {
  const scalar = constants.powerGrowth ** Math.max(0, level - 1) * logisticsCostMult(logisticsRank, planet.costMult) * (1 - discount);
  return scaleCostVector(basePower[planet.id], scalar);
}

export function labUpgradeCost(planet, level, discount, logisticsRank) {
  const scalar = constants.labGrowth ** Math.max(0, level - 1) * logisticsCostMult(logisticsRank, planet.costMult) * (1 - discount);
  return scaleCostVector(baseLab[planet.id], scalar);
}

export function storageUpgradeCost(planet, level, discount, logisticsRank) {
  const scalar = constants.storageGrowth ** Math.max(0, level - 1) * logisticsCostMult(logisticsRank, planet.costMult) * (1 - discount);
  return scaleCostVector(baseStorage[planet.id], scalar);
}

export function techCost(techKey, rank, discount) {
  const def = techDefs[techKey];
  const scalar = constants.techGrowth ** Math.max(0, rank - 1) * (1 - discount);
  return scaleCostVector(def.baseCost, scalar);
}

export function techMultipliers(techs) {
  const extraction = 1 + techDefs.extraction.maxBonus * (1 - techDefs.extraction.decay ** techs.extraction);
  const energy = 1 + 0.6 * (1 - 0.87 ** techs.energyOpt);
  const automation = 1 + techDefs.automation.maxBonus * (1 - techDefs.automation.decay ** techs.automation);
  return { extraction, energy, automation };
}

export function powerBonus(level, energyTechMult = 1) {
  const base = constants.powerPmax * (1 - constants.powerDecay ** level);
  return base * energyTechMult;
}

export function storageCap(level) {
  return constants.baseCap * (1 + constants.capGain * level ** constants.capExp);
}

export function extractorRate({ planet, richness, level, powerMult, extractionTechMult, automationMult }) {
  return planet.baseRate * richness * level ** constants.alpha * planet.yieldMult * powerMult * extractionTechMult * automationMult;
}

export function canUnlockPlanet(state, planetId) {
  if (planetId === "ignis") {
    return state.planets.terra.buildings.lab.level >= 2 && state.metrics.terraProd >= 6 && state.resources.minerals >= 1200;
  }
  if (planetId === "aqua") {
    return state.tech.logistics >= 3 && unlockedPlanetCount(state) >= 2 && state.resources.minerals >= 1800 && state.resources.energy >= 600;
  }
  if (planetId === "zephyria") {
    return unlockedPlanetCount(state) >= 3 && state.tech.extraction >= 6 && state.resources.minerals >= 2500 && state.resources.energy >= 900 && state.resources.biomass >= 700;
  }
  return false;
}

export function payUnlockCost(state, planetId) {
  if (planetId === "ignis") {
    state.resources.minerals -= 1200;
  } else if (planetId === "aqua") {
    state.resources.minerals -= 1800;
    state.resources.energy -= 600;
  } else if (planetId === "zephyria") {
    state.resources.minerals -= 2500;
    state.resources.energy -= 900;
    state.resources.biomass -= 700;
  }
}

export function unlockedPlanetCount(state) {
  return planets.filter((p) => state.planets[p.id].unlocked).length;
}

export function clampResourceToCap(state) {
  for (const key of Object.keys(state.resources)) {
    state.resources[key] = clamp(state.resources[key], 0, state.caps[key]);
  }
}
