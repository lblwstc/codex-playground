# Star Hauler Command

A no-build 2D planet resource-gathering game built with Canvas 2D and ES modules.

## Run
1. Open `index.html` directly in desktop Chrome or iPhone Safari.
2. Optional: serve locally for cleaner module loading behavior (`python3 -m http.server`).

## Gameplay loop
- Planets continuously produce mixed resource profiles into local buffers.
- Ships cycle through: `TRAVEL_TO_PLANET -> LOADING -> TRAVEL_TO_MOTHERSHIP -> UNLOADING`.
- Expand to new planets to unlock new resource types, establish colonies, and develop industries.
- Colony industries generate Science, which unlocks advanced technologies.

## Controls
- **Desktop**: drag to pan, mouse wheel to zoom, click ships/planets to inspect.
- **Mobile**: drag to pan, pinch to zoom, tap to select; bottom tabs switch Actions/Details/Tech.

## Features
- 10 resources with progressive unlocks (Ore, Water, Bio, Energy, Silicon, Crystals, Reactive Gas, Alloys, Antimatter, Science).
- 20-planet star system with distinct planet archetypes and scalable unlock costs.
- Colony system with industry development (Mining, Refining, Biolab, Fusion Plant, Research Nexus).
- Expanded technology tree that depends on colony-driven Science generation.
- Curved ship paths + thruster trail + cargo indicator + floating unload text.
- Fixed-step simulation (10 ticks/s) + smooth render loop.
- Save/load in `localStorage`, offline progress capped to 8 hours.
- Reset save from DevTools: `resetSave()`.
