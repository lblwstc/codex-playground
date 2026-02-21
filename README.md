# Star Hauler Command

A no-build 2D planet resource-gathering game built with Canvas 2D and ES modules.

## Run
1. Open `index.html` directly in desktop Chrome or iPhone Safari.
2. Optional: serve locally for cleaner module loading behavior (`python3 -m http.server`).

## Gameplay loop
- Planets continuously produce resources into local buffers.
- Ships cycle through: `TRAVEL_TO_PLANET -> LOADING -> TRAVEL_TO_MOTHERSHIP -> UNLOADING`.
- Spend resources to unlock planets, buy ships, upgrade extractors, and research tech.

## Controls
- **Desktop**: drag to pan, mouse wheel to zoom, click ships/planets to inspect.
- **Mobile**: drag to pan, pinch to zoom, tap to select; bottom tabs switch Actions/Details/Tech.

## Features
- 4 resources: Ore, Water, Bio, Energy.
- Distinct planet types with richness/distance differences.
- Curved ship paths + thruster trail + cargo indicator + floating unload text.
- 9 tech upgrades with prerequisites and immediate effects.
- Fixed-step simulation (10 ticks/s) + smooth render loop.
- Save/load in `localStorage`, offline progress capped to 8 hours.
- Reset save from DevTools: `resetSave()`.
