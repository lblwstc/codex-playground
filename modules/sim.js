import { INDUSTRIES, RESOURCES, UPGRADES } from "./content.js";
import { makeShip } from "./state.js";

const TICK_DT = 0.1;

export function tick(state) {
  state.rates = Object.fromEntries(Object.keys(RESOURCES).map(id => [id, 0]));
  producePlanets(state, TICK_DT);
  produceColonyScience(state, TICK_DT);
  if (state.modifiers.routeAI) autoAssignRoutes(state);
  for (const ship of state.ships) stepShip(state, ship, TICK_DT);
  stepFx(state, TICK_DT);
  state.time += TICK_DT * 1000;
}

function industryMultiplier(p, state) {
  if (!p.colony?.established) return 1;
  const industries = p.colony.industries;
  const mining = 1 + industries.mining * 0.14;
  const refining = 1 + industries.refining * 0.1;
  const power = 1 + industries.power * 0.07;
  return mining * refining * power * state.modifiers.colonyBonus;
}

function producePlanets(state, dt) {
  for (const p of state.planets) {
    if (!p.unlocked) continue;
    const base = 0.9 * p.richness * p.extractorLevel * p.extractorSlots * state.modifiers.extractorOutput;
    const colonyBoost = industryMultiplier(p, state);
    for (const item of p.resourceProfile) {
      let produced = base * item.share * colonyBoost;
      if (item.id === "bio" && p.colony?.industries.biotech > 0) {
        produced *= 1 + p.colony.industries.biotech * 0.12;
      }
      p.buffer[item.id] += produced * dt;
      state.rates[item.id] += produced;
    }
  }
}

function produceColonyScience(state, dt) {
  for (const p of state.planets) {
    if (!p.unlocked || !p.colony?.established) continue;
    const i = p.colony.industries;
    const output = (i.research * 0.48 + i.biotech * 0.1 + i.power * 0.06) * state.modifiers.colonyBonus;
    if (output <= 0) continue;
    p.buffer.science += output * dt;
    state.rates.science += output;
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

  if (ship.state === "LOADING") {
    const cap = ship.capacity + state.modifiers.shipCapacity;
    let used = 0;
    const prioritized = p.resourceProfile.map(x => x.id);
    for (const res of [...new Set([...prioritized, ...Object.keys(RESOURCES)])]) {
      if (used >= cap) break;
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
      if (moved > 0) state.fx.floaters.push({ x: 0, y: 0, text: `+${moved.toFixed(1)} ${RESOURCES[res].name}`, life: 1.4, color: RESOURCES[res].color });
      if (res === "ore" && state.modifiers.refining > 0 && moved > 0) {
        state.resources.energy = Math.min(state.storageCap.energy, state.resources.energy + moved * state.modifiers.refining);
      }
    }
    ship.state = "TRAVEL_TO_PLANET";
  }
  ship.progress = 0;
}

function stepFx(state, dt) {
  state.fx.floaters = state.fx.floaters.filter(f => (f.life -= dt) > 0);
}

export function canAfford(state, cost) {
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}

export function payCost(state, cost) {
  if (!canAfford(state, cost)) return false;
  Object.entries(cost).forEach(([k, v]) => { state.resources[k] -= v; });
  return true;
}

export function unlockPlanet(state, planetId) {
  const p = state.planets.find(x => x.id === planetId);
  if (!p || p.unlocked || !payCost(state, p.unlockCost)) return false;
  p.unlocked = true;

  const ship = makeShip(state.nextShipId++);
  ship.planetId = p.id;
  state.ships.push(ship);
  return true;
}

export function establishColony(state, planetId) {
  const p = state.planets.find(x => x.id === planetId);
  if (!p || !p.unlocked || p.colony.established) return false;
  const cost = { ore: 80 + p.distance * 0.12, water: 35, energy: 40, bio: 30 };
  if (!payCost(state, cost)) return false;
  p.colony.established = true;
  p.colony.population = 120;
  return true;
}

export function upgradeIndustry(state, planetId, industryId) {
  const p = state.planets.find(x => x.id === planetId);
  const industry = INDUSTRIES[industryId];
  if (!p || !industry || !p.colony.established) return false;
  const lv = p.colony.industries[industryId] || 0;
  const scalar = 1 + lv * 0.85;
  const cost = Object.fromEntries(Object.entries(industry.baseCost).map(([k, v]) => [k, Math.floor(v * scalar)]));
  if (!payCost(state, cost)) return false;
  p.colony.industries[industryId] = lv + 1;
  p.colony.population += 25;
  return true;
}

export function upgradeExtractor(state, planetId) {
  const p = state.planets.find(x => x.id === planetId);
  if (!p) return false;
  const cost = { ore: 25 * p.extractorLevel, bio: 10 * p.extractorLevel, silicon: Math.max(0, 8 * (p.extractorLevel - 1)) };
  if (!payCost(state, cost)) return false;
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
  const ranked = unlocked.slice().sort((a, b) => (b.richness * b.extractorSlots / b.distance) - (a.richness * a.extractorSlots / a.distance));
  state.ships.forEach((s, i) => { s.planetId = ranked[i % ranked.length].id; });
}
