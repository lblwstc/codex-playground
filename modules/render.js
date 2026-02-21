import { RESOURCES } from './content.js';
import { getPlanetTypeVisual } from './state.js';

export const createRenderer = (canvas, state) => {
  const ctx = canvas.getContext('2d');

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const worldToScreen = (x, y) => ({
    x: (x - state.camera.x) * state.camera.zoom + canvas.clientWidth * 0.5,
    y: (y - state.camera.y) * state.camera.zoom + canvas.clientHeight * 0.5
  });

  const screenToWorld = (x, y) => ({
    x: (x - canvas.clientWidth * 0.5) / state.camera.zoom + state.camera.x,
    y: (y - canvas.clientHeight * 0.5) / state.camera.zoom + state.camera.y
  });

  const draw = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    drawBackground(ctx, state, worldToScreen);
    drawRoutes(ctx, state, worldToScreen);
    drawMothership(ctx, state, worldToScreen);
    drawPlanets(ctx, state, worldToScreen);
    drawShips(ctx, state, worldToScreen);
    drawFloatTexts(ctx, state, worldToScreen);
  };

  return { draw, resize, worldToScreen, screenToWorld, ctx };
};

function drawBackground(ctx, state, worldToScreen) {
  const w = ctx.canvas.clientWidth;
  const h = ctx.canvas.clientHeight;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#090f1f');
  grad.addColorStop(1, '#070914');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (const s of state.effects.stars) {
    const p = worldToScreen(s.x, s.y);
    if (p.x < -3 || p.y < -3 || p.x > w + 3 || p.y > h + 3) continue;
    const twinkle = 0.4 + Math.sin(state.time * 2 + s.twinkle) * 0.3;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#d6e8ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.r * state.camera.zoom * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMothership(ctx, state, worldToScreen) {
  const p = worldToScreen(0, 0);
  const r = 36 * state.camera.zoom;

  ctx.save();
  ctx.translate(p.x, p.y);
  const glow = 8 + Math.sin(state.time * 2.2) * 3;
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#7cd6ff';
  ctx.fillStyle = '#274b68';
  roundedRect(ctx, -r, -r * 0.8, r * 2, r * 1.6, 12 * state.camera.zoom);
  ctx.fill();
  ctx.fillStyle = '#8ad8ff';
  ctx.fillRect(-r * 0.35, -r * 0.15, r * 0.7, r * 0.3);
  ctx.strokeStyle = '#bceeff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r + glow, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlanets(ctx, state, worldToScreen) {
  for (const planet of state.planets) {
    const p = worldToScreen(planet.worldPos.x, planet.worldPos.y);
    const baseRadius = 20 + planet.richness * 7;
    const r = baseRadius * state.camera.zoom;
    const v = getPlanetTypeVisual(planet.type);

    ctx.save();
    ctx.translate(p.x, p.y);
    if (!planet.unlocked) ctx.globalAlpha = 0.45;
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, v.accentColor);
    grad.addColorStop(1, v.baseColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    if (planet.type === 'gas') {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 3 * state.camera.zoom;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.45, r * 0.5, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (planet.type === 'rocky' || planet.type === 'volcanic') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.arc(-r * 0.2, r * 0.12, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    if (planet.type === 'ice') {
      ctx.strokeStyle = 'rgba(210,245,255,0.7)';
      ctx.lineWidth = 2 * state.camera.zoom;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, -0.7, 0.8);
      ctx.stroke();
    }

    const selected = state.selected.kind === 'planet' && state.selected.id === planet.id;
    if (selected) {
      ctx.strokeStyle = '#f5f9ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#f1f7ff';
    ctx.font = `${Math.max(10, 12 * state.camera.zoom)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(planet.name, 0, r + 16);
    ctx.restore();
  }
}

function drawRoutes(ctx, state, worldToScreen) {
  ctx.strokeStyle = 'rgba(170,210,255,0.24)';
  ctx.lineWidth = 1.5;
  for (const ship of state.ships) {
    const planet = state.planets.find((p) => p.id === ship.assignedPlanetId);
    if (!planet || !planet.unlocked) continue;
    const a = worldToScreen(0, 0);
    const b = worldToScreen(planet.worldPos.x, planet.worldPos.y);
    const c = controlPoint(a, b);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.stroke();
  }
}

function drawShips(ctx, state, worldToScreen) {
  for (const ship of state.ships) {
    const planet = state.planets.find((p) => p.id === ship.assignedPlanetId);
    if (!planet || !planet.unlocked) continue;

    const from = ship.state === 'TRAVEL_TO_MOTHERSHIP' || ship.state === 'UNLOADING'
      ? planet.worldPos
      : { x: 0, y: 0 };
    const to = ship.state === 'TRAVEL_TO_MOTHERSHIP' || ship.state === 'UNLOADING'
      ? { x: 0, y: 0 }
      : planet.worldPos;

    let wp;
    if (ship.state === 'LOADING') wp = { ...planet.worldPos };
    else if (ship.state === 'UNLOADING') wp = { x: 0, y: 0 };
    else wp = bezierPoint(from, to, ship.progress);

    const p = worldToScreen(wp.x, wp.y);
    const heading = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(heading + Math.PI / 2);
    const sel = state.selected.kind === 'ship' && state.selected.id === ship.id;
    if (sel) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawTrail(ctx, state.time);
    ctx.fillStyle = '#d2e9ff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 8);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();

    const cargoAmount = Object.values(ship.cargo).reduce((sum, v) => sum + v, 0);
    if (cargoAmount > 0.5) {
      ctx.fillStyle = '#f6d783';
      ctx.fillRect(-4, 8, 8, 3);
    }
    ctx.restore();
  }
}

function drawTrail(ctx, t) {
  ctx.strokeStyle = `rgba(119,213,255,${0.55 + Math.sin(t * 10) * 0.2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1, 9);
  ctx.lineTo(0, 14);
  ctx.stroke();
}

function drawFloatTexts(ctx, state, worldToScreen) {
  for (const f of state.effects.floatTexts) {
    const p = worldToScreen(f.x, f.y);
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function controlPoint(a, b) {
  return {
    x: (a.x + b.x) / 2 + (b.y - a.y) * 0.18,
    y: (a.y + b.y) / 2 - (b.x - a.x) * 0.18
  };
}

function bezierPoint(from, to, t) {
  const cp = {
    x: (from.x + to.x) / 2 + (to.y - from.y) * 0.18,
    y: (from.y + to.y) / 2 - (to.x - from.x) * 0.18
  };
  const i = 1 - t;
  return {
    x: i * i * from.x + 2 * i * t * cp.x + t * t * to.x,
    y: i * i * from.y + 2 * i * t * cp.y + t * t * to.y
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
