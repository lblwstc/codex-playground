import { createRenderer } from './modules/render.js';
import { runTick, TICK_DT } from './modules/sim.js';
import { loadGame, saveGame } from './modules/storage.js';
import { createUI } from './modules/ui.js';

const state = loadGame();
const canvas = document.getElementById('gameCanvas');
const renderer = createRenderer(canvas, state);
const ui = createUI(state, renderer);

renderer.resize();
window.addEventListener('resize', renderer.resize);

let accumulator = 0;
let last = performance.now();

const loop = (now) => {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  accumulator += dt;
  while (accumulator >= TICK_DT) {
    runTick(state);
    accumulator -= TICK_DT;
  }

  ui.renderDOM();
  renderer.draw();
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
setInterval(() => saveGame(state), 8000);
window.addEventListener('beforeunload', () => saveGame(state));
