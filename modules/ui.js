import { RESOURCES, TECH_DEFS } from './content.js';
import { assignShip, buyShip, unlockPlanet, unlockTech, upgradeExtractor } from './sim.js';

export const createUI = (state, renderer) => {
  const els = {
    resourceBar: document.getElementById('resourceBar'),
    actionsPanel: document.getElementById('actionsPanel'),
    detailsPanel: document.getElementById('detailsPanel'),
    techPanel: document.getElementById('techPanel'),
    mobileTabs: [...document.querySelectorAll('.mobile-tab')],
    mobileSheets: [...document.querySelectorAll('[data-mobile-sheet]')],
    resetBtn: document.getElementById('resetSaveBtn')
  };

  const setToast = (text) => {
    state.ui.toast = text;
    window.clearTimeout(setToast.timeout);
    setToast.timeout = window.setTimeout(() => { state.ui.toast = ''; }, 1600);
  };

  const renderDOM = () => {
    renderResources(els.resourceBar, state);
    renderActions(els.actionsPanel, state, setToast);
    renderDetails(els.detailsPanel, state, setToast);
    renderTech(els.techPanel, state, setToast);
    syncMobileTabs(els, state);
  };

  bindCanvasInput(state, renderer, setToast);
  bindTabs(els, state);

  els.resetBtn.addEventListener('click', () => {
    localStorage.removeItem('planet-hauler-save-v1');
    location.reload();
  });

  return { renderDOM };
};

function renderResources(container, state) {
  container.innerHTML = Object.values(RESOURCES).map((res) => {
    const val = state.resources[res.key] || 0;
    const cap = state.mothership.capacity[res.key] || 0;
    const rate = state.rates[res.key] || 0;
    return `<div class="resource-pill">
      <span class="dot" style="background:${res.color}"></span>
      <span>${res.label}: <strong>${val.toFixed(0)}/${cap}</strong></span>
      <span class="rate">${rate >= 0 ? '+' : ''}${rate.toFixed(1)}/s</span>
    </div>`;
  }).join('');
}

function renderActions(container, state, toast) {
  const unlockables = state.planets.filter((p) => !p.unlocked);
  container.innerHTML = '';

  const shipBtn = button(`Buy Ship (${state.ships.length})`, () => {
    if (!buyShip(state)) toast('Insufficient resources for ship.');
  });
  container.append(section('Fleet', [shipBtn]));

  const unlockRows = unlockables.map((p) => button(
    `Unlock ${p.name} (${costString(p.unlockCost)})`,
    () => { if (!unlockPlanet(state, p.id)) toast('Cannot unlock yet.'); }
  ));
  container.append(section('Planets', unlockRows.length ? unlockRows : [smallText('All planets unlocked.')]))

  container.append(section('System', [smallText(state.ui.toast || 'Maintain balanced logistics for best throughput.')]))
}

function renderDetails(container, state, toast) {
  container.innerHTML = '';
  const sel = state.selected;

  if (sel.kind === 'planet') {
    const p = state.planets.find((it) => it.id === sel.id);
    if (!p) return;
    container.append(section(`${p.name} (${p.type})`, [
      smallText(`Primary: ${p.primaryResource} • Secondary: ${p.secondaryResource || 'None'}`),
      smallText(`Richness x${p.richness.toFixed(2)} • Distance ${p.distance}`),
      smallText(`Extractor ${p.extractorLevel}/${p.extractorSlots}`),
      smallText(`Buffer: ${Object.entries(p.buffer).map(([k, v]) => `${k}:${v.toFixed(0)}`).join(' | ')}`),
      button(`Upgrade Extractor (${costString(extractorCost(p.extractorLevel + 1))})`, () => {
        if (!upgradeExtractor(state, p.id)) toast('Cannot upgrade extractor.');
      })
    ]));
    return;
  }

  if (sel.kind === 'ship') {
    const s = state.ships.find((it) => it.id === sel.id);
    if (!s) return;
    const planetOptions = state.planets.filter((p) => p.unlocked).map((p) => `<option value="${p.id}" ${p.id === s.assignedPlanetId ? 'selected' : ''}>${p.name}</option>`).join('');
    const wrap = section(`Ship ${s.id}`, [
      smallText(`State: ${s.state}`),
      smallText(`Capacity: ${s.capacity.toFixed(0)} • Speed: ${s.speed.toFixed(0)}`),
      smallText(`Cargo: ${Object.entries(s.cargo).map(([k, v]) => `${k}:${v.toFixed(0)}`).join(' | ')}`)
    ]);
    const select = document.createElement('select');
    select.innerHTML = planetOptions;
    select.className = 'route-select';
    select.addEventListener('change', () => assignShip(state, s.id, select.value));
    wrap.append(select);
    container.append(wrap);
    return;
  }

  container.append(section('Mothership', [
    smallText('Central hub for storage, tech, and route command.'),
    smallText(`Fleet: ${state.ships.length} ships`),
    smallText(`Route AI: ${state.flags.routeAI ? 'Online' : 'Offline'}`)
  ]));
}

function renderTech(container, state, toast) {
  container.innerHTML = '';
  TECH_DEFS.forEach((tech) => {
    const unlocked = state.unlockedTech.includes(tech.id);
    const prereqMet = tech.prereqs.every((p) => state.unlockedTech.includes(p));
    const row = document.createElement('div');
    row.className = `tech-card ${unlocked ? 'unlocked' : ''}`;
    row.innerHTML = `<div class="tech-title">${tech.name}</div>
      <div class="tech-desc">${tech.description}</div>
      <div class="tech-meta">Cost: ${costString(tech.cost)}${tech.prereqs.length ? ` • Prereq: ${tech.prereqs.join(', ')}` : ''}</div>`;
    const btn = document.createElement('button');
    btn.textContent = unlocked ? 'Unlocked' : 'Research';
    btn.disabled = unlocked;
    btn.className = 'action-btn';
    btn.addEventListener('click', () => {
      if (!prereqMet || !unlockTech(state, tech.id)) toast('Tech requirements not met.');
    });
    row.append(btn);
    if (!prereqMet && !unlocked) row.classList.add('locked');
    container.append(row);
  });
}

function bindTabs(els, state) {
  els.mobileTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.ui.mobileTab = tab.dataset.tab;
    });
  });
}

function syncMobileTabs(els, state) {
  const tab = state.ui.mobileTab;
  els.mobileTabs.forEach((it) => it.classList.toggle('active', it.dataset.tab === tab));
  els.mobileSheets.forEach((sheet) => sheet.classList.toggle('active', sheet.dataset.mobileSheet === tab));
}

function bindCanvasInput(state, renderer) {
  const canvas = renderer.ctx.canvas;

  const pick = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const world = renderer.screenToWorld(clientX - rect.left, clientY - rect.top);
    const mothershipDist = Math.hypot(world.x, world.y);
    if (mothershipDist < 55) {
      state.selected = { kind: 'mothership', id: 'mothership' };
      return;
    }

    for (const p of state.planets) {
      if (Math.hypot(world.x - p.worldPos.x, world.y - p.worldPos.y) < 34) {
        state.selected = { kind: 'planet', id: p.id };
        return;
      }
    }

    for (const s of state.ships) {
      const planet = state.planets.find((p) => p.id === s.assignedPlanetId && p.unlocked);
      if (!planet) continue;
      const from = s.state === 'TRAVEL_TO_MOTHERSHIP' || s.state === 'UNLOADING' ? planet.worldPos : { x: 0, y: 0 };
      const to = s.state === 'TRAVEL_TO_MOTHERSHIP' || s.state === 'UNLOADING' ? { x: 0, y: 0 } : planet.worldPos;
      const t = (s.state === 'LOADING' || s.state === 'UNLOADING') ? 1 : s.progress;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      if (Math.hypot(world.x - x, world.y - y) < 18) {
        state.selected = { kind: 'ship', id: s.id };
        return;
      }
    }
  };

  const clampZoom = () => { state.camera.zoom = Math.max(0.55, Math.min(2.1, state.camera.zoom)); };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    state.input.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    state.input.dragging = state.input.activePointers.size > 0;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!state.input.activePointers.has(e.pointerId)) return;
    const prev = state.input.activePointers.get(e.pointerId);
    state.input.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.input.activePointers.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      state.camera.x -= dx / state.camera.zoom;
      state.camera.y -= dy / state.camera.zoom;
      return;
    }

    if (state.input.activePointers.size >= 2) {
      const points = [...state.input.activePointers.values()];
      const d = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (state.input.pinchDistance != null) {
        const delta = d - state.input.pinchDistance;
        state.camera.zoom *= 1 + delta * 0.003;
        clampZoom();
      }
      state.input.pinchDistance = d;
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    const hadTwo = state.input.activePointers.size >= 2;
    state.input.activePointers.delete(e.pointerId);
    if (state.input.activePointers.size < 2) state.input.pinchDistance = null;
    if (!hadTwo) pick(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointercancel', () => {
    state.input.activePointers.clear();
    state.input.pinchDistance = null;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.camera.zoom *= e.deltaY > 0 ? 0.94 : 1.06;
    clampZoom();
  }, { passive: false });
}

const button = (label, handler) => {
  const b = document.createElement('button');
  b.className = 'action-btn';
  b.textContent = label;
  b.addEventListener('click', handler);
  return b;
};

const smallText = (text) => {
  const p = document.createElement('p');
  p.className = 'small-text';
  p.textContent = text;
  return p;
};

const section = (title, nodes) => {
  const s = document.createElement('section');
  s.className = 'panel-section';
  const h = document.createElement('h3');
  h.textContent = title;
  s.append(h, ...nodes);
  return s;
};

const costString = (cost) => Object.entries(cost).map(([k, v]) => `${k}:${Math.round(v)}`).join(' ');
const extractorCost = (next) => ({ ore: next * 20, water: next * 14, bio: next * 10, energy: next * 12 });
