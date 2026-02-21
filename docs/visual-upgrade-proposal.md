# Visual Upgrade Proposal — Star Hauler Command

## Goals
- Improve visual readability at a glance (what is moving, what is producing, what is selected).
- Increase "space fantasy" feel without hurting performance on mobile Safari.
- Keep implementation compatible with current Canvas 2D architecture and fixed-step sim.

---

## Inspiration from Similar Games
- **FTL / Crying Suns**: strong contrast between calm background and high-information combat/travel overlays.
- **Out There / Mini Metro style clarity**: minimal but expressive route rendering and iconography.
- **Idle strategy games (e.g., Antimatter Dimensions UI trends)**: reward feedback loops via short, punchy effects rather than heavy persistent animation.

The key takeaway: prioritize *legibility + feedback timing* over raw particle count.

---

## Current State (Observed)
- Stars twinkle with a simple deterministic pattern.
- Planets are clean circles with small type-specific details.
- Ships have readable silhouettes and curved routes.
- UI panels are functional but visually flat in interaction states.

This is a strong baseline for a no-build Canvas game; upgrades should layer onto this, not replace it.

---

## Proposed Upgrade Tracks

## 1) Space Depth & Atmosphere (High impact, low-to-medium effort)
1. **Parallax starfield layers**
   - 3 star layers (far, mid, near) with different density, size, and camera response.
   - Near layer shifts slightly with camera pan; far layer barely moves.
   - Benefit: immediate feeling of depth during drag/pan.

2. **Nebula gradient clusters**
   - Add 2–4 low-alpha radial gradients in world space.
   - Very soft color palettes tied to current theme (blue-violet).
   - Benefit: reduces empty-space monotony and gives each map region identity.

3. **Subtle vignette & bloom-like glow pass**
   - Light vignette on canvas edges.
   - Fake bloom by drawing key highlights (mothership/selected objects) with soft alpha halos.
   - Benefit: focuses attention toward gameplay center and selected targets.

---

## 2) Planet Identity & Production Feedback (High impact, medium effort)
1. **Planet shader-lite treatment (Canvas-friendly)**
   - Add shaded hemisphere (light direction), thin rim light, and faint atmospheric shell for gas/ice worlds.
   - Keep crater/noise marks for rocky/volcanic.
   - Benefit: each planet reads as volume instead of flat sprite.

2. **Production pulse rings**
   - Every production tick (or batched interval), emit a faint ring from producing planets.
   - Ring color maps to dominant resource output.
   - Benefit: players can identify productive nodes without opening details.

3. **Extractor level visuals**
   - Small orbiting satellites / segmented ring marks per extractor level threshold.
   - Benefit: upgrade progress visible from map view.

---

## 3) Ship Motion & Route Clarity (High impact, low effort)
1. **Adaptive route styling**
   - Idle/thin route baseline.
   - Active route brightens while ship traverses.
   - Selected route gets a soft animated dash flow.
   - Benefit: travel state becomes scannable instantly.

2. **Thruster and braking cues**
   - Thruster cone length linked to travel speed/progress phase.
   - Brief reverse-thrust flicker near arrival.
   - Benefit: ships feel physical and stateful.

3. **Cargo transfer burst**
   - On unloading completion, add short radial spark + floating amount cluster.
   - Benefit: stronger reward moment for loop completion.

---

## 4) Selection, UX Feedback, and Accessibility (Very high impact, low effort)
1. **Improved selection rings**
   - Replace static stroke with dual-ring pulse (outer slow, inner crisp).
   - Add type icon marker above selected object.

2. **Resource chip micro-animations**
   - On resource gain, chip briefly scales to 102–104% and emits soft glow.
   - Benefit: ties map activity to HUD with no extra reading burden.

3. **Colorblind-safe differentiation pass**
   - Keep hue differences but add shape/texture cues for resource indicators.
   - Benefit: improved clarity for non-hue users.

---

## 5) Mobile-first polish (Must-have)
1. **Performance budget tiers**
   - Tier A: full effects (desktop/high-end).
   - Tier B: reduced particles + no bloom halos (mobile default).
   - Tier C: minimal effects fallback (older devices).

2. **Reduced motion option**
   - Toggle in settings to dampen pulse/route animation frequencies.

3. **Touch affordance highlights**
   - Slight tap ripple and enlarged selected outlines on mobile.

---

## Delivery Plan (Suggested)

### Phase 1 (1 sprint)
- Parallax stars + improved selection rings + active route styling + resource chip gain glow.
- Success metric: better readability without measurable FPS drop.

### Phase 2 (1 sprint)
- Planet shading pass + production pulse rings + cargo transfer bursts.
- Success metric: map feels more alive; production sources identifiable in under 2 seconds.

### Phase 3 (1 sprint)
- Nebula backgrounds + mobile quality tiers + reduced motion setting.
- Success metric: visual richness up on desktop while retaining smoothness on iPhone Safari.

---

## Implementation Notes for Current Codebase
- `modules/render.js`
  - Extend `drawStars` into layered function (`drawStarLayer(layerConfig)`).
  - Add optional post-world pass for vignette/halos after `ctx.restore()`.
  - Introduce lightweight FX queues (pulse rings, cargo bursts) similar to existing floaters.

- `style.css`
  - Add resource-chip gain states and panel interaction depth (hover/active shadow) using existing variables.
  - Keep animations short and opacity-based to avoid layout thrash.

- `modules/state.js` / `modules/sim.js`
  - Track short-lived FX events in state (`fx.pulses`, `fx.bursts`) with lifetimes.
  - Emit events on production tick and unload completion.

- `modules/ui.js`
  - Trigger chip animation class when resource deltas are positive.

---

## Risk Controls
- Gate each new effect with feature flags (`fxQuality`, `reducedMotion`).
- Use object pooling for transient particles/rings.
- Cap per-frame effect draws to avoid spikes.
- Keep all effects deterministic where possible for easier debugging.

---

## Optional Stretch Ideas
- Cinematic event moments for unlocking a new planet (brief camera ease + lens flare).
- "Sector themes" where each session gets subtle palette variation.
- Photo mode toggle (pause sim + hide UI + export screenshot).
