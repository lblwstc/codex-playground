import { createInitialState } from "./modules/state.js";
import { tick } from "./modules/sim.js";
import { render, hitTest } from "./modules/render.js";
import { bindUI, drawPanels, drawTopBar } from "./modules/ui.js";
import { loadGame, saveGame, resetSave, applyOfflineProgress } from "./modules/storage.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const refs = {
  topBar: document.getElementById("topBar"),
  leftPanel: document.getElementById("leftPanel"),
  rightPanel: document.getElementById("rightPanel"),
  mobileTabs: document.getElementById("mobileTabs"),
  mobileSheet: document.getElementById("mobileSheet"),
};

const loaded = loadGame();
const state = loaded || createInitialState();
if (loaded) applyOfflineProgress(state);
state.settings = { fxQuality: "high", reducedMotion: false, ...(state.settings || {}) };
state.fx = { floaters: [], pulses: [], bursts: [], twinkleSeed: Math.random() * 9999, ...(state.fx || {}) };
window.resetSave = () => { resetSave(); location.reload(); };

bindUI(state, refs);
setupCanvas();
setupInput();

let accumulator = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  accumulator += dt;
  while (accumulator >= 0.1) {
    tick(state);
    accumulator -= 0.1;
  }
  drawTopBar(state, refs.topBar);
  drawPanels(state, refs);
  render(state, ctx, canvas);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(() => saveGame(state), 5000);
window.addEventListener("beforeunload", () => saveGame(state));

function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);
}

function setupInput() {
  const pointers = new Map();
  let lastDist = 0;

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });
  });

  canvas.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const curr = { x: e.clientX, y: e.clientY, moved: true };
    pointers.set(e.pointerId, curr);

    if (pointers.size === 1) {
      state.camera.x += curr.x - prev.x;
      state.camera.y += curr.y - prev.y;
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastDist) {
        state.camera.zoom *= dist / lastDist;
        state.camera.zoom = Math.min(2.2, Math.max(0.45, state.camera.zoom));
      }
      lastDist = dist;
    }
  });

  canvas.addEventListener("pointerup", (e) => {
    const down = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastDist = 0;
    if (!down?.moved) {
      const world = screenToWorld(e.clientX, e.clientY);
      const target = hitTest(state, world.x, world.y);
      if (target) state.selected = target;
    }
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    state.camera.zoom = Math.min(2.2, Math.max(0.45, state.camera.zoom * factor));
  }, { passive: false });
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left - rect.width / 2;
  const sy = clientY - rect.top - rect.height / 2;
  return {
    x: (sx - state.camera.x) / state.camera.zoom,
    y: (sy - state.camera.y) / state.camera.zoom,
  };
}
