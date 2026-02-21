import { clamp } from "./utils.js";
import { tryPlaceBuilding } from "./sim.js";

export function attachInput(canvas, state, renderer, refreshUI) {
  const pointers = new Map();
  let dragStart = null;

  const updateGhost = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const { tx, ty } = renderer.screenToTile(clientX - rect.left, clientY - rect.top);
    if (tx < 0 || ty < 0 || tx >= 48 || ty >= 32) return;
    const attempt = tryPlaceBuildingPreview(state, tx, ty, state.ui.placeMode);
    state.ui.ghostTile = { x: tx, y: ty, valid: attempt.ok };
  };

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, camX: state.camera.x, camY: state.camera.y };
      updateGhost(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (!dragStart?.pinchDist) {
        dragStart = { ...dragStart, pinchDist: Math.hypot(a.x - b.x, a.y - b.y), pinchZoom: state.camera.zoom };
      }
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      state.camera.zoom = clamp((dragStart.pinchZoom * d) / dragStart.pinchDist, 0.6, 2.5);
      renderer.clampCamera();
      return;
    }

    if (pointers.size === 1 && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      state.camera.x = dragStart.camX + dx;
      state.camera.y = dragStart.camY + dy;
      renderer.clampCamera();
      updateGhost(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener("pointerup", (e) => {
    const hadOne = pointers.size === 1;
    const point = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);

    if (hadOne && dragStart && point) {
      const moved = Math.hypot(point.x - dragStart.x, point.y - dragStart.y);
      if (moved < 8 && state.ui.placeMode) {
        const rect = canvas.getBoundingClientRect();
        const { tx, ty } = renderer.screenToTile(e.clientX - rect.left, e.clientY - rect.top);
        const placed = tryPlaceBuilding(state, state.activePlanetId, tx, ty, state.ui.placeMode);
        if (!placed.ok) state.ui.invalidPulseUntil = performance.now() + 300;
        else state.ui.message = `${state.ui.placeMode} placed`;
        refreshUI();
      }
    }

    if (pointers.size === 0) {
      dragStart = null;
      state.ui.ghostTile = null;
    }
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    state.camera.zoom = clamp(state.camera.zoom + delta, 0.6, 2.5);
    renderer.clampCamera();
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    const step = 30;
    if (["ArrowLeft", "a", "A"].includes(e.key)) state.camera.x += step;
    if (["ArrowRight", "d", "D"].includes(e.key)) state.camera.x -= step;
    if (["ArrowUp", "w", "W"].includes(e.key)) state.camera.y += step;
    if (["ArrowDown", "s", "S"].includes(e.key)) state.camera.y -= step;
    renderer.clampCamera();
  });
}

function tryPlaceBuildingPreview(state, tx, ty, type) {
  const pState = state.planets[state.activePlanetId];
  const tile = pState.map.tiles[ty * 48 + tx];
  if (!tile) return { ok: false };
  const occupied = pState.buildings.extractors.some((b) => b.x === tx && b.y === ty) || ["power", "lab", "storage"].some((k) => {
    const b = pState.buildings[k];
    return b.placed && b.x === tx && b.y === ty;
  });
  if (occupied) return { ok: false };
  if (type === "extractor") return { ok: tile.type === "node" };
  if (type === "power" || type === "lab" || type === "storage") return { ok: tile.type === "empty" && !pState.buildings[type].placed };
  return { ok: false };
}
