export const RESOURCES = {
  ore: { name: "Ore", color: "#b0b7c3", unlockPlanet: 0 },
  water: { name: "Water", color: "#63d7ff", unlockPlanet: 0 },
  bio: { name: "Bio", color: "#7def8a", unlockPlanet: 0 },
  energy: { name: "Energy", color: "#ffd46a", unlockPlanet: 0 },
  silicon: { name: "Silicon", color: "#d7d1ff", unlockPlanet: 2 },
  crystal: { name: "Crystals", color: "#9ffff3", unlockPlanet: 4 },
  gas: { name: "Reactive Gas", color: "#c4a8ff", unlockPlanet: 6 },
  alloy: { name: "Alloys", color: "#9fa7b8", unlockPlanet: 8 },
  antimatter: { name: "Antimatter", color: "#ff7bc1", unlockPlanet: 11 },
  science: { name: "Science", color: "#fffd8f", unlockPlanet: 1 },
};

export const PLANET_TEMPLATES = [
  { type: "rocky", richness: 1.05, color: "#7f6f65", affinities: ["ore", "silicon", "alloy"] },
  { type: "ice", richness: 1.0, color: "#9ad9ff", affinities: ["water", "crystal"] },
  { type: "lush", richness: 1.1, color: "#4cc77f", affinities: ["bio", "water", "science"] },
  { type: "volcanic", richness: 1.2, color: "#d86140", affinities: ["energy", "ore", "gas"] },
  { type: "gas", richness: 1.15, color: "#c8b3ff", affinities: ["gas", "energy", "antimatter"] },
  { type: "crystalline", richness: 1.25, color: "#7cf0e8", affinities: ["crystal", "silicon", "science"] },
  { type: "metallic", richness: 1.3, color: "#9aa0b2", affinities: ["alloy", "ore", "energy"] },
  { type: "rift", richness: 1.35, color: "#8b69ff", affinities: ["antimatter", "gas", "science"] },
];

export const INDUSTRIES = {
  mining: { name: "Mining Complex", desc: "+14% planetary extraction", baseCost: { ore: 35, energy: 20 } },
  refining: { name: "Refinery", desc: "+10% extraction and unlocks Alloy conversion", baseCost: { ore: 40, silicon: 15, energy: 20 } },
  biotech: { name: "Biolab", desc: "Boosts Bio + Science output", baseCost: { water: 35, bio: 35, crystal: 12 } },
  power: { name: "Fusion Plant", desc: "Improves all industry efficiency", baseCost: { ore: 40, gas: 20, energy: 35 } },
  research: { name: "Research Nexus", desc: "Generates Science for advanced tech", baseCost: { crystal: 30, silicon: 25, energy: 30 } },
};

export const UPGRADES = [
  { id: "thrusters1", name: "Improved Thrusters", desc: "+15% ship speed", cost: { ore: 40, energy: 20 }, prereq: [], effect: s => s.modifiers.shipSpeed *= 1.15 },
  { id: "cargo1", name: "Expanded Cargo Holds", desc: "+8 capacity", cost: { ore: 60, bio: 20 }, prereq: [], effect: s => s.modifiers.shipCapacity += 8 },
  { id: "dock1", name: "Auto-Docking", desc: "-20% load/unload time", cost: { energy: 45, water: 30 }, prereq: [], effect: s => s.modifiers.dockTime *= 0.8 },
  { id: "extractor2", name: "Extractor MK2", desc: "+25% planet output", cost: { ore: 80, water: 40, science: 18 }, prereq: ["thrusters1"], effect: s => s.modifiers.extractorOutput *= 1.25 },
  { id: "storage1", name: "Storage Expansion I", desc: "+300 to all caps", cost: { ore: 80, bio: 40, silicon: 20 }, prereq: ["cargo1"], effect: s => Object.keys(s.storageCap).forEach(k => s.storageCap[k] += 300) },
  { id: "routeAI", name: "Route AI", desc: "Auto assign idle ships to best ROI", cost: { energy: 120, bio: 80, science: 60 }, prereq: ["dock1"], effect: s => s.modifiers.routeAI = true },
  { id: "refine", name: "Advanced Refining", desc: "Ore unload grants +20% Energy", cost: { ore: 120, energy: 100, alloy: 40 }, prereq: ["extractor2"], effect: s => s.modifiers.refining = 0.2 },
  { id: "thrusters2", name: "Thrusters Mk3", desc: "+20% ship speed", cost: { ore: 180, energy: 140, gas: 60 }, prereq: ["thrusters1"], effect: s => s.modifiers.shipSpeed *= 1.2 },
  { id: "storage2", name: "Storage Expansion II", desc: "+550 to all caps", cost: { ore: 220, water: 120, bio: 120, alloy: 80 }, prereq: ["storage1"], effect: s => Object.keys(s.storageCap).forEach(k => s.storageCap[k] += 550) },
  { id: "quantumLogistics", name: "Quantum Logistics", desc: "Ships gain +12 capacity and +15% speed", cost: { science: 180, crystal: 120, antimatter: 50 }, prereq: ["thrusters2", "routeAI"], effect: s => { s.modifiers.shipCapacity += 12; s.modifiers.shipSpeed *= 1.15; } },
  { id: "colonyNet", name: "Colony Hypernet", desc: "Colony industries +25% effectiveness", cost: { science: 220, silicon: 140, gas: 90 }, prereq: ["storage2"], effect: s => s.modifiers.colonyBonus *= 1.25 },
];
