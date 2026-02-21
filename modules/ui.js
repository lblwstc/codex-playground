import { RESOURCES, UPGRADES } from "./content.js";
import { buyShip, unlockPlanet, upgradeExtractor, buyUpgrade, canAfford } from "./sim.js";

export function bindUI(state, refs) {
  refs.mobileTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
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
  const action = b.dataset.action;
  if (action === "buyShip") buyShip(state);
  if (action.startsWith("unlock:")) unlockPlanet(state, action.split(":")[1]);
  if (action.startsWith("extractor:")) upgradeExtractor(state, action.split(":")[1]);
  if (action.startsWith("tech:")) buyUpgrade(state, action.split(":")[1]);
  if (action.startsWith("fx:")) state.settings.fxQuality = action.split(":")[1];
  if (action === "motion:toggle") state.settings.reducedMotion = !state.settings.reducedMotion;
  if (action.startsWith("assign:")) {
    const pid = action.split(":")[1];
    const ship = state.ships.find(s => s.id === state.selected.id);
    if (ship) ship.planetId = pid;
  }
  drawPanels(state, refs);
}

export function drawTopBar(state, topBar) {
  const prev = state.uiPrevResources || { ...state.resources };
  topBar.innerHTML = Object.entries(RESOURCES).map(([id, r]) => {
    const cur = state.resources[id].toFixed(1);
    const cap = state.storageCap[id].toFixed(0);
    const rate = state.rates[id].toFixed(1);
    const gained = state.resources[id] > (prev[id] || 0) + 0.01;
    return `<div class="resourceChip ${gained ? "gainPulse" : ""}"><span class="resourceDot" style="background:${r.color}"></span>${r.name}: ${cur}/${cap} <span class="meta">(+${rate}/s)</span></div>`;
  }).join("");
  state.uiPrevResources = { ...state.resources };
}

export function drawPanels(state, refs) {
  refs.leftPanel.innerHTML = renderActions(state);
  refs.rightPanel.innerHTML = renderDetails(state);
  refs.mobileSheet.innerHTML = state.mobileTab === "actions" ? renderActions(state) : (state.mobileTab === "details" ? renderDetails(state) : renderTech(state));
}

function renderActions(state) {
  const unlocked = state.planets.filter(p => p.unlocked).length;
  const next = state.planets.find(p => !p.unlocked);
  const shipCost = { ore: 60 + state.ships.length * 35, energy: 20 + state.ships.length * 12 };
  return `<h3>Actions</h3>
    <div class="card">Ships: ${state.ships.length}
      <button data-action="buyShip" ${canAfford(state, shipCost) ? "" : "disabled"}>Buy Ship (${fmtCost(shipCost)})</button>
    </div>
    <div class="card">Unlocked Planets: ${unlocked}/${state.planets.length}
      ${next ? `<button data-action="unlock:${next.id}" ${canAfford(state, next.unlockCost) ? "" : "disabled"}>Unlock ${next.name} (${fmtCost(next.unlockCost)})</button>` : "All planets unlocked"}
    </div>
    ${renderSettings(state)}${renderTech(state)}`;
}


function renderSettings(state) {
  const q = state.settings?.fxQuality || "high";
  return `<h3>Visual</h3><div class="card">
    <div class="meta">Quality & accessibility</div>
    <button data-action="fx:high" ${q === "high" ? "disabled" : ""}>FX Quality: High</button>
    <button data-action="fx:medium" ${q === "medium" ? "disabled" : ""}>FX Quality: Medium</button>
    <button data-action="fx:low" ${q === "low" ? "disabled" : ""}>FX Quality: Low</button>
    <button data-action="motion:toggle">Reduced Motion: ${state.settings?.reducedMotion ? "On" : "Off"}</button>
  </div>`;
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
    const cost = { ore: 25 * p.extractorLevel, bio: 10 * p.extractorLevel };
    return `<h3>${p.name}</h3>
      <div class="card">Type: ${p.type}<br/>Primary: ${p.primaryResource}<br/>Richness: x${p.richness}<br/>Distance: ${p.distance}
      <div class="meta">Extractor Lv.${p.extractorLevel} (slots ${p.extractorSlots})</div>
      <div class="meta">Buffer: ${p.buffer[p.primaryResource].toFixed(1)}</div>
      <button data-action="extractor:${p.id}" ${canAfford(state, cost) ? "" : "disabled"}>Upgrade Extractor (${fmtCost(cost)})</button></div>`;
  }
  if (state.selected.kind === "ship") {
    const s = state.ships.find(x => x.id === state.selected.id);
    return `<h3>${s.id}</h3><div class="card">State: ${s.state}<br/>Route: Mothership ↔ ${s.planetId}<br/>ETA: ${(1 - s.progress).toFixed(2)}
      <div class="meta">Cargo: ${Object.entries(s.cargo).filter(([,v]) => v>0.05).map(([k,v]) => `${k}:${v.toFixed(1)}`).join(", ") || "Empty"}</div>
      ${state.planets.filter(p => p.unlocked).map(p => `<button data-action="assign:${p.id}">Assign ${p.name}</button>`).join("")}
    </div>`;
  }
  return `<h3>Mothership</h3><div class="card">Hub operational.<br/>Fleet: ${state.ships.length}<br/>Upgrades: ${state.unlockedUpgrades.length}
    </div>`;
}

function fmtCost(cost) {
  return Object.entries(cost).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(", ");
}
