import { RESOURCES } from "./content.js";

export function render(state, ctx, canvas) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawStars(state, ctx, w, h);

  ctx.save();
  ctx.translate(w / 2 + state.camera.x, h / 2 + state.camera.y);
  ctx.scale(state.camera.zoom, state.camera.zoom);

  drawMothership(state, ctx);
  state.planets.filter(p => p.unlocked).forEach(p => drawPlanet(state, ctx, p));
  drawRoutes(state, ctx);
  state.ships.forEach(s => drawShip(state, ctx, s));
  drawPlanetPulses(state, ctx);
  drawCargoBursts(state, ctx);
  drawFloaters(state, ctx);

  ctx.restore();
  drawVignette(ctx, w, h);
}

function drawStars(state, ctx, w, h) {
  const layers = [
    { count: 40, size: 1, alpha: 0.28, drift: 0.08 },
    { count: 55, size: 1.5, alpha: 0.35, drift: 0.18 },
    { count: 30, size: 2, alpha: 0.45, drift: 0.34 },
  ];
  for (const layer of layers) drawStarLayer(state, ctx, w, h, layer);
}

function drawStarLayer(state, ctx, w, h, layer) {
  for (let i = 0; i < layer.count; i++) {
    const t = state.time / 1300 + i * 13 + state.fx.twinkleSeed;
    const ox = state.camera.x * layer.drift;
    const oy = state.camera.y * layer.drift;
    const x = (((i * 173) % (w + 160)) - 80 + ox + w * 4) % (w + 80) - 40;
    const y = (((i * 97) % (h + 160)) - 80 + oy + h * 4) % (h + 80) - 40;
    const a = layer.alpha + (Math.sin(t) + 1) * 0.12;
    ctx.fillStyle = `rgba(200,220,255,${a})`;
    ctx.fillRect(x, y, layer.size, layer.size);
  }
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.68);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,6,18,0.3)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function planetPos(p) {
  return { x: Math.cos(p.angle) * p.distance, y: Math.sin(p.angle) * p.distance };
}

function drawMothership(state, ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "#9ec8ff";
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 42);
  glow.addColorStop(0, "rgba(158,200,255,0.2)");
  glow.addColorStop(1, "rgba(100,213,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d5ecff";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (state.selected.kind === "mothership") {
    drawSelectionRings(ctx, 0, 0, 34, state.time, "rgba(100,213,255,0.9)");
  }
  ctx.restore();
}

function drawPlanet(state, ctx, p) {
  const pos = planetPos(p);
  const r = 18 + p.extractorLevel * 1.5;
  ctx.save();
  ctx.translate(pos.x, pos.y);

  const base = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r + 2);
  base.addColorStop(0, lightenHex(p.color, 0.28));
  base.addColorStop(1, darkenHex(p.color, 0.25));
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, Math.PI * 1.05, Math.PI * 1.88);
  ctx.stroke();

  if (p.type === "gas" || p.type === "ice") {
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 6, r * 0.55, Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (p.type === "rocky" || p.type === "volcanic") {
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath();
    ctx.arc(-5, -3, 3, 0, Math.PI * 2);
    ctx.arc(6, 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawExtractorMarks(ctx, r, p.extractorLevel);

  if (state.selected.kind === "planet" && state.selected.id === p.id) {
    drawSelectionRings(ctx, 0, 0, r + 7, state.time, "#64d5ff");
  }
  ctx.restore();
}

function drawExtractorMarks(ctx, r, level) {
  const marks = Math.min(6, Math.max(1, Math.floor(level / 2) + 1));
  for (let i = 0; i < marks; i++) {
    const ang = (Math.PI * 2 * i) / marks;
    const x = Math.cos(ang) * (r + 5);
    const y = Math.sin(ang) * (r + 5);
    ctx.fillStyle = "rgba(180,225,255,0.75)";
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoutes(state, ctx) {
  for (const s of state.ships) {
    const p = state.planets.find(x => x.id === s.planetId);
    if (!p) continue;
    const rev = s.state === "TRAVEL_TO_MOTHERSHIP" || s.state === "UNLOADING";
    const a = rev ? planetPos(p) : { x: 0, y: 0 };
    const b = rev ? { x: 0, y: 0 } : planetPos(p);
    const c = routeControl(a, b);

    const active = s.state.startsWith("TRAVEL");
    ctx.strokeStyle = active ? "rgba(120,205,255,0.45)" : "rgba(120,160,210,.16)";
    ctx.lineWidth = active ? 1.8 : 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.stroke();

    if (state.selected.kind === "ship" && state.selected.id === s.id) {
      const phase = (state.time / 500) % 1;
      drawDashedCurve(ctx, a, c, b, phase);
    }
  }
}

function drawDashedCurve(ctx, a, c, b, phase) {
  const segments = 26;
  for (let i = 0; i < segments; i++) {
    if ((i + Math.floor(phase * segments)) % 5 > 1) continue;
    const t0 = i / segments;
    const t1 = (i + 0.65) / segments;
    const p0 = bezier(a, c, b, t0);
    const p1 = bezier(a, c, b, t1);
    ctx.strokeStyle = "rgba(100,213,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

function drawShip(state, ctx, s) {
  const p = state.planets.find(x => x.id === s.planetId);
  if (!p) return;
  const from = { x: 0, y: 0 };
  const to = planetPos(p);
  const rev = s.state === "TRAVEL_TO_MOTHERSHIP" || s.state === "UNLOADING";
  const a = rev ? to : from;
  const b = rev ? from : to;
  const control = routeControl(a, b);
  const t = (s.state === "TRAVEL_TO_PLANET" || s.state === "TRAVEL_TO_MOTHERSHIP") ? s.progress : (rev ? 1 : 0);
  const pos = bezier(a, control, b, t);
  const heading = bezierTangent(a, control, b, t);
  const angle = Math.atan2(heading.y, heading.x);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.fillStyle = "#d4e8ff";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-7, 5);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-7, -5);
  ctx.closePath();
  ctx.fill();

  const thrustLen = s.state.startsWith("TRAVEL") ? 4 + 7 * (1 - Math.abs(t - 0.5) * 2) : 2;
  ctx.fillStyle = "rgba(100,213,255,.82)";
  ctx.fillRect(-10 - thrustLen, -1.5, thrustLen, 3);

  const cargoAmount = Object.values(s.cargo).reduce((acc, n) => acc + n, 0);
  if (cargoAmount > 0.1) {
    ctx.fillStyle = "#ffd46a";
    ctx.beginPath();
    ctx.arc(0, -8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.selected.kind === "ship" && state.selected.id === s.id) {
    drawSelectionRings(ctx, 0, 0, 11, state.time, "#64d5ff");
  }
  ctx.restore();
}

function drawPlanetPulses(state, ctx) {
  for (const pulse of state.fx.pulses || []) {
    const p = state.planets.find(x => x.id === pulse.planetId);
    if (!p || !p.unlocked) continue;
    const pos = planetPos(p);
    const lifeRatio = pulse.life / (pulse.maxLife || 1);
    const alpha = 0.35 * lifeRatio;
    const radius = 24 + (1 - lifeRatio) * 26;
    const color = RESOURCES[pulse.resource]?.color || "#64d5ff";
    ctx.strokeStyle = hexToRgba(color, alpha);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCargoBursts(state, ctx) {
  for (const burst of state.fx.bursts || []) {
    const lifeRatio = burst.life / (burst.maxLife || 1);
    const alpha = lifeRatio * 0.55;
    const radius = burst.size * (1 + (1 - lifeRatio) * 0.45);
    ctx.strokeStyle = `rgba(255,212,106,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFloaters(state, ctx) {
  for (const f of state.fx.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / 1.4);
    ctx.fillStyle = f.color;
    ctx.font = "12px sans-serif";
    ctx.fillText(f.text, f.x + 14, f.y - (1.4 - f.life) * 20 - 8);
    ctx.globalAlpha = 1;
  }
}

function drawSelectionRings(ctx, x, y, radius, time, color) {
  const pulse = 1 + Math.sin(time / 420) * 0.07;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(210,240,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, radius + 5 + Math.cos(time / 700) * 1.2, 0, Math.PI * 2);
  ctx.stroke();
}

function routeControl(a, b) {
  return { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.18, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.18 };
}

function bezier(a, c, b, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
    y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y,
  };
}

function bezierTangent(a, c, b, t) {
  return {
    x: 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x),
    y: 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y),
  };
}

function lightenHex(hex, amount) {
  const rgb = parseHex(hex);
  const apply = x => Math.min(255, Math.round(x + (255 - x) * amount));
  return `rgb(${apply(rgb.r)},${apply(rgb.g)},${apply(rgb.b)})`;
}

function darkenHex(hex, amount) {
  const rgb = parseHex(hex);
  const apply = x => Math.max(0, Math.round(x * (1 - amount)));
  return `rgb(${apply(rgb.r)},${apply(rgb.g)},${apply(rgb.b)})`;
}

function hexToRgba(hex, alpha) {
  const rgb = parseHex(hex);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function parseHex(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const value = Number.parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function hitTest(state, worldX, worldY) {
  for (const p of state.planets.filter(x => x.unlocked)) {
    const pos = planetPos(p);
    if (Math.hypot(worldX - pos.x, worldY - pos.y) < 24) return { kind: "planet", id: p.id };
  }
  if (Math.hypot(worldX, worldY) < 28) return { kind: "mothership", id: "mothership" };
  for (const s of state.ships) {
    const p = state.planets.find(x => x.id === s.planetId);
    const to = planetPos(p);
    const rev = s.state === "TRAVEL_TO_MOTHERSHIP" || s.state === "UNLOADING";
    const a = rev ? to : { x: 0, y: 0 };
    const b = rev ? { x: 0, y: 0 } : to;
    const c = routeControl(a, b);
    const t = (s.state === "TRAVEL_TO_PLANET" || s.state === "TRAVEL_TO_MOTHERSHIP") ? s.progress : (rev ? 1 : 0);
    const pos = bezier(a, c, b, t);
    if (Math.hypot(worldX - pos.x, worldY - pos.y) < 14) return { kind: "ship", id: s.id };
  }
  return null;
}
