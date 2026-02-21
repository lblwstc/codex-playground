# Planetary Dominion

Mobile-first 2D tile-map colony/resource game built with vanilla HTML/CSS/JS modules.

## Run locally

```bash
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

## Controls

- **Touch**: one-finger pan, two-finger pinch zoom, tap to place in placement mode.
- **Desktop**: mouse drag pan, wheel zoom, WASD/arrow pan.

## Gameplay loop

1. Start on **Terra Nova**.
2. Place extractors on resource nodes, and support buildings on empty tiles.
3. Upgrade buildings (L1-L10).
4. Buy tech ranks in Tech tab.
5. Unlock additional planets via Planet tab milestones.

## Features implemented

- 4 deterministic planets with unique resource nodes and palettes.
- Building placement rules and per-planet constraints.
- Formula-driven economy (cost growth, production scaling, storage caps).
- Offline progress (capped at 12 hours).
- Autosave every 10s + visibility/pagehide save.
- Save export/import/reset.
- iPhone-safe layout with viewport-fit, safe-area insets, and 44px touch targets.
- Canvas map rendering + DOM overlay UI.
- Reduced motion toggle + prefers-reduced-motion default.

## Quick test checklist

1. Place extractor on node (works) and empty tile (rejected).
2. Place power/lab/storage on empty tile only; only one each per planet.
3. Upgrade and verify production and caps rise.
4. Buy tech and verify costs scale and production improves.
5. Unlock Ignis/Aqua/Zephyria via requirements.
6. Refresh page and confirm save/load.
7. Modify `lastSeen` in localStorage to verify offline progress.

## Deploy

Deploy as static files (GitHub Pages, Netlify static, Vercel static). No build step required.
