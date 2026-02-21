import { PLANET_TEMPLATES, RESOURCES } from "./content.js";

/** @typedef {{x:number,y:number}} Vec2 */

/** @returns {import('./types').GameState|any} */
export function createInitialState() {
  const now = Date.now();
  const planets = PLANET_TEMPLATES.map((tpl, i) => ({
    id: `planet-${i}`,
    name: `${tpl.type[0].toUpperCase()}${tpl.type.slice(1)}-${i + 1}`,
    ...tpl,
    distance: 160 + i * 90,
    angle: (Math.PI * 2 * i) / PLANET_TEMPLATES.length,
    unlocked: i === 0,
    unlockCost: { ore: 35 + i * 50, water: i * 20, bio: i * 15, energy: i * 10 },
    extractorLevel: 1,
    extractorSlots: 1 + Math.floor(i / 2),
    buffer: Object.fromEntries(Object.keys(RESOURCES).map(r => [r, 0])),
  }));

  return {
    version: 1,
    time: now,
    lastSaveAt: now,
    resources: { ore: 80, water: 40, bio: 20, energy: 20 },
    rates: { ore: 0, water: 0, bio: 0, energy: 0 },
    storageCap: { ore: 500, water: 500, bio: 500, energy: 500 },
    mothership: { x: 0, y: 0 },
    planets,
    ships: [makeShip(0)],
    nextShipId: 1,
    selected: { kind: "mothership", id: "mothership" },
    modifiers: { shipSpeed: 1, shipCapacity: 0, dockTime: 1, extractorOutput: 1, routeAI: false, refining: 0 },
    unlockedUpgrades: [],
    camera: { x: 0, y: 0, zoom: 1 },
    fx: { floaters: [], twinkleSeed: Math.random() * 9999 },
    mobileTab: "actions",
  };
}

export function makeShip(idx) {
  return {
    id: `ship-${idx}`,
    planetId: "planet-0",
    state: "TRAVEL_TO_PLANET",
    progress: 0,
    dockTimer: 0,
    cargo: { ore: 0, water: 0, bio: 0, energy: 0 },
    capacity: 20,
    speed: 80,
  };
}
