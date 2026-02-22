import { INDUSTRIES, PLANET_TEMPLATES, RESOURCES } from "./content.js";

const RESOURCE_IDS = Object.keys(RESOURCES);
const PLANET_LIMIT = 20;

function resourceMap(initial = 0) {
  return Object.fromEntries(RESOURCE_IDS.map(id => [id, initial]));
}

function resourcesUnlockedByPlanet(index) {
  return RESOURCE_IDS.filter(id => RESOURCES[id].unlockPlanet <= index);
}

function unlockCostForPlanet(index) {
  if (index === 0) return resourceMap(0);
  const known = resourcesUnlockedByPlanet(index - 1);
  const base = 60 + index * 28;
  const cost = resourceMap(0);
  known.forEach((id, i) => {
    const rarity = 1 + i * 0.42;
    cost[id] = Math.floor((base * rarity) / Math.max(1.15, known.length * 0.45));
  });
  return cost;
}

function makeResourceProfile(template, index) {
  const unlocked = resourcesUnlockedByPlanet(index);
  const weighted = [];
  template.affinities.forEach((id, i) => {
    if (unlocked.includes(id)) weighted.push({ id, weight: Math.max(0.2, 0.62 - i * 0.16) });
  });
  if (!weighted.length) weighted.push({ id: unlocked[0], weight: 1 });

  const extras = unlocked.filter(id => !weighted.some(w => w.id === id));
  if (extras.length && index > 0) {
    const seed = (index * 7) % extras.length;
    weighted.push({ id: extras[seed], weight: 0.22 + (index % 3) * 0.05 });
  }

  const total = weighted.reduce((sum, x) => sum + x.weight, 0);
  return weighted.map(x => ({ id: x.id, share: x.weight / total }));
}

function createPlanet(index) {
  const tpl = PLANET_TEMPLATES[index % PLANET_TEMPLATES.length];
  return {
    id: `planet-${index}`,
    name: `${tpl.type[0].toUpperCase()}${tpl.type.slice(1)}-${index + 1}`,
    ...tpl,
    resourceProfile: makeResourceProfile(tpl, index),
    distance: 150 + index * 52,
    angle: (Math.PI * 2 * index) / PLANET_LIMIT,
    unlocked: index === 0,
    unlockCost: unlockCostForPlanet(index),
    extractorLevel: 1,
    extractorSlots: 1 + Math.floor(index / 3),
    buffer: resourceMap(0),
    colony: { established: false, population: 0, industries: Object.fromEntries(Object.keys(INDUSTRIES).map(k => [k, 0])) },
  };
}

/** @returns {import('./types').GameState|any} */
export function createInitialState() {
  const now = Date.now();
  const planets = Array.from({ length: PLANET_LIMIT }, (_, i) => createPlanet(i));

  return {
    version: 3,
    time: now,
    lastSaveAt: now,
    resources: { ...resourceMap(0), ore: 110, water: 40, bio: 30, energy: 30 },
    rates: resourceMap(0),
    storageCap: resourceMap(650),
    mothership: { x: 0, y: 0, count: 1, tier: 1 },
    planets,
    ships: [makeShip(0)],
    nextShipId: 1,
    selected: { kind: "mothership", id: "mothership" },
    modifiers: { shipSpeed: 1, shipCapacity: 0, dockTime: 1, extractorOutput: 1, routeAI: false, refining: 0, colonyBonus: 1 },
    unlockedUpgrades: [],
    camera: { x: 0, y: 0, zoom: 1 },
    fx: { floaters: [], twinkleSeed: Math.random() * 9999 },
    mobileTab: "actions",
  };
}

export function normalizeState(state) {
  const fresh = createInitialState();
  state.version = fresh.version;
  state.resources = { ...fresh.resources, ...(state.resources || {}) };
  state.rates = { ...fresh.rates, ...(state.rates || {}) };
  state.storageCap = { ...fresh.storageCap, ...(state.storageCap || {}) };
  state.modifiers = { ...fresh.modifiers, ...(state.modifiers || {}) };
  state.mothership = { ...fresh.mothership, ...(state.mothership || {}) };
  state.planets = (state.planets || []).slice(0, PLANET_LIMIT);

  while (state.planets.length < PLANET_LIMIT) state.planets.push(createPlanet(state.planets.length));

  state.planets.forEach((p, i) => {
    const baseline = createPlanet(i);
    p.resourceProfile = p.resourceProfile || baseline.resourceProfile;
    p.buffer = { ...resourceMap(0), ...(p.buffer || {}) };
    p.unlockCost = p.unlockCost || baseline.unlockCost;
    p.colony = p.colony || baseline.colony;
    p.colony.population = p.colony.population || 0;
    p.colony.industries = { ...baseline.colony.industries, ...(p.colony.industries || {}) };
  });

  state.ships.forEach(s => { s.cargo = { ...resourceMap(0), ...(s.cargo || {}) }; });
}

export function makeShip(idx) {
  return {
    id: `ship-${idx}`,
    planetId: "planet-0",
    state: "TRAVEL_TO_PLANET",
    progress: 0,
    dockTimer: 0,
    cargo: resourceMap(0),
    capacity: 20,
    speed: 80,
  };
}
