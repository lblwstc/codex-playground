import { RESOURCES, UPGRADES } from "./content.js";
import { makeShip } from "./state.js";

const TICK_DT = 0.1;

function getFxConfig(state) {
  const quality = state.settings?.fxQuality || "high";
  const reducedMotion = !!state.settings?.reducedMotion;
  const pulseLife = reducedMotion ? 0.6 : 1.2;
  return { quality, reducedMotion, pulseLife, pulseInterval: reducedMotion ? 2 : 1 };
}

export function tick(state) {
  state.rates = { ore: 0, water: 0, bio: 0, energy: 0 };
  producePlanets(state, TICK_DT);
  if (state.modifiers.routeAI) autoAssignRoutes(state);
  for (const ship of state.ships) stepShip(state, ship, TICK_DT);
  stepFx(state, TICK_DT);
  state.time += TICK_DT * 1000;
}

function producePlanets(state, dt) {
  const fxConfig = getFxConfig(state);
  for (const p of state.planets) {
    if (!p.unlocked) continue;
    const base = 0.9 * p.richness * p.extractorLevel * p.extractorSlots * state.modifiers.extractorOutput;
    p.buffer[p.primaryResource] += base * dt;
    state.rates[p.primaryResource] += base;

    if (base * dt <= 0 || !state.fx.pulses) continue;
    const cadence = fxConfig.pulseInterval;
    const gate = Math.floor((state.time / 1000) / cadence);
    if ((gate + p.distance) % 2 !== 0) continue;
    if (state.fx.pulses.length > 60) continue;
    state.fx.pulses.push({
      planetId: p.id,
      resource: p.primaryResource,
      life: fxConfig.pulseLife,
      maxLife: fxConfig.pulseLife,
    });
  }
}

function stepShip(state, ship, dt) {
  const p = state.planets.find(x => x.id === ship.planetId && x.unlocked) || state.planets.find(x => x.unlocked);
  if (!p) return;
  const travelTime = p.distance / (ship.speed * state.modifiers.shipSpeed);
  const dockDuration = 2 * state.modifiers.dockTime;

  if (ship.state.startsWith("TRAVEL")) {
    ship.progress = Math.min(1, ship.progress + dt / travelTime);
    if (ship.progress >= 1) {
      ship.progress = 0;
      ship.state = ship.state === "TRAVEL_TO_PLANET" ? "LOADING" : "UNLOADING";
      ship.dockTimer = dockDuration;
    }
    return;
  }

  ship.dockTimer -= dt;
  if (ship.dockTimer > 0) return;

  let totalMoved = 0;
  if (ship.state === "LOADING") {
    const cap = ship.capacity + state.modifiers.shipCapacity;
    let used = 0;
    for (const res of Object.keys(RESOURCES)) {
      if (res !== p.primaryResource) continue;
      const take = Math.min(p.buffer[res], cap - used);
      p.buffer[res] -= take;
      ship.cargo[res] += take;
      used += take;
    }
    ship.state = "TRAVEL_TO_MOTHERSHIP";
  } else {
    for (const res of Object.keys(RESOURCES)) {
      const amount = ship.cargo[res];
      if (!amount) continue;
      const room = Math.max(0, state.storageCap[res] - state.resources[res]);
      const moved = Math.min(room, amount);
      state.resources[res] += moved;
      ship.cargo[res] -= moved;
      if (moved > 0) {
        totalMoved += moved;
        state.fx.floaters.push({ x: 0, y: 0, text: `+${moved.toFixed(1)} ${RESOURCES[res].name}`, life: 1.4, color: RESOURCES[res].color });
      }
      if (res === "ore" && state.modifiers.refining > 0 && moved > 0) {
        state.resources.energy = Math.min(state.storageCap.energy, state.resources.energy + moved * state.modifiers.refining);
      }
    }
    if (totalMoved > 0 && state.fx.bursts && state.fx.bursts.length < 30) {
      const fxConfig = getFxConfig(state);
      state.fx.bursts.push({ x: 0, y: 0, life: fxConfig.reducedMotion ? 0.35 : 0.55, maxLife: fxConfig.reducedMotion ? 0.35 : 0.55, size: Math.min(34, 16 + totalMoved * 0.2) });
    }
    ship.state = "TRAVEL_TO_PLANET";
  }
  ship.progress = 0;
}

function stepFx(state, dt) {
  state.fx.floaters = state.fx.floaters.filter(f => (f.life -= dt) > 0);
  state.fx.pulses = (state.fx.pulses || []).filter(f => (f.life -= dt) > 0);
  state.fx.bursts = (state.fx.bursts || []).filter(f => (f.life -= dt) > 0);
}

export function canAfford(state, cost) {
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}

export function payCost(state, cost) {
  if (!canAfford(state, cost)) return false;
  Object.entries(cost).forEach(([k, v]) => { state.resources[k] -= v; });
  return true;
}

export function buyShip(state) {
  const cost = { ore: 60 + state.ships.length * 35, energy: 20 + state.ships.length * 12 };
  if (!payCost(state, cost)) return false;
  const ship = makeShip(state.nextShipId++);
  const unlocked = state.planets.filter(p => p.unlocked);
  ship.planetId = unlocked[state.ships.length % unlocked.length].id;
  state.ships.push(ship);
  return true;
}

export function unlockPlanet(state, planetId) {
  const p = state.planets.find(x => x.id === planetId);
  if (!p || p.unlocked || !payCost(state, p.unlockCost)) return false;
  p.unlocked = true;
  return true;
}

export function upgradeExtractor(state, planetId) {
  const p = state.planets.find(x => x.id === planetId);
  const cost = { ore: 25 * p.extractorLevel, bio: 10 * p.extractorLevel };
  if (!p || !payCost(state, cost)) return false;
  p.extractorLevel += 1;
  return true;
}

export function buyUpgrade(state, upgradeId) {
  const up = UPGRADES.find(u => u.id === upgradeId);
  if (!up || state.unlockedUpgrades.includes(up.id)) return false;
  if (!up.prereq.every(x => state.unlockedUpgrades.includes(x))) return false;
  if (!payCost(state, up.cost)) return false;
  up.effect(state);
  state.unlockedUpgrades.push(up.id);
  return true;
}

function autoAssignRoutes(state) {
  const unlocked = state.planets.filter(p => p.unlocked);
  if (!unlocked.length) return;
  const ranked = unlocked.slice().sort((a, b) => (b.richness / b.distance) - (a.richness / a.distance));
  state.ships.forEach((s, i) => { s.planetId = ranked[i % ranked.length].id; });
}
