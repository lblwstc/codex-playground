import { planets, techDefs, techDiscount, techCost } from "./balance.js";
import { formatNum } from "./utils.js";
import { getResourcePerSecond, tryBuyTech, tryUnlock, tryUpgrade } from "./sim.js";
import { exportSave, importSave, clearSave } from "./save.js";

export function setupUI(state, onStateChanged) {
  const resBar = document.querySelector("#resourceBar");
  const tabs = document.querySelector("#tabs");
  const panel = document.querySelector("#panel");

  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    state.ui.currentTab = btn.dataset.tab;
    render();
  });

  panel.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]");
    if (!action) return;
    const planetId = state.activePlanetId;
    if (action.dataset.action === "set-planet") {
      state.activePlanetId = action.dataset.id;
      onStateChanged();
    } else if (action.dataset.action === "unlock") {
      tryUnlock(state, action.dataset.id);
      onStateChanged();
    } else if (action.dataset.action === "place") {
      state.ui.placeMode = action.dataset.type;
      onStateChanged();
    } else if (action.dataset.action === "cancel-place") {
      state.ui.placeMode = null;
      onStateChanged();
    } else if (action.dataset.action === "upg") {
      tryUpgrade(state, planetId, action.dataset.type, Number(action.dataset.idx));
      onStateChanged();
    } else if (action.dataset.action === "buy-tech") {
      tryBuyTech(state, action.dataset.tech);
      onStateChanged();
    } else if (action.dataset.action === "toggle-reduced") {
      state.settings.reducedMotion = !state.settings.reducedMotion;
      document.body.classList.toggle("reduce-motion", state.settings.reducedMotion);
      onStateChanged();
    } else if (action.dataset.action === "export") {
      panel.querySelector("#saveText").value = exportSave(state);
    } else if (action.dataset.action === "import") {
      const val = panel.querySelector("#saveText").value;
      const res = importSave(val);
      state.ui.message = res.ok ? "Save imported. Reloading..." : res.error;
      if (res.ok) location.reload();
    } else if (action.dataset.action === "reset") {
      clearSave();
      location.reload();
    }
  });

  function resLine(k, v, cap, perSec) {
    return `<div class="res-item"><strong>${k}</strong><span>${formatNum(v)} / ${formatNum(cap)} (+${perSec.toFixed(2)}/s)</span></div>`;
  }

  function renderPlanetTab() {
    const rates = getResourcePerSecond(state);
    return `
    <div class="cards">
      ${planets
        .map((p) => {
          const unlocked = state.planets[p.id].unlocked;
          const active = state.activePlanetId === p.id;
          const button = unlocked
            ? `<button data-action="set-planet" data-id="${p.id}">${active ? "Viewing" : "View"}</button>`
            : `<button data-action="unlock" data-id="${p.id}">Unlock</button>`;
          return `<article class="card ${active ? "active" : ""}">
            <h3>${p.name}</h3>
            <p>${unlocked ? `Production: ${rates[p.resource].toFixed(2)}/s` : "Locked"}</p>
            ${button}
          </article>`;
        })
        .join("")}
    </div>`;
  }

  function renderBuildTab() {
    const p = state.planets[state.activePlanetId].buildings;
    const extractorRows = p.extractors
      .map((e, i) => `<div class="row"><span>Extractor #${i + 1} L${e.level}</span><button data-action="upg" data-type="extractor" data-idx="${i}">Upgrade</button></div>`)
      .join("");

    return `<div>
      <div class="row"><button data-action="place" data-type="extractor">Place Extractor</button></div>
      <div class="row"><button data-action="place" data-type="power">Place Power Plant</button><button data-action="upg" data-type="power">Upgrade Power</button></div>
      <div class="row"><button data-action="place" data-type="lab">Place Research Lab</button><button data-action="upg" data-type="lab">Upgrade Lab</button></div>
      <div class="row"><button data-action="place" data-type="storage">Place Storage</button><button data-action="upg" data-type="storage">Upgrade Storage</button></div>
      <div class="row"><button data-action="cancel-place">Cancel Placement</button></div>
      <h4>Extractors</h4>
      ${extractorRows || "<p>No extractors yet.</p>"}
    </div>`;
  }

  function renderTechTab() {
    const labLvl = state.planets.terra.buildings.lab.level;
    const discount = techDiscount(labLvl);
    return `<div>${Object.entries(techDefs)
      .map(([k, v]) => {
        const rank = state.tech[k];
        const cost = techCost(k, rank + 1, discount);
        const costText = Object.entries(cost)
          .map(([rk, rv]) => `${rk[0].toUpperCase()}:${rv}`)
          .join(" ");
        return `<div class="tech-row"><div><strong>${v.label}</strong><p>Rank ${rank}/10</p></div><button data-action="buy-tech" data-tech="${k}">Buy (${costText})</button></div>`;
      })
      .join("")}</div>`;
  }

  function renderSettingsTab() {
    return `<div>
      <p>${state.ui.message}</p>
      <div class="row"><button data-action="toggle-reduced">Reduced Motion: ${state.settings.reducedMotion ? "ON" : "OFF"}</button></div>
      <textarea id="saveText" rows="6" placeholder="Exported save JSON"></textarea>
      <div class="row"><button data-action="export">Export Save</button><button data-action="import">Import Save</button></div>
      <div class="row"><button data-action="reset" class="danger">Reset Game</button></div>
    </div>`;
  }

  function render() {
    const rates = getResourcePerSecond(state);
    resBar.innerHTML = [
      resLine("Minerals", state.resources.minerals, state.caps.minerals, rates.minerals),
      resLine("Energy", state.resources.energy, state.caps.energy, rates.energy),
      resLine("Biomass", state.resources.biomass, state.caps.biomass, rates.biomass),
      resLine("Rare Gas", state.resources.rareGas, state.caps.rareGas, rates.rareGas),
    ].join("");

    tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.ui.currentTab));
    if (state.ui.currentTab === "planet") panel.innerHTML = renderPlanetTab();
    if (state.ui.currentTab === "build") panel.innerHTML = renderBuildTab();
    if (state.ui.currentTab === "tech") panel.innerHTML = renderTechTab();
    if (state.ui.currentTab === "settings") panel.innerHTML = renderSettingsTab();
  }

  return { render };
}
