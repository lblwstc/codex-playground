/**
 * Static content definitions for resources, planets, and tech upgrades.
 */

export const RESOURCES = {
  ore: { key: 'ore', label: 'Ore', color: '#c8a66b' },
  water: { key: 'water', label: 'Water', color: '#76c7ff' },
  bio: { key: 'bio', label: 'Bio', color: '#8fd56b' },
  energy: { key: 'energy', label: 'Energy', color: '#f7de5d' }
};

export const PLANET_TYPES = {
  rocky: { name: 'Rocky', baseColor: '#8f7f74', accentColor: '#70655b' },
  ice: { name: 'Ice', baseColor: '#9ed9f5', accentColor: '#d8f5ff' },
  lush: { name: 'Lush', baseColor: '#6fc67b', accentColor: '#355f3b' },
  volcanic: { name: 'Volcanic', baseColor: '#ba5b42', accentColor: '#4d2520' },
  gas: { name: 'Gas', baseColor: '#d4a0ff', accentColor: '#8760b0' }
};

export const PLANET_DEFS = [
  {
    id: 'p_rocka',
    name: 'Basalt-9',
    type: 'rocky',
    primaryResource: 'ore',
    secondaryResource: 'energy',
    richness: 1,
    extractorSlots: 2,
    distance: 240,
    unlockCost: { ore: 0, water: 0, bio: 0, energy: 0 },
    techPrereq: null,
    angle: 0.2
  },
  {
    id: 'p_icea',
    name: 'Cryon Veil',
    type: 'ice',
    primaryResource: 'water',
    secondaryResource: 'ore',
    richness: 1.15,
    extractorSlots: 2,
    distance: 310,
    unlockCost: { ore: 25, water: 0, bio: 0, energy: 5 },
    techPrereq: null,
    angle: 1.8
  },
  {
    id: 'p_lusha',
    name: 'Verdantis',
    type: 'lush',
    primaryResource: 'bio',
    secondaryResource: 'water',
    richness: 1.25,
    extractorSlots: 3,
    distance: 380,
    unlockCost: { ore: 55, water: 40, bio: 0, energy: 18 },
    techPrereq: 'terraform_scans',
    angle: 3.2
  },
  {
    id: 'p_volca',
    name: 'Pyra Core',
    type: 'volcanic',
    primaryResource: 'energy',
    secondaryResource: 'ore',
    richness: 1.4,
    extractorSlots: 3,
    distance: 460,
    unlockCost: { ore: 90, water: 70, bio: 25, energy: 0 },
    techPrereq: 'thermal_shielding',
    angle: 4.7
  },
  {
    id: 'p_gasa',
    name: 'Zephyra',
    type: 'gas',
    primaryResource: 'energy',
    secondaryResource: 'bio',
    richness: 1.6,
    extractorSlots: 4,
    distance: 540,
    unlockCost: { ore: 140, water: 95, bio: 80, energy: 45 },
    techPrereq: 'deep_space_logistics',
    angle: 5.6
  }
];

export const BASE_SHIP_STATS = {
  speed: 80,
  capacity: 20,
  loadTime: 2,
  unloadTime: 1.4
};

export const TECH_DEFS = [
  {
    id: 'thrusters_1',
    name: 'Improved Thrusters',
    description: '+15% ship speed.',
    cost: { ore: 40, water: 20, bio: 0, energy: 15 },
    prereqs: [],
    apply: (state) => { state.modifiers.shipSpeedMult += 0.15; }
  },
  {
    id: 'cargo_1',
    name: 'Expanded Cargo Holds',
    description: '+20 ship capacity.',
    cost: { ore: 45, water: 0, bio: 15, energy: 12 },
    prereqs: [],
    apply: (state) => { state.modifiers.shipCapacityFlat += 20; }
  },
  {
    id: 'docking_ai',
    name: 'Auto-Docking',
    description: '-25% load and unload duration.',
    cost: { ore: 70, water: 35, bio: 20, energy: 35 },
    prereqs: ['thrusters_1'],
    apply: (state) => { state.modifiers.loadUnloadMult *= 0.75; }
  },
  {
    id: 'extractor_mk2',
    name: 'Planetary Extractor MK2',
    description: '+30% extraction output.',
    cost: { ore: 65, water: 30, bio: 20, energy: 20 },
    prereqs: [],
    apply: (state) => { state.modifiers.extractorMult += 0.3; }
  },
  {
    id: 'storage_1',
    name: 'Storage Expansion I',
    description: '+150 storage cap for all resources.',
    cost: { ore: 50, water: 40, bio: 20, energy: 18 },
    prereqs: [],
    apply: (state) => {
      for (const key of Object.keys(state.mothership.capacity)) state.mothership.capacity[key] += 150;
    }
  },
  {
    id: 'terraform_scans',
    name: 'Terraform Scans',
    description: 'Unlock Verdantis class planets and +10% bio output.',
    cost: { ore: 85, water: 70, bio: 25, energy: 35 },
    prereqs: ['extractor_mk2'],
    apply: (state) => { state.modifiers.bioBonus += 0.1; }
  },
  {
    id: 'thermal_shielding',
    name: 'Thermal Shielding',
    description: 'Unlock volcanic planets and +15% energy output.',
    cost: { ore: 120, water: 80, bio: 35, energy: 55 },
    prereqs: ['docking_ai'],
    apply: (state) => { state.modifiers.energyBonus += 0.15; }
  },
  {
    id: 'refining_1',
    name: 'Advanced Refining',
    description: 'Converts Ore into Energy over time.',
    cost: { ore: 100, water: 40, bio: 35, energy: 40 },
    prereqs: ['extractor_mk2'],
    apply: (state) => { state.modifiers.refiningRate += 0.8; }
  },
  {
    id: 'route_ai',
    name: 'Route AI',
    description: 'Auto-assign idle ships to highest ROI unlocked planet.',
    cost: { ore: 130, water: 100, bio: 55, energy: 70 },
    prereqs: ['docking_ai', 'storage_1'],
    apply: (state) => { state.flags.routeAI = true; }
  },
  {
    id: 'deep_space_logistics',
    name: 'Deep Space Logistics',
    description: 'Unlock gas giants and +10% ship speed.',
    cost: { ore: 170, water: 125, bio: 85, energy: 100 },
    prereqs: ['route_ai', 'thermal_shielding'],
    apply: (state) => { state.modifiers.shipSpeedMult += 0.1; }
  }
];
