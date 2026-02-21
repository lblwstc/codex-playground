import { RESOURCES } from "./content.js";

export function render(state, ctx, canvas) {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawStars(state, ctx, w, h);

  ctx.save();
  ctx.translate(w / 2 + state.camera.x, h / 2 + state.camera.y);
  ctx.scale(state.camera.zoom, state.camera.zoom);

  drawMothership(state, ctx);
  state.planets.filter(p => p.unlocked).forEach(p => drawPlanet(state, ctx, p));
  state.ships.forEach(s => drawShip(state, ctx, s));
  drawFloaters(state, ctx);

  ctx.restore();
}

function drawStars(state, ctx, w, h) {
  for (let i = 0; i < 90; i++) {
    const t = state.time / 1300 + i * 17 + state.fx.twinkleSeed;
    const x = ((i * 173) % w);
    const y = ((i * 97) % h);
    const a = 0.25 + (Math.sin(t) + 1) * 0.2;
    ctx.fillStyle = `rgba(200,220,255,${a})`;
    ctx.fillRect(x, y, 2, 2);
  }
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
  ctx.strokeStyle = "#d5ecff";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (state.selected.kind === "mothership") {
    ctx.strokeStyle = "rgba(100,213,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanet(state, ctx, p) {
  const pos = planetPos(p);
  const r = 18 + p.extractorLevel * 1.5;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
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
  if (state.selected.kind === "planet" && state.selected.id === p.id) {
    ctx.strokeStyle = "#64d5ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShip(state, ctx, s) {
  const p = state.planets.find(x => x.id === s.planetId);
  if (!p) return;
  const from = { x: 0, y: 0 }, to = planetPos(p);
  const rev = s.state === "TRAVEL_TO_MOTHERSHIP" || s.state === "UNLOADING";
  const a = rev ? to : from;
  const b = rev ? from : to;
  const control = { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.18, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.18 };
  const t = (s.state === "TRAVEL_TO_PLANET" || s.state === "TRAVEL_TO_MOTHERSHIP") ? s.progress : (rev ? 1 : 0);
  const pos = bezier(a, control, b, t);
  const heading = bezierTangent(a, control, b, t);
  const angle = Math.atan2(heading.y, heading.x);

  ctx.strokeStyle = "rgba(120,160,210,.2)";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
  ctx.stroke();

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.fillStyle = "#d4e8ff";
  ctx.beginPath();
  ctx.moveTo(8, 0); ctx.lineTo(-7, 5); ctx.lineTo(-4, 0); ctx.lineTo(-7, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(100,213,255,.8)";
  ctx.fillRect(-10, -1.5, 4, 3);

  const cargoAmount = Object.values(s.cargo).reduce((acc, n) => acc + n, 0);
  if (cargoAmount > 0.1) {
    ctx.fillStyle = "#ffd46a";
    ctx.beginPath();
    ctx.arc(0, -8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.selected.kind === "ship" && state.selected.id === s.id) {
    ctx.strokeStyle = "#64d5ff";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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
    const c = { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.18, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.18 };
    const t = (s.state === "TRAVEL_TO_PLANET" || s.state === "TRAVEL_TO_MOTHERSHIP") ? s.progress : (rev ? 1 : 0);
    const pos = bezier(a, c, b, t);
    if (Math.hypot(worldX - pos.x, worldY - pos.y) < 14) return { kind: "ship", id: s.id };
  }
  return null;
}
