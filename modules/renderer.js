import { planets } from "./balance.js";
import { MAP_H, MAP_W, tileIndex } from "./mapgen.js";

const TILE = 40;
const DPR_MAX = 2;

function drawNodeIcon(ctx, type, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  if (type === "terra") {
    ctx.moveTo(0, -6); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0);
  } else if (type === "ignis") {
    ctx.moveTo(-4, 5); ctx.lineTo(0, -7); ctx.lineTo(4, 5);
  } else if (type === "aqua") {
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
  } else {
    ctx.arc(0, 0, 5, 0, Math.PI * 1.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export class Renderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = state;
    this.dpr = 1;
    this.bgCache = {};
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  getPlanetDef() {
    return planets.find((p) => p.id === this.state.activePlanetId);
  }

  ensureBg(planetId) {
    if (this.bgCache[planetId]) return;
    const off = document.createElement("canvas");
    off.width = MAP_W * TILE;
    off.height = MAP_H * TILE;
    const c = off.getContext("2d");
    const def = planets.find((p) => p.id === planetId);
    const g = c.createLinearGradient(0, 0, off.width, off.height);
    g.addColorStop(0, def.bg);
    g.addColorStop(1, "#0a1025");
    c.fillStyle = g;
    c.fillRect(0, 0, off.width, off.height);
    c.globalAlpha = 0.08;
    for (let i = 0; i < 2000; i++) {
      c.fillStyle = i % 2 ? "#fff" : def.accent;
      c.fillRect(Math.random() * off.width, Math.random() * off.height, 1, 1);
    }
    this.bgCache[planetId] = off;
  }

  draw() {
    const { ctx, state } = this;
    const pState = state.planets[state.activePlanetId];
    this.ensureBg(state.activePlanetId);

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    const z = state.camera.zoom;
    ctx.translate(state.camera.x, state.camera.y);
    ctx.scale(z, z);

    ctx.drawImage(this.bgCache[state.activePlanetId], 0, 0);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = pState.map.tiles[tileIndex(x, y)];
        const px = x * TILE;
        const py = y * TILE;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.strokeRect(px, py, TILE, TILE);
        if (tile.type === "obstacle") {
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
        } else if (tile.type === "node") {
          const alpha = 0.18 + (tile.richness - 0.8) * 0.6;
          ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
          ctx.fillRect(px + 8, py + 8, TILE - 16, TILE - 16);
          drawNodeIcon(ctx, pState.map.tiles[tileIndex(x, y)].nodeType, px + TILE / 2, py + TILE / 2, this.getPlanetDef().accent);
        }
      }
    }

    const drawBuilding = (x, y, lvl, color, shape = "rect") => {
      const px = x * TILE + 6;
      const py = y * TILE + 6;
      ctx.fillStyle = color;
      if (shape === "tri") {
        ctx.beginPath();
        ctx.moveTo(px + TILE / 2 - 6, py + 4);
        ctx.lineTo(px + 6, py + TILE - 12);
        ctx.lineTo(px + TILE - 18, py + TILE - 12);
        ctx.closePath();
        ctx.fill();
      } else if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(px + TILE / 2 - 6, py + TILE / 2 - 6, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(px, py, TILE - 12, TILE - 12);
      }
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText(`L${lvl}`, px + 2, py + 12);
    };

    for (const ext of pState.buildings.extractors) drawBuilding(ext.x, ext.y, ext.level, "#82f6ff");
    if (pState.buildings.power.placed) drawBuilding(pState.buildings.power.x, pState.buildings.power.y, pState.buildings.power.level, "#ffc07a", "tri");
    if (pState.buildings.lab.placed) drawBuilding(pState.buildings.lab.x, pState.buildings.lab.y, pState.buildings.lab.level, "#dca0ff", "circle");
    if (pState.buildings.storage.placed) drawBuilding(pState.buildings.storage.x, pState.buildings.storage.y, pState.buildings.storage.level, "#95ffa8");

    if (state.ui.ghostTile && state.ui.placeMode) {
      const { x, y, valid } = state.ui.ghostTile;
      ctx.strokeStyle = valid ? "#33ff88" : "#ff4f4f";
      ctx.lineWidth = 3;
      if (!valid && performance.now() < state.ui.invalidPulseUntil) {
        const shake = Math.sin(performance.now() * 0.05) * 3;
        ctx.strokeRect(x * TILE + shake, y * TILE + shake, TILE, TILE);
      } else {
        ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    ctx.restore();
  }

  screenToTile(screenX, screenY) {
    const x = (screenX - this.state.camera.x) / this.state.camera.zoom;
    const y = (screenY - this.state.camera.y) / this.state.camera.zoom;
    return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
  }

  clampCamera() {
    const viewW = this.canvas.clientWidth;
    const viewH = this.canvas.clientHeight;
    const worldW = MAP_W * TILE * this.state.camera.zoom;
    const worldH = MAP_H * TILE * this.state.camera.zoom;
    const minX = Math.min(0, viewW - worldW);
    const minY = Math.min(0, viewH - worldH);
    this.state.camera.x = Math.min(0, Math.max(minX, this.state.camera.x));
    this.state.camera.y = Math.min(0, Math.max(minY, this.state.camera.y));
  }
}
