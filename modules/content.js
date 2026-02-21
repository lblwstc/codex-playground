export const RESOURCES = {
  ore: { name: "Ore", color: "#b0b7c3" },
  water: { name: "Water", color: "#63d7ff" },
  bio: { name: "Bio", color: "#7def8a" },
  energy: { name: "Energy", color: "#ffd46a" },
};

export const PLANET_TEMPLATES = [
  { type: "rocky", primaryResource: "ore", richness: 1.2, color: "#7f6f65" },
  { type: "ice", primaryResource: "water", richness: 1.15, color: "#9ad9ff" },
  { type: "lush", primaryResource: "bio", richness: 1.25, color: "#4cc77f" },
  { type: "volcanic", primaryResource: "energy", richness: 1.35, color: "#d86140" },
  { type: "gas", primaryResource: "energy", richness: 1.1, color: "#c8b3ff" },
];

export const UPGRADES = [
  { id: "thrusters1", name: "Improved Thrusters", desc: "+15% ship speed", cost: { ore: 40, energy: 20 }, prereq: [], effect: s => s.modifiers.shipSpeed *= 1.15 },
  { id: "cargo1", name: "Expanded Cargo Holds", desc: "+8 capacity", cost: { ore: 60, bio: 20 }, prereq: [], effect: s => s.modifiers.shipCapacity += 8 },
  { id: "dock1", name: "Auto-Docking", desc: "-20% load/unload time", cost: { energy: 45, water: 30 }, prereq: [], effect: s => s.modifiers.dockTime *= 0.8 },
  { id: "extractor2", name: "Extractor MK2", desc: "+25% planet output", cost: { ore: 80, water: 40 }, prereq: ["thrusters1"], effect: s => s.modifiers.extractorOutput *= 1.25 },
  { id: "storage1", name: "Storage Expansion I", desc: "+300 to all caps", cost: { ore: 80, bio: 40 }, prereq: ["cargo1"], effect: s => Object.keys(s.storageCap).forEach(k => s.storageCap[k] += 300) },
  { id: "routeAI", name: "Route AI", desc: "Auto assign idle ships to best ROI", cost: { energy: 120, bio: 80 }, prereq: ["dock1"], effect: s => s.modifiers.routeAI = true },
  { id: "refine", name: "Advanced Refining", desc: "Ore grants +15% Energy on unload", cost: { ore: 120, energy: 100 }, prereq: ["extractor2"], effect: s => s.modifiers.refining = 0.15 },
  { id: "thrusters2", name: "Thrusters Mk3", desc: "+20% ship speed", cost: { ore: 180, energy: 140 }, prereq: ["thrusters1"], effect: s => s.modifiers.shipSpeed *= 1.2 },
  { id: "storage2", name: "Storage Expansion II", desc: "+500 to all caps", cost: { ore: 220, water: 120, bio: 120 }, prereq: ["storage1"], effect: s => Object.keys(s.storageCap).forEach(k => s.storageCap[k] += 500) },
];
