# Planet Hauler Command

A no-build 2D star-system resource game. Run by opening `index.html` in desktop Chrome or iPhone Safari.

## How to run
- Download/clone repository.
- Open `index.html` directly in a browser.
- No install/build steps required.

## Gameplay loop
- Start with one mothership and one cargo ship.
- Unlock planets, each with a primary resource profile.
- Upgrade extractors and research tech to improve throughput.
- Buy more ships and assign routes for a larger logistics network.

## Controls
### Desktop
- Drag on canvas to pan.
- Mouse wheel to zoom.
- Click planets/ships for details.

### iPhone Safari
- Drag to pan.
- Pinch to zoom.
- Use bottom tabs for Actions / Details / Tech.
- Canvas input disables browser scrolling while interacting.

## Save system
- Auto-saves every few seconds to localStorage.
- Offline progress is granted at load (up to 8 hours).
- Use **Reset Save** button to wipe progress.

## Project structure
- `index.html` – app shell and responsive layout.
- `style.css` – modern UI, desktop/mobile behavior, safe-area handling.
- `game.js` – bootstraps main loop.
- `modules/content.js` – resources, planets, and tech definitions.
- `modules/state.js` – state schema + initialization/hydration.
- `modules/sim.js` – fixed-timestep simulation, production, ship FSM.
- `modules/render.js` – canvas rendering and animations.
- `modules/ui.js` – panels, tabs, actions, and pointer interactions.
- `modules/storage.js` – save/load and offline progression.
