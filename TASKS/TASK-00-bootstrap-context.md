# Alien Landing Page — Dependency Graph & Task Overview
## Project Bootstrap — cammckenzie.com Landing Page (Bugfix Phase)

## What This Project Does

An interactive 3D landing page for cammckenzie.com built with Three.js and TypeScript. The page features a cinematic descent from space to an alien planet surface, where procedurally generated bioluminescent structures represent navigable site entries (Blog, GitHub, tools, Contact). Entries are data-driven from a runtime-fetched `data.json`. The project is built with Vite 5.x, outputs static files for lighttpd deployment.

## Architecture in One Sentence

Factory-function-based modular Three.js application with a camera state machine, 7 registered procedural structure generators, HTML overlay label system, and Vite static build.



## Module Dependency Graph

```
main.ts
├── data/loader.ts          → types.ts
├── scene/setup.ts          → config.ts
├── scene/terrain.ts        → config.ts
├── scene/sky.ts            → config.ts
├── camera/state-machine.ts → config.ts, types.ts
│   ├── camera/descent.ts   → config.ts, scene/sky.ts (star warp ref)
│   ├── camera/free-cam.ts  → config.ts, scene/terrain.ts (height sampling)
│   └── camera/fixed-cam.ts → config.ts
├── structures/registry.ts  → structures/base.ts
│   └── structures/generators/*.ts → structures/base.ts, config.ts
├── structures/placement.ts → types.ts, config.ts, scene/terrain.ts (height sampling)
├── structures/particles.ts → config.ts, structures/base.ts
├── hud/descent-hud.ts      → config.ts, camera/state-machine.ts (state reads)
├── ui/labels.ts            → types.ts, camera/state-machine.ts (state reads)
├── ui/mode-indicator.ts    → camera/state-machine.ts (state reads)
├── effects/post-processing.ts → scene/setup.ts (renderer ref)
└── effects/ambient-particles.ts → config.ts
```

## Key Files & Modules

| Path | What it is | Notes |
|------|-----------|-------|
| `src/main.ts` | Entry point — wires everything together | Async IIFE, animation loop |
| `src/config.ts` | All config constants | UPPER_SNAKE_CASE, namespaced by module |
| `src/camera/state-machine.ts` | Camera state machine (DESCENT → FREE_CAM / FIXED_CAM) | Manages transitions, 300ms cooldown |
| `src/camera/descent.ts` | Descent animation controller | `active` flag gates `update()` |
| `src/camera/free-cam.ts` | Desktop free camera (mouse look, WASD, blink) | Uses mouse deltas, not absolute position |
| `src/camera/fixed-cam.ts` | Mobile auto-orbit camera with parallax | Mouse/touch absolute position |
| `src/scene/sky.ts` | Starfield + 6 nebula PlaneGeometry layers | Nebulae cause "wall" at ground level |
| `src/scene/terrain.ts` | Displaced PlaneGeometry terrain with analytic `getHeightAt()` | Y offset: -200 |
| `src/ui/labels.ts` | HTML overlay label system (projects 3D→2D) | `.entry-label` class, click opens URL |
| `src/ui/loading.ts` | "APPROACHING..." loading screen | Shown during async init |
| `src/ui/mode-indicator.ts` | Top-left camera mode text hint | Updates on state change |
| `src/hud/descent-hud.ts` | Descent telemetry HUD (ALT, VEL, scanline) | Only visible during DESCENT state |
| `src/structures/registry.ts` | Generator registry (Map<string, StructureGenerator>) | Side-effect imports register generators |
| `src/structures/placement.ts` | Places structures in scene by priority | Higher priority = closer to center |
| `public/data.json` | 6 entries defining the site's navigation | Runtime-fetched, never build-time imported |

## System Invariants (Always True)

1. `camera.rotation.order = 'YXZ'` must be set by every controller that touches rotation.
2. `depthWrite: false` on all transparent/additive materials.
3. Structure generators are pure functions of `(seed, priority, color)` — deterministic base geometry.
4. Config constants live ONLY in `src/config.ts` — no magic numbers in implementation files.
5. The `getHeightAt(x, z)` function uses the same analytic displacement as the terrain geometry — never buffer sampling.

## Out of Scope (Do Not Touch)

- `src/structures/generators/*.ts` — All 7 generators are working correctly, do not modify.
- `src/structures/registry.ts` — Working correctly, do not modify.
- `src/structures/placement.ts` — Working correctly, do not modify.
- `src/structures/particles.ts` — Working correctly, do not modify.
- `src/effects/ambient-particles.ts` — Working correctly, do not modify.
- `src/effects/post-processing.ts` — Working correctly, do not modify.
- `src/data/loader.ts` — Working correctly, do not modify.
- `src/scene/terrain.ts` — Working correctly, do not modify.
- `public/data.json` — Content is correct, do not modify.
- `TASKS/` — Original task documents, do not modify.

## Current State

The initial build is complete across all 6 phases. All modules compile and the site renders. Three critical bugs need fixing: (1) descent animation never activates, (2) nebula planes appear as walls at ground level, (3) free-cam mouse sensitivity is too low and arrow key behaviour is wrong. One enhancement is needed: (4) add user-facing control instructions after landing.
