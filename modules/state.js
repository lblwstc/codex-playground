import { BASE_SHIP_STATS, PLANET_DEFS, PLANET_TYPES, RESOURCES } from './content.js';

/** @typedef {'TRAVEL_TO_PLANET'|'LOADING'|'TRAVEL_TO_MOTHERSHIP'|'UNLOADING'|'IDLE'} ShipState */

/**
 * @typedef {Object} PlanetState
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} primaryResource
 * @property {string | null} secondaryResource
 * @property {number} richness
 * @property {number} extractorSlots
 * @property {number} extractorLevel
 * @property {number} distance
 * @property {boolean} unlocked
 * @property {{x:number, y:number}} worldPos
 * @property {Record<string, number>} buffer
 */

/**
 * @typedef {Object} Ship
 * @property {string} id
 * @property {ShipState} state
 * @property {string | null} assignedPlanetId
 * @property {number} progress
 * @property {number} timer
 * @property {number} capacity
 * @property {number} speed
 * @property {Record<string, number>} cargo
 */

export const createInitialState = () => {
  const resources = Object.fromEntries(Object.keys(RESOURCES).map((key) => [key, 35]));
  resources.ore = 65;

  const planets = PLANET_DEFS.map((def, index) => {
    const x = Math.cos(def.angle) * def.distance;
    const y = Math.sin(def.angle) * def.distance;
    return {
      ...def,
      unlocked: index === 0,
      extractorLevel: index === 0 ? 1 : 0,
      worldPos: { x, y },
      buffer: { ore: 0, water: 0, bio: 0, energy: 0 }
    };
  });

  return {
    time: 0,
    resources,
    rates: { ore: 0, water: 0, bio: 0, energy: 0 },
    mothership: {
      worldPos: { x: 0, y: 0 },
      capacity: { ore: 250, water: 250, bio: 250, energy: 250 }
    },
    camera: {
      x: 0,
      y: 0,
      zoom: 1
    },
    input: {
      activePointers: new Map(),
      dragging: false,
      pinchDistance: null,
      lastTapMs: 0
    },
    planets,
    ships: [createShip(1)],
    selected: { kind: 'mothership', id: 'mothership' },
    effects: {
      floatTexts: [],
      stars: createStars()
    },
    ui: {
      mobileTab: 'actions',
      toast: ''
    },
    flags: {
      routeAI: false
    },
    modifiers: {
      shipSpeedMult: 1,
      shipCapacityFlat: 0,
      loadUnloadMult: 1,
      extractorMult: 1,
      bioBonus: 0,
      energyBonus: 0,
      refiningRate: 0
    },
    unlockedTech: [],
    lastSaveAt: Date.now(),
    metadata: {
      version: 1
    }
  };
};

export const createShip = (n) => ({
  id: `ship_${n}`,
  state: 'IDLE',
  assignedPlanetId: 'p_rocka',
  progress: 0,
  timer: 0,
  capacity: BASE_SHIP_STATS.capacity,
  speed: BASE_SHIP_STATS.speed,
  cargo: { ore: 0, water: 0, bio: 0, energy: 0 }
});

const createStars = () => {
  const stars = [];
  for (let i = 0; i < 170; i += 1) {
    stars.push({
      x: (Math.random() - 0.5) * 2200,
      y: (Math.random() - 0.5) * 2200,
      r: Math.random() * 1.7 + 0.2,
      twinkle: Math.random() * Math.PI * 2
    });
  }
  return stars;
};

export const hydrateState = (saved) => {
  const fresh = createInitialState();
  if (!saved) return fresh;

  Object.assign(fresh.resources, saved.resources || {});
  Object.assign(fresh.rates, saved.rates || {});
  Object.assign(fresh.mothership.capacity, saved.mothership?.capacity || {});
  fresh.time = saved.time || 0;
  fresh.lastSaveAt = saved.lastSaveAt || Date.now();
  fresh.unlockedTech = saved.unlockedTech || [];
  fresh.flags = { ...fresh.flags, ...(saved.flags || {}) };
  fresh.modifiers = { ...fresh.modifiers, ...(saved.modifiers || {}) };

  if (Array.isArray(saved.planets)) {
    for (const p of fresh.planets) {
      const sp = saved.planets.find((it) => it.id === p.id);
      if (!sp) continue;
      p.unlocked = !!sp.unlocked;
      p.extractorLevel = sp.extractorLevel || 0;
      p.buffer = { ...p.buffer, ...(sp.buffer || {}) };
    }
  }

  if (Array.isArray(saved.ships) && saved.ships.length) {
    fresh.ships = saved.ships.map((ship) => ({ ...createShip(1), ...ship }));
  }

  fresh.selected = saved.selected || fresh.selected;
  return fresh;
};

export const getPlanetTypeVisual = (type) => PLANET_TYPES[type] || PLANET_TYPES.rocky;
