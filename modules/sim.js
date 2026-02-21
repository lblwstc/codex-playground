import { BASE_SHIP_STATS, TECH_DEFS } from './content.js';
import { createShip } from './state.js';

const TICK_RATE = 10;
export const TICK_DT = 1 / TICK_RATE;

export const runTick = (state) => {
  state.time += TICK_DT;
  updateProduction(state, TICK_DT);
  runRefining(state, TICK_DT);
  updateShips(state, TICK_DT);
  updateEffects(state, TICK_DT);
  updateRates(state);
};

function updateProduction(state, dt) {
  for (const p of state.planets) {
    if (!p.unlocked || p.extractorLevel <= 0) continue;
    const baseRate = 1.6 * p.extractorLevel * p.richness * state.modifiers.extractorMult;
    p.buffer[p.primaryResource] += baseRate * dt;
    if (p.secondaryResource) p.buffer[p.secondaryResource] += baseRate * 0.25 * dt;
    if (p.primaryResource === 'bio') p.buffer.bio += baseRate * state.modifiers.bioBonus * dt;
    if (p.primaryResource === 'energy') p.buffer.energy += baseRate * state.modifiers.energyBonus * dt;
  }
}

function runRefining(state, dt) {
  if (state.modifiers.refiningRate <= 0) return;
  const oreSpend = Math.min(state.resources.ore, state.modifiers.refiningRate * dt);
  state.resources.ore -= oreSpend;
  state.resources.energy = clampCap(state.resources.energy + oreSpend * 0.7, state.mothership.capacity.energy);
}

function updateShips(state, dt) {
  for (const ship of state.ships) {
    ship.speed = BASE_SHIP_STATS.speed * state.modifiers.shipSpeedMult;
    ship.capacity = BASE_SHIP_STATS.capacity + state.modifiers.shipCapacityFlat;

    if (!ship.assignedPlanetId) {
      if (state.flags.routeAI) assignBestPlanet(state, ship);
      if (!ship.assignedPlanetId) continue;
    }

    const planet = state.planets.find((p) => p.id === ship.assignedPlanetId && p.unlocked);
    if (!planet) {
      ship.state = 'IDLE';
      ship.assignedPlanetId = null;
      continue;
    }

    const distance = planet.distance;
    const travelDuration = Math.max(1.8, distance / ship.speed);
    const loadTime = BASE_SHIP_STATS.loadTime * state.modifiers.loadUnloadMult;
    const unloadTime = BASE_SHIP_STATS.unloadTime * state.modifiers.loadUnloadMult;

    if (ship.state === 'IDLE') ship.state = 'TRAVEL_TO_PLANET';

    if (ship.state === 'TRAVEL_TO_PLANET' || ship.state === 'TRAVEL_TO_MOTHERSHIP') {
      ship.progress += dt / travelDuration;
      if (ship.progress >= 1) {
        ship.progress = 0;
        ship.state = ship.state === 'TRAVEL_TO_PLANET' ? 'LOADING' : 'UNLOADING';
        ship.timer = ship.state === 'LOADING' ? loadTime : unloadTime;
      }
      continue;
    }

    if (ship.state === 'LOADING') {
      ship.timer -= dt;
      if (ship.timer <= 0) {
        loadShipFromPlanet(ship, planet);
        ship.state = 'TRAVEL_TO_MOTHERSHIP';
        ship.progress = 0;
      }
      continue;
    }

    if (ship.state === 'UNLOADING') {
      ship.timer -= dt;
      if (ship.timer <= 0) {
        unloadShipToMothership(state, ship);
        ship.state = 'TRAVEL_TO_PLANET';
        ship.progress = 0;
      }
    }
  }
}

function loadShipFromPlanet(ship, planet) {
  const cargo = { ore: 0, water: 0, bio: 0, energy: 0 };
  let remaining = ship.capacity;

  const order = [planet.primaryResource, planet.secondaryResource, 'ore', 'water', 'bio', 'energy'].filter(Boolean);
  for (const r of [...new Set(order)]) {
    const take = Math.min(remaining, planet.buffer[r]);
    planet.buffer[r] -= take;
    cargo[r] += take;
    remaining -= take;
    if (remaining <= 0) break;
  }
  ship.cargo = cargo;
}

function unloadShipToMothership(state, ship) {
  for (const key of Object.keys(ship.cargo)) {
    const amount = ship.cargo[key];
    if (amount <= 0) continue;
    const before = state.resources[key];
    state.resources[key] = clampCap(before + amount, state.mothership.capacity[key]);
    const gained = Math.max(0, state.resources[key] - before);
    if (gained > 0.01) {
      state.effects.floatTexts.push({
        x: 0,
        y: -30,
        life: 1.2,
        text: `+${gained.toFixed(0)} ${key}`,
        color: '#d9efff'
      });
    }
    ship.cargo[key] = 0;
  }
}

function updateEffects(state, dt) {
  state.effects.floatTexts = state.effects.floatTexts
    .map((f) => ({ ...f, life: f.life - dt, y: f.y - dt * 20 }))
    .filter((f) => f.life > 0);
}

function updateRates(state) {
  const totals = { ore: 0, water: 0, bio: 0, energy: 0 };
  for (const p of state.planets) {
    if (!p.unlocked || p.extractorLevel <= 0) continue;
    const baseRate = 1.6 * p.extractorLevel * p.richness * state.modifiers.extractorMult;
    totals[p.primaryResource] += baseRate;
    if (p.secondaryResource) totals[p.secondaryResource] += baseRate * 0.25;
    if (p.primaryResource === 'bio') totals.bio += baseRate * state.modifiers.bioBonus;
    if (p.primaryResource === 'energy') totals.energy += baseRate * state.modifiers.energyBonus;
  }
  if (state.modifiers.refiningRate > 0) {
    totals.ore -= state.modifiers.refiningRate;
    totals.energy += state.modifiers.refiningRate * 0.7;
  }
  state.rates = totals;
}

export const canAfford = (wallet, cost) => Object.keys(cost).every((k) => (wallet[k] || 0) >= cost[k]);

export const spendCost = (wallet, cost) => {
  for (const key of Object.keys(cost)) wallet[key] -= cost[key];
};

export const unlockPlanet = (state, planetId) => {
  const planet = state.planets.find((p) => p.id === planetId);
  if (!planet || planet.unlocked) return false;
  if (planet.techPrereq && !state.unlockedTech.includes(planet.techPrereq)) return false;
  if (!canAfford(state.resources, planet.unlockCost)) return false;
  spendCost(state.resources, planet.unlockCost);
  planet.unlocked = true;
  planet.extractorLevel = Math.max(planet.extractorLevel, 1);
  return true;
};

export const upgradeExtractor = (state, planetId) => {
  const planet = state.planets.find((p) => p.id === planetId);
  if (!planet || !planet.unlocked || planet.extractorLevel >= planet.extractorSlots) return false;
  const next = planet.extractorLevel + 1;
  const cost = { ore: next * 20, water: next * 14, bio: next * 10, energy: next * 12 };
  if (!canAfford(state.resources, cost)) return false;
  spendCost(state.resources, cost);
  planet.extractorLevel = next;
  return true;
};

export const buyShip = (state) => {
  const cost = { ore: 80 + state.ships.length * 35, water: 45, bio: 30, energy: 25 };
  if (!canAfford(state.resources, cost)) return false;
  spendCost(state.resources, cost);
  const ship = createShip(state.ships.length + 1);
  ship.assignedPlanetId = bestPlanetId(state);
  ship.state = 'TRAVEL_TO_PLANET';
  state.ships.push(ship);
  return true;
};

export const unlockTech = (state, techId) => {
  const tech = TECH_DEFS.find((t) => t.id === techId);
  if (!tech || state.unlockedTech.includes(techId)) return false;
  if (tech.prereqs.some((p) => !state.unlockedTech.includes(p))) return false;
  if (!canAfford(state.resources, tech.cost)) return false;
  spendCost(state.resources, tech.cost);
  state.unlockedTech.push(techId);
  tech.apply(state);
  return true;
};

export const assignShip = (state, shipId, planetId) => {
  const ship = state.ships.find((s) => s.id === shipId);
  const planet = state.planets.find((p) => p.id === planetId && p.unlocked);
  if (!ship || !planet) return false;
  ship.assignedPlanetId = planetId;
  ship.state = 'TRAVEL_TO_PLANET';
  ship.progress = 0;
  return true;
};

function assignBestPlanet(state, ship) {
  ship.assignedPlanetId = bestPlanetId(state);
}

function bestPlanetId(state) {
  const unlocked = state.planets.filter((p) => p.unlocked);
  unlocked.sort((a, b) => (b.richness / b.distance) - (a.richness / a.distance));
  return unlocked[0]?.id || null;
}

const clampCap = (v, cap) => Math.max(0, Math.min(cap, v));
