import { hashString, mulberry32 } from "./utils.js";

export const MAP_W = 48;
export const MAP_H = 32;

export function tileIndex(x, y) {
  return y * MAP_W + x;
}

export function generatePlanetMap(planetId, seedStr) {
  const seed = hashString(`${planetId}:${seedStr}`);
  const rand = mulberry32(seed);
  const tiles = new Array(MAP_W * MAP_H);
  const nodeType = planetId;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const edgeDist = Math.min(x, y, MAP_W - 1 - x, MAP_H - 1 - y);
      const edgePenalty = edgeDist < 2 ? 0.15 : 0;
      const r = rand();
      let type = "empty";
      if (r < 0.11 + edgePenalty) type = "obstacle";
      else if (r < 0.2) type = "node";
      tiles[tileIndex(x, y)] = {
        type,
        nodeType: type === "node" ? nodeType : null,
        richness: type === "node" ? 0.8 + rand() * 0.4 : 0,
      };
    }
  }
  return { width: MAP_W, height: MAP_H, tiles };
}
