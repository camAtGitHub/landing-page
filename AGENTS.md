# AGENTS.md — Alien Landing Page

## What This Project Is

An interactive 3D landing page for cammckenzie.com. Users experience a cinematic descent through space onto a neon-lit alien planet, then explore procedurally generated alien structures (crystals, bioluminescent flora, energy vortices, jellyfish entities, alien towers, etc.) that serve as clickable links to site sections and tools. Built with Vite + TypeScript + Three.js, outputs static files for lighttpd.

## Architecture

Single-page app. Camera state machine with 3 modes (descent → free-cam → fixed-cam). Procedural structure generators registered by type name in a registry. Runtime `data.json` fetch for all link entries. No backend.

## Stack & Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Vite | ^5.x | Build tool and dev server |
| TypeScript | ^5.x | Language (strict mode) |
| Three.js | ^0.160+ (latest stable) | 3D rendering engine |
| Vitest | ^1.x (devDependency) | Unit test framework |

No other runtime dependencies. Three.js is the only production `dependency`. Everything else is `devDependencies`. Do NOT add lodash, GSAP, jQuery, React, or any other library unless a task packet explicitly says so. If you think you need a library, you don't — write it from scratch or use what Three.js provides.

## Coding Standards

### TypeScript
- **Strict mode enabled** — `"strict": true` in `tsconfig.json`. No `any` types except where interfacing with Three.js internals that lack proper typings.
- **Target:** `ES2020`. **Module:** `ESNext`. **Module resolution:** `bundler`.
- **Explicit return types** on all exported functions. Internal/private helpers can use inference.
- **No enums in new code except `CameraState`** (already defined in types.ts). Use string literal unions or `as const` objects elsewhere.
- **No classes unless the task packet specifies one** (e.g., `SeededRNG`, `CameraStateMachine`). Prefer factory functions returning interface-typed objects (e.g., `createFreeCamController() → CameraController`).

### Naming Conventions
- **Files:** `kebab-case.ts` (e.g., `state-machine.ts`, `free-cam.ts`)
- **Exported functions:** `camelCase` — factory functions prefixed with `create` (e.g., `createTerrain`, `createDescentController`)
- **Exported interfaces/types:** `PascalCase` (e.g., `TerrainContext`, `SkyContext`, `DataEntry`)
- **Config constants:** `UPPER_SNAKE_CASE` grouped by prefix (e.g., `TERRAIN_SIZE`, `FREE_CAM_MOVE_SPEED`)
- **Internal/private variables:** `camelCase`
- **Generator registry type names:** lowercase string identifiers (e.g., `'crystal'`, `'flora'`, `'architecture'`)

### Module Patterns
- **One concern per file.** A file either creates something, manages state, or provides utilities — not all three.
- **Factory function pattern** for most modules: export a `createX()` function that returns an object satisfying a defined interface. This is the project's primary composition pattern.
- **Side-effect imports** only for structure generator registration (e.g., `import './structures/generators/crystal'`). All other imports must be explicit named imports.
- **No default exports** except where a task packet explicitly requires one. Use named exports.
- **No circular imports.** If module A imports from module B, module B must NOT import from module A. The dependency graph in `02-dependency-graph-and-task-overview.md` defines the legal import directions.

### Three.js Conventions
- **Namespace import:** Always `import * as THREE from 'three'` — not destructured (`import { Scene, Mesh } from 'three'`).
- **Post-processing imports:** Must include `.js` extension — `import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'`.
- **Geometry and material disposal:** Every module that creates Three.js geometries or materials MUST dispose them in its `dispose()` function. Use the shared `disposeGroup()` utility from `src/structures/base.ts` for recursive cleanup.
- **Buffer updates:** After mutating any `BufferAttribute` data (e.g., particle positions), set `.needsUpdate = true` on the attribute. Without this, the GPU buffer is stale.
- **Transparent materials:** Always set `depthWrite: false` on materials with `transparent: true` or `blending: THREE.AdditiveBlending`. Prevents z-fighting.
- **No ShaderMaterial or RawShaderMaterial** unless a task packet explicitly requires it. Use `MeshStandardMaterial` and `MeshBasicMaterial` with emissive and blending properties for all glow effects.
- **Camera rotation order:** Any code touching camera rotation must set `camera.rotation.order = 'YXZ'` for correct FPS-style yaw/pitch behaviour.

### DOM & CSS Conventions
- **No external CSS files.** All styles are defined either inline via JavaScript or via a dynamically created `<style>` tag within the module that needs them.
- **No external fonts.** Use `'Courier New', monospace` for all text. Do not load Google Fonts or any CDN font.
- **DOM mount points are fixed:** `#overlay` (labels), `#hud` (descent HUD), `#ui` (mode indicator, loading). Each module mounts ONLY in its designated container.
- **`pointer-events: none`** on all overlay containers. Individual clickable elements (labels) set `pointer-events: auto` on themselves.

### Error Handling
- **Never silently swallow errors.** Use `console.warn` for recoverable issues (e.g., unknown structure type falls back to crystal). Use `console.error` for things that indicate a bug (e.g., missing camera controller for a state).
- **Data validation failures in `loader.ts`** skip the bad entry with `console.warn` — do not crash the page.
- **WebGL failures** (context lost, bloom crash) fall back gracefully to simpler rendering. Log the error but keep the page functional.
- **Do not use `try/catch` around normal Three.js operations** — they don't throw in typical usage. Reserve try/catch for `fetch()`, JSON parsing, and WebGL context operations.

### Performance Guidelines
- **Particles:** Always use `THREE.Points` with `BufferGeometry`. Never create individual `Mesh` objects per particle.
- **Geometry reuse:** If multiple structures share the same geometry shape (e.g., small sphere for spore dots), create the geometry once and reuse it across materials. Clone the material, not the geometry.
- **Frame budget:** The render loop must complete within 16ms at 60fps. Structure `update()` functions must be lightweight — transform changes and material property updates only. No geometry creation or disposal in the render loop.
- **No `setInterval` or `setTimeout` in the render loop.** All timed animation uses `elapsed` and `delta` from the `THREE.Clock` passed through `update()` calls.

## Tooling

### Vite Configuration
- `base: './'` — relative asset paths for lighttpd deployment
- `build.outDir: 'dist'` — output to `dist/`
- `build.assetsDir: 'assets'` — JS/CSS bundles go to `dist/assets/`
- Static files in `public/` (including `data.json`) are copied to `dist/` root unchanged
- TypeScript handled by Vite's built-in esbuild transform — no separate `tsc` build step needed for dev

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": false,
    "declaration": false,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

Note: `resolveJsonModule: false` is intentional. `data.json` must NOT be importable. It is fetched at runtime via `fetch()`.

### package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

The `build` script runs `tsc --noEmit` first for type checking (Vite's esbuild does not type-check), then `vite build` for the actual bundle.

### Testing
- **Framework:** Vitest (add as devDependency)
- **Config:** `vitest.config.ts` at project root (see `ORCHESTRATOR.md` for exact config)
- **Test location:** `tests/` directory mirroring `src/` structure
- **Shared mocks:** `tests/helpers/three-mocks.ts` — reusable mock factories for Vector3, Group, Camera, Mesh (see `ORCHESTRATOR.md` for implementations)
- **Run:** `npm test` (single run) or `npm run test:watch` (watch mode)
- **Three.js mocking:** Mock Three.js objects minimally — create plain objects satisfying the interface shape with `vi.fn()` spies where needed. Do not import the full Three.js library in tests unless the test genuinely needs geometry math.
- **No DOM tests.** UI modules (labels, HUD, mode indicator) are verified by visual inspection, not automated tests.
- **Checkpoint rule:** After completing each task, run `npm test && npm run build`. Both must pass before moving to the next task.
- **Full testing strategy, mock patterns, and integration checklist:** See `ORCHESTRATOR.md`

### Linting
Not required for task completion, but if the agent wants to lint:
- ESLint with `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
- No Prettier — formatting is handled by editor config

## Key Rules

1. **data.json is runtime-fetched, never imported at build time.**
2. **All constants in `src/config.ts` — no magic numbers in modules.**
3. **Camera position is ONLY set by the active camera controller via the state machine.**
4. **Structure generators are pure functions of (seed, priority, color) — deterministic.**
5. **Use SeededRNG from `src/structures/base.ts` — never Math.random() in generators.**
6. **Three.js imports: `import * as THREE from 'three'`. Post-processing: `from 'three/examples/jsm/postprocessing/X.js'` (with .js extension).**
7. **Built output must be fully static. No server-side runtime.**

## File Layout

```
src/main.ts              — Entry point, orchestration, render loop
src/config.ts            — All tuning constants (READ-ONLY for most tasks)
src/types.ts             — Shared interfaces (DataEntry, CameraState, StructureInstance, StructureGenerator)
src/data/loader.ts       — Fetches and validates data.json
src/scene/setup.ts       — Renderer, scene, camera, lighting, fog
src/scene/terrain.ts     — Procedural terrain + getHeightAt()
src/scene/sky.ts         — Starfield + nebula layers
src/camera/state-machine.ts — State management + Escape key handling
src/camera/descent.ts    — Cinematic descent controller
src/camera/free-cam.ts   — Desktop: mouse look + WASD + click-to-blink
src/camera/fixed-cam.ts  — Mobile: orbit + parallax
src/structures/base.ts   — SeededRNG, shared material helpers, disposeGroup
src/structures/registry.ts — Type-name → generator registry
src/structures/placement.ts — Positions structures on terrain from data entries
src/structures/particles.ts — Per-structure particle emitters
src/structures/generators/*.ts — 7 generator types (crystal, flora, mushroom, vortex, geometric, entity, architecture)
src/hud/descent-hud.ts   — Subtle telemetry overlay during descent
src/ui/labels.ts         — HTML labels projected from 3D positions
src/ui/mode-indicator.ts — Camera mode + hint text display
src/ui/loading.ts        — Loading screen
src/effects/post-processing.ts — Bloom via EffectComposer
src/effects/ambient-particles.ts — Global floating neon dust
public/data.json         — Runtime site entries
```

## Do Not Touch (unless your task says otherwise)

- `src/types.ts` — owned by TASK-01, shared contract
- `src/config.ts` — add your constants under your namespace prefix, never modify existing ones
- `public/data.json` — sample data for dev, not modified by build
- Any module not listed in your task's "Files to Create / Modify"

## Common Mistakes to Avoid

- Importing data.json at build time instead of fetching at runtime
- Using Math.random() instead of SeededRNG in generators
- Setting camera.position directly instead of through the camera controller
- Forgetting `needsUpdate = true` after mutating BufferAttribute data
- Missing `.js` extension on Three.js post-processing imports
- Creating particles as individual Mesh objects instead of Points geometry
- Forgetting `depthWrite: false` on transparent/additive materials
- Not calling `disposeGroup()` in structure dispose functions (GPU memory leak)

## Build & Dev

```bash
npm install
npm run dev    # Vite dev server
npm run build  # Static output to dist/
```

Deploy: copy `dist/` contents to web server root alongside `data.json`.
