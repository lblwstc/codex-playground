import { INDUSTRIES, RESOURCES, UPGRADES } from "./content.js";
import { buyShip, unlockPlanet, upgradeExtractor, buyUpgrade, canAfford, establishColony, upgradeIndustry } from "./sim.js";

let clickAudioCtx;

function playClickSound() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;

  if (!clickAudioCtx) clickAudioCtx = new AudioContextCtor();
  if (clickAudioCtx.state === "suspended") clickAudioCtx.resume();

  const now = clickAudioCtx.currentTime;
  const osc = clickAudioCtx.createOscillator();
  const gain = clickAudioCtx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(680, now + 0.03);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  osc.connect(gain);
  gain.connect(clickAudioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.055);
}

export function bindUI(state, refs) {
  refs.mobileTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    playClickSound();
    state.mobileTab = btn.dataset.tab;
    [...refs.mobileTabs.querySelectorAll("button")].forEach(b => b.classList.toggle("active", b === btn));
    drawPanels(state, refs);
  });

  refs.leftPanel.addEventListener("click", (e) => handleActionClick(state, refs, e));
  refs.rightPanel.addEventListener("click", (e) => handleActionClick(state, refs, e));
  refs.mobileSheet.addEventListener("click", (e) => handleActionClick(state, refs, e));
}

function handleActionClick(state, refs, e) {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  playClickSound();
  const action = b.dataset.action;
  if (action === "buyShip") buyShip(state);
  if (action.startsWith("unlock:")) unlockPlanet(state, action.split(":")[1]);
  if (action.startsWith("extractor:")) upgradeExtractor(state, action.split(":")[1]);
  if (action.startsWith("tech:")) buyUpgrade(state, action.split(":")[1]);
  if (action.startsWith("colony:")) establishColony(state, action.split(":")[1]);
  if (action.startsWith("industry:")) {
    const [, pid, iid] = action.split(":");
    upgradeIndustry(state, pid, iid);
  }
  if (action.startsWith("assign:")) {
    const pid = action.split(":")[1];
    const ship = state.ships.find(s => s.id === state.selected.id);
    if (ship) ship.planetId = pid;
  }
  drawPanels(state, refs);
}

export function drawTopBar(state, topBar) {
  topBar.innerHTML = Object.entries(RESOURCES).map(([id, r]) => {
    const cur = (state.resources[id] || 0).toFixed(1);
    const cap = (state.storageCap[id] || 0).toFixed(0);
    const rate = (state.rates[id] || 0).toFixed(1);
    return `<div class="resourceChip"><span class="resourceDot" style="background:${r.color}"></span>${r.name}: ${cur}/${cap} <span class="meta">(+${rate}/s)</span></div>`;
  }).join("");
}

export function drawPanels(state, refs) {
  refs.leftPanel.innerHTML = renderActions(state);
  refs.rightPanel.innerHTML = renderDetails(state);
  refs.mobileSheet.innerHTML = state.mobileTab === "actions" ? renderActions(state) : (state.mobileTab === "details" ? renderDetails(state) : renderTech(state));
}

function renderActions(state) {
  const unlocked = state.planets.filter(p => p.unlocked).length;
  const next = state.planets.find(p => !p.unlocked);
  const shipCost = { ore: 60 + state.ships.length * 35, energy: 20 + state.ships.length * 12, alloy: state.ships.length > 2 ? 14 + state.ships.length * 3 : 0 };
  return `<h3>Actions</h3>
    <div class="card">Ships: ${state.ships.length}
      <button data-action="buyShip" ${canAfford(state, shipCost) ? "" : "disabled"}>Buy Ship (${fmtCost(shipCost)})</button>
    </div>
    <div class="card">Unlocked Planets: ${unlocked}/${state.planets.length}
      ${next ? `<button data-action="unlock:${next.id}" ${canAfford(state, next.unlockCost) ? "" : "disabled"}>Unlock ${next.name} (${fmtCost(next.unlockCost)})</button>` : "All planets unlocked"}
    </div>
    ${renderTech(state)}`;
}

function renderTech(state) {
  return `<h3>Tech</h3>${UPGRADES.map(up => {
    const unlocked = state.unlockedUpgrades.includes(up.id);
    const prereqMet = up.prereq.every(x => state.unlockedUpgrades.includes(x));
    return `<div class="card">
      <strong>${up.name}</strong><div class="meta">${up.desc}</div>
      <div class="meta">Cost: ${fmtCost(up.cost)}</div>
      <div class="meta">Prereq: ${up.prereq.join(", ") || "None"}</div>
      <button data-action="tech:${up.id}" ${(unlocked || !prereqMet || !canAfford(state, up.cost)) ? "disabled" : ""}>${unlocked ? "Unlocked" : "Research"}</button>
    </div>`;
  }).join("")}`;
}

function renderDetails(state) {
  if (state.selected.kind === "planet") {
    const p = state.planets.find(x => x.id === state.selected.id);
    const cost = { ore: 25 * p.extractorLevel, bio: 10 * p.extractorLevel, silicon: Math.max(0, 8 * (p.extractorLevel - 1)) };
    const colonyCost = { ore: 80 + p.distance * 0.12, water: 35, energy: 40, bio: 30 };
    return `<h3>${p.name}</h3>
      <div class="card">Type: ${p.type}<br/>Richness: x${p.richness}<br/>Distance: ${p.distance}
      <div class="meta">Resource Mix: ${p.resourceProfile.map(x => `${RESOURCES[x.id].name} ${(x.share * 100).toFixed(0)}%`).join(", ")}</div>
      <div class="meta">Extractor Lv.${p.extractorLevel} (slots ${p.extractorSlots})</div>
      <div class="meta">Buffer: ${p.resourceProfile.map(x => `${RESOURCES[x.id].name} ${(p.buffer[x.id] || 0).toFixed(1)}`).join(", ")}</div>
      <button data-action="extractor:${p.id}" ${canAfford(state, cost) ? "" : "disabled"}>Upgrade Extractor (${fmtCost(cost)})</button></div>
      <div class="card"><strong>Colony</strong><br/>${p.colony.established ? `Population: ${Math.floor(p.colony.population)}` : "No colony established"}
        ${p.colony.established ? renderIndustryButtons(state, p) : `<button data-action="colony:${p.id}" ${canAfford(state, colonyCost) ? "" : "disabled"}>Establish Colony (${fmtCost(colonyCost)})</button>`}
      </div>`;
  }
  if (state.selected.kind === "ship") {
    const s = state.ships.find(x => x.id === state.selected.id);
    return `<h3>${s.id}</h3><div class="card">State: ${s.state}<br/>Route: Mothership ↔ ${s.planetId}<br/>ETA: ${(1 - s.progress).toFixed(2)}
      <div class="meta">Cargo: ${Object.entries(s.cargo).filter(([, v]) => v > 0.05).map(([k, v]) => `${k}:${v.toFixed(1)}`).join(", ") || "Empty"}</div>
      ${state.planets.filter(p => p.unlocked).map(p => `<button data-action="assign:${p.id}">Assign ${p.name}</button>`).join("")}
    </div>`;
  }
  return `<h3>Mothership</h3><div class="card">Hub operational.<br/>Fleet: ${state.ships.length}<br/>Upgrades: ${state.unlockedUpgrades.length}
    <div class="meta">Colonies: ${state.planets.filter(p => p.colony.established).length}</div></div>`;
}

function renderIndustryButtons(state, p) {
  return Object.entries(INDUSTRIES).map(([id, info]) => {
    const lv = p.colony.industries[id] || 0;
    const scalar = 1 + lv * 0.85;
    const cost = Object.fromEntries(Object.entries(info.baseCost).map(([k, v]) => [k, Math.floor(v * scalar)]));
    return `<div class="meta">${info.name} Lv.${lv} — ${info.desc}
      <button data-action="industry:${p.id}:${id}" ${canAfford(state, cost) ? "" : "disabled"}>Develop (${fmtCost(cost)})</button>
    </div>`;
  }).join("");
}

function fmtCost(cost) {
  return Object.entries(cost).filter(([, v]) => v > 0).map(([k, v]) => `${Math.floor(v)} ${k}`).join(", ");
}
