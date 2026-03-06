# Alien Landing Page — Task Packets: Phase 1 (Foundation)

---

## TASK-01: Project Scaffolding & Core Types

**Objective:** Create a working Vite + TypeScript + Three.js project that renders an empty black scene, with all shared type definitions and the config constants module established.

**Bootstrap Context:**
This is the first task in a greenfield project. Read `01-system-frame-and-bootstrap.md` for full architecture context. You are creating the project skeleton that all subsequent tasks build upon.

**Files to Create:**
- `package.json` — CREATE — Project manifest with Vite, Three.js, TypeScript dependencies
- `tsconfig.json` — CREATE — TypeScript config targeting ES2020, strict mode
- `vite.config.ts` — CREATE — Vite config for static build output
- `index.html` — CREATE — Shell HTML with canvas mount point and overlay containers
- `src/main.ts` — CREATE — Entry point, minimal scene render loop (black canvas)
- `src/config.ts` — CREATE — Config constants module with initial structure
- `src/types.ts` — CREATE — Shared TypeScript interfaces

**Inputs:** None (greenfield).

**Outputs:**
- Running dev server (`npm run dev`) showing a black canvas
- `npm run build` producing static files in `dist/`
- Exported types and config available for import by all subsequent tasks

**Interface Contract:**

```typescript
// src/types.ts

import * as THREE from 'three';

/** Raw entry from data.json */
export interface DataEntry {
  name: string;
  url: string;
  priority: number;
  description?: string;
  type?: string;
  seed?: number;
}

/** Camera operating modes */
export enum CameraState {
  DESCENT = 'descent',
  FREE_CAM = 'free_cam',
  FIXED_CAM = 'fixed_cam',
}

/** A placed structure instance in the scene */
export interface StructureInstance {
  entry: DataEntry;
  group: THREE.Group;
  worldPosition: THREE.Vector3;
  boundingRadius: number;
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

/** Structure generator function signature */
export type StructureGenerator = (
  seed: number,
  priority: number,
  color: THREE.Color,
) => {
  group: THREE.Group;
  boundingRadius: number;
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
};
```

```typescript
// src/config.ts

export const CONFIG = {
  // === Renderer ===
  RENDERER_PIXEL_RATIO_MAX: 2,
  RENDERER_ANTIALIAS: true,

  // === Camera ===
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 2000,

  // === State Machine ===
  STATE_TRANSITION_COOLDOWN_MS: 300,

  // === Descent ===
  DESCENT_DURATION_SECONDS: 14,
  DESCENT_START_Y: 300,
  DESCENT_END_Y: -190,

  // === Terrain ===
  TERRAIN_SIZE: 400,
  TERRAIN_SEGMENTS: 120,
  TERRAIN_Y_OFFSET: -200,
  TERRAIN_FLAT_RADIUS: 30,

  // === Starfield ===
  STAR_COUNT: 4000,
  STAR_SPREAD: 500,
  STAR_DEPTH: 1000,

  // === Structures ===
  STRUCTURE_MIN_RADIUS: 20,
  STRUCTURE_MAX_RADIUS: 60,
  STRUCTURE_BASE_SCALE: 0.5,
  STRUCTURE_PRIORITY_SCALE_FACTOR: 0.15,

  // === Free Camera ===
  FREE_CAM_MOVE_SPEED: 15,
  FREE_CAM_LOOK_SENSITIVITY: 0.002,
  FREE_CAM_BLINK_DURATION_MS: 300,
  FREE_CAM_BLINK_MAX_DISTANCE: 40,
  FREE_CAM_TERRAIN_BOUNDARY_RADIUS: 180,
  FREE_CAM_HEIGHT_ABOVE_TERRAIN: 5,
  FREE_CAM_PITCH_MIN: -Math.PI / 3,
  FREE_CAM_PITCH_MAX: Math.PI / 3,

  // === Fixed Camera ===
  FIXED_CAM_ORBIT_RADIUS: 50,
  FIXED_CAM_ORBIT_SPEED: 0.08,
  FIXED_CAM_HEIGHT: -175,
  FIXED_CAM_PARALLAX_STRENGTH: 8,

  // === Particles ===
  AMBIENT_DUST_COUNT: 600,
  AMBIENT_DUST_SPREAD: 100,
  STRUCTURE_PARTICLE_COUNT: 30,

  // === Effects ===
  BLOOM_STRENGTH: 1.5,
  BLOOM_RADIUS: 0.4,
  BLOOM_THRESHOLD: 0.6,

  // === HUD ===
  HUD_FADE_IN_DURATION_MS: 500,
  HUD_FADE_OUT_DURATION_MS: 300,

  // === Colors (neon palette) ===
  NEON_COLORS: [0xff00cc, 0x00ffc8, 0xff6600, 0x00aaff, 0xffdd00, 0xff0066, 0x88ff00],
  SKY_COLOR: 0x020010,
  TERRAIN_BASE_COLOR: 0x0a0a1a,
  TERRAIN_WIRE_COLOR: 0x00ff88,
  TERRAIN_WIRE_OPACITY: 0.06,
  FOG_COLOR: 0x020010,
  FOG_DENSITY: 0.008,

  // === Mobile ===
  MOBILE_BREAKPOINT_PX: 768,

} as const;
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cam McKenzie</title>
  <meta name="description" content="Infrastructure engineer, security enthusiast, builder of things." />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; }
    canvas { display: block; }
    #overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 50; }
    #hud { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 40; }
    #ui { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 60; }
  </style>
</head>
<body>
  <div id="overlay"></div>
  <div id="hud"></div>
  <div id="ui"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- The `StructureGenerator` return type MUST include `update()` and `dispose()` functions. Every generator depends on this contract.
- `CONFIG` must be exported as `const` (using `as const`) — it is read-only for all consumers.
- Three.js must be imported as `import * as THREE from 'three'` — not destructured at top level. Post-processing imports use `import { X } from 'three/examples/jsm/postprocessing/Y.js'`.
- `index.html` must contain `#overlay`, `#hud`, and `#ui` container divs. Multiple tasks depend on these mount points.
- `public/` directory must exist for static assets including `data.json`.

**Must NOT do:**
- Do not implement any scene content (terrain, stars, structures) — that is TASK-03 onwards
- Do not implement camera controls — that is TASK-06 onwards
- Do not add any entries to `data.json` at build time — create only a sample `public/data.json` for development

**Acceptance Criteria:**
- [ ] `npm install` succeeds with zero errors
- [ ] `npm run dev` starts Vite dev server and displays a black canvas filling the viewport
- [ ] `npm run build` produces a `dist/` folder containing `index.html`, JS bundle(s), and copies `public/data.json` into `dist/`
- [ ] `src/types.ts` exports `DataEntry`, `CameraState`, `StructureInstance`, `StructureGenerator`
- [ ] `src/config.ts` exports a `CONFIG` object with all properties listed above
- [ ] `src/main.ts` creates a Three.js renderer, scene, camera, and starts a `requestAnimationFrame` loop
- [ ] Window resize updates camera aspect ratio and renderer size
- [ ] A sample `public/data.json` exists with 6 example entries matching the `DataEntry` schema

**Edge Cases to Handle:**
- Window resize to very small sizes (< 200px) → clamp minimum dimensions
- WebGL not available → show a plain HTML fallback message

**Test Requirements:**
No automated tests for this task. Acceptance is verified by visual inspection (black canvas) and build output inspection.

**Known Risks / Likely Mistakes:**
- AI may import Three.js post-processing modules incorrectly — use `.js` extension in import paths: `from 'three/examples/jsm/...'`
- AI may forget `"type": "module"` in `package.json` — Vite requires it
- AI may set `base: './'` in Vite config — this IS needed for lighttpd deployment (relative asset paths)

---

## TASK-02: Data Loader

**Objective:** Create `src/data/loader.ts` that fetches `data.json` at runtime via `fetch()`, validates the schema, applies default values for optional fields, and returns a typed array of `DataEntry` objects.

**Bootstrap Context:**
Read `src/types.ts` for the `DataEntry` interface. The loader fetches `data.json` from the same directory as the built HTML file. This is a runtime fetch, not a build-time import.

Key facts:
- `data.json` is an array of objects
- `name`, `url`, `priority` are required
- `description`, `type`, `seed` are optional
- If `seed` is missing, derive it from a hash of the `name` string
- If `type` is missing, assign one from a round-robin list of available types

**Files to Create:**
- `src/data/loader.ts` — CREATE — Data loader module

**Inputs:**
- `DataEntry` interface from `src/types.ts`
- Runtime fetch of `data.json` (relative URL)

**Outputs:**
- `loadSiteData(): Promise<DataEntry[]>` — async function returning validated, defaulted entries sorted by priority descending

**Interface Contract:**

```typescript
// src/data/loader.ts

import { DataEntry } from '../types';

/**
 * Fetches data.json from the same directory as the page,
 * validates entries, applies defaults, and returns sorted by priority desc.
 * Throws Error if fetch fails or data is not a valid array.
 */
export async function loadSiteData(): Promise<DataEntry[]>;

/**
 * Deterministic hash of a string to a positive integer.
 * Used to derive seed from name when seed is not provided.
 */
export function hashString(str: string): number;
```

The available structure types for round-robin assignment when `type` is omitted:
```typescript
const AVAILABLE_TYPES = ['crystal', 'flora', 'mushroom', 'vortex', 'geometric', 'entity', 'architecture'];
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Data MUST be fetched at runtime via `fetch('./data.json')` — NOT imported with `import` or `require`.
- Invalid entries (missing `name`, `url`, or `priority`) MUST be silently skipped with a `console.warn`, not crash the page.
- The returned array MUST be sorted by `priority` descending (highest first).
- `hashString` must be deterministic — same input always produces same output.

**Must NOT do:**
- Do not import `data.json` at build time
- Do not modify `src/types.ts` — it is owned by TASK-01
- Do not add any UI rendering logic

**Acceptance Criteria:**
- [ ] `loadSiteData()` fetches `data.json` via `fetch('./data.json')`
- [ ] Valid entries are returned as `DataEntry[]` sorted by priority descending
- [ ] Entries missing `name`, `url`, or `priority` are skipped with `console.warn`
- [ ] Entries without `seed` get a seed derived from `hashString(entry.name)`
- [ ] Entries without `type` get a type assigned round-robin from `AVAILABLE_TYPES`
- [ ] `hashString('Blog')` returns the same number every time
- [ ] If `fetch` fails (network error, 404), the function throws a descriptive Error
- [ ] If `data.json` contains an empty array `[]`, function returns `[]`

**Edge Cases to Handle:**
- `data.json` is empty array `[]` → return `[]`
- `data.json` is not valid JSON → throw Error with message including "parse"
- `data.json` is not an array (e.g., object) → throw Error with message including "array"
- Entry has `priority: 0` → valid, include it (priority range is 0-10)
- Entry has `priority: -1` → clamp to 0
- Entry has `priority: 100` → clamp to 10
- Duplicate names → allowed, no deduplication
- `fetch` returns 404 → throw Error with status code

**Test Requirements:**
Write unit tests in `tests/data/loader.test.ts`. Mock `fetch` using a simple override (`globalThis.fetch = ...`). Test all acceptance criteria and edge cases. Do not make real network requests.

**Known Risks / Likely Mistakes:**
- AI may use `import data from './data.json'` instead of `fetch` — this violates the core requirement
- AI may forget to sort by priority — the return order matters for placement logic in TASK-11
- AI may implement `hashString` with `Math.random()` — it must be deterministic (use djb2 or similar)

---

## TASK-03: Scene Foundation

**Objective:** Create `src/scene/setup.ts` that initialises the Three.js renderer, scene, camera, fog, and lighting, and exports them for use by all other modules.

**Bootstrap Context:**
Read `src/config.ts` for renderer/camera/fog constants. Read `src/main.ts` to understand where the scene setup is called. This module creates the shared Three.js objects that every other module uses.

Key facts:
- Renderer uses ACES filmic tone mapping
- Scene has exponential fog (FogExp2) in deep dark blue-purple
- Lighting: ambient (dim indigo), directional (purple from above), hemisphere (green ground, magenta sky)
- The camera starts at `DESCENT_START_Y` looking down

**Files to Create:**
- `src/scene/setup.ts` — CREATE — Scene initialisation module

**Files to Modify:**
- `src/main.ts` — MODIFY — Import and call `initScene()`, use returned objects in render loop

**Inputs:**
- `CONFIG` from `src/config.ts`

**Outputs:**
- `initScene(): { renderer, scene, camera, resize }` — initialises everything, appends canvas to DOM, returns shared references

**Interface Contract:**

```typescript
// src/scene/setup.ts

import * as THREE from 'three';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Call on window resize to update camera and renderer */
  resize: () => void;
}

/**
 * Creates renderer, scene, camera, fog, lighting.
 * Appends renderer.domElement to document.body (before other elements).
 * Registers window resize listener.
 * Returns shared context object.
 */
export function initScene(): SceneContext;
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Renderer must use `THREE.ACESFilmicToneMapping` with `toneMappingExposure: 1.0`
- Pixel ratio must be clamped to `CONFIG.RENDERER_PIXEL_RATIO_MAX` (not raw `devicePixelRatio`)
- Fog must be `FogExp2` with `CONFIG.FOG_COLOR` and `CONFIG.FOG_DENSITY`
- Camera initial position: `(0, CONFIG.DESCENT_START_Y, 0)` looking at `(0, -200, 0)`
- The renderer canvas must be inserted as the FIRST child of `<body>` (before the overlay divs)

**Must NOT do:**
- Do not create terrain, stars, or any scene content — those are separate tasks
- Do not implement camera controls or animation — that is TASK-06+
- Do not set up post-processing — that is TASK-16

**Acceptance Criteria:**
- [ ] `initScene()` creates a WebGLRenderer with antialias and clamped pixel ratio
- [ ] Renderer uses ACES filmic tone mapping
- [ ] Scene has FogExp2 with configured color and density
- [ ] Three lights exist: AmbientLight (dim indigo ~0x111133), DirectionalLight (purple from above), HemisphereLight (green/magenta)
- [ ] Camera is PerspectiveCamera with configured FOV, near, far
- [ ] Camera starts at y=DESCENT_START_Y
- [ ] Window resize updates camera aspect ratio, projection matrix, and renderer size
- [ ] `src/main.ts` uses the returned SceneContext in its render loop

**Edge Cases to Handle:**
- WebGL context lost → log error, do not crash
- Very small viewport (< 200px either dimension) → still renders, no division by zero

**Test Requirements:**
No automated tests. Visual verification: dev server shows a dark scene with fog color visible.

**Known Risks / Likely Mistakes:**
- AI may forget `renderer.toneMapping` or `toneMappingExposure` — the bloom in TASK-16 depends on these being set correctly
- AI may use `FogExp` instead of `FogExp2` — use `FogExp2`
- AI may place lights at positions that don't illuminate the terrain (y=-200 area) — directional light should be high (y=50+) pointing down

---

## TASK-04: Terrain Generation

**Objective:** Create `src/scene/terrain.ts` that generates a procedural alien terrain mesh with a flattened central landing zone, subtle wireframe overlay, and a height sampling function that other modules can query.

**Bootstrap Context:**
Read `src/config.ts` for terrain constants (`TERRAIN_*`). Read `src/scene/setup.ts` interface for `SceneContext`. The terrain sits at `y = TERRAIN_Y_OFFSET` (approximately -200). The central area within `TERRAIN_FLAT_RADIUS` is flattened to zero height relative to the offset — this is where the player lands and structures are placed nearby.

Key facts:
- Terrain is a `PlaneGeometry` rotated to horizontal, with vertex displacement for hills
- Uses multi-octave sine waves for organic-looking undulation
- Central flat zone blends smoothly to surrounding hills
- A wireframe overlay in neon green at low opacity sits on top
- Other modules need to query terrain height at arbitrary (x, z) positions

**Files to Create:**
- `src/scene/terrain.ts` — CREATE — Terrain generation module

**Files to Modify:**
- `src/main.ts` — MODIFY — Import and call terrain creation after scene init

**Inputs:**
- `SceneContext` from `src/scene/setup.ts` (to add meshes to scene)
- `CONFIG` terrain constants

**Outputs:**
- `createTerrain(scene: THREE.Scene): TerrainContext`
- `TerrainContext.getHeightAt(x: number, z: number): number` — returns world Y position at given XZ

**Interface Contract:**

```typescript
// src/scene/terrain.ts

import * as THREE from 'three';

export interface TerrainContext {
  /** The terrain mesh (solid) */
  mesh: THREE.Mesh;
  /** The wireframe overlay mesh */
  wireframe: THREE.Mesh;
  /**
   * Returns the world-space Y coordinate of the terrain surface at (x, z).
   * Uses the same displacement function as the geometry generation.
   * Returns TERRAIN_Y_OFFSET for positions within the flat zone.
   */
  getHeightAt: (x: number, z: number) => number;
}

export function createTerrain(scene: THREE.Scene): TerrainContext;
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- `getHeightAt(x, z)` MUST use the exact same displacement math as the vertex generation. If the terrain formula changes, `getHeightAt` must match. Extract the displacement to a shared internal function.
- The flat landing zone within `TERRAIN_FLAT_RADIUS` of origin must have zero displacement (height = `TERRAIN_Y_OFFSET`).
- Terrain material must use `flatShading: true` for the low-poly alien aesthetic.
- Wireframe overlay must be a SEPARATE mesh (not wireframe mode on the terrain material) so it can have independent opacity/color.

**Must NOT do:**
- Do not add textures or UV mapping — the flat-shaded + wireframe look is the aesthetic
- Do not add any objects ON the terrain (structures are TASK-11)
- Do not add vegetation/scatter objects — ambient particles (TASK-15) handle ground-level detail

**Acceptance Criteria:**
- [ ] Terrain mesh is a displaced PlaneGeometry with `TERRAIN_SEGMENTS` subdivisions
- [ ] Terrain uses multi-octave displacement (at least 3 frequencies of sine/cosine)
- [ ] Central area within `TERRAIN_FLAT_RADIUS` is smoothly flattened (quadratic blend)
- [ ] Terrain material: dark color (`TERRAIN_BASE_COLOR`), flatShading, roughness ~0.8, metalness ~0.2
- [ ] Wireframe overlay: neon green (`TERRAIN_WIRE_COLOR`), transparent, opacity `TERRAIN_WIRE_OPACITY`
- [ ] `getHeightAt(0, 0)` returns `TERRAIN_Y_OFFSET` (flat zone center)
- [ ] `getHeightAt(100, 100)` returns a value different from `TERRAIN_Y_OFFSET` (outside flat zone)
- [ ] `getHeightAt(x, z)` matches the actual vertex height at that position (±0.1 tolerance)
- [ ] Both meshes are added to the provided scene

**Edge Cases to Handle:**
- `getHeightAt` called with coordinates outside terrain bounds → clamp to terrain edge, return height at clamped position
- `getHeightAt` called with coordinates between vertices → interpolate (or use the continuous displacement function directly, which is preferred)

**Test Requirements:**
Write unit tests in `tests/scene/terrain.test.ts`. Test `getHeightAt` at origin (should be `TERRAIN_Y_OFFSET`), at flat zone boundary, and at a distant point. Verify the displacement function is deterministic (same input → same output across calls). Mock Three.js as needed or test the displacement function directly.

**Known Risks / Likely Mistakes:**
- AI may implement `getHeightAt` by sampling the geometry buffer instead of the displacement function — this is slower and may have precision issues. Use the analytic function directly.
- AI may forget the `PlaneGeometry.rotateX(-Math.PI / 2)` to make it horizontal — the geometry must be in the XZ plane.
- AI may make the flat zone transition too abrupt (linear blend) — use quadratic `blend * blend` for smooth transition.

---

## TASK-05: Starfield & Sky

**Objective:** Create `src/scene/sky.ts` that generates a star particle system for the space background and layered nebula cloud planes for atmospheric effect during descent. Export references needed by the descent camera controller to animate star warp speed.

**Bootstrap Context:**
Read `src/config.ts` for star count and spread constants. Read `src/scene/setup.ts` for SceneContext. The starfield is visible during the descent sequence and fades out as the camera descends below the nebula layers. The descent controller (TASK-07) needs access to the star positions buffer and material opacity to animate warp speed and fade.

Key facts:
- Stars are `THREE.Points` with random positions in a large volume
- Each star has a random speed multiplier stored in a parallel Float32Array
- Nebula layers are large semi-transparent colored planes at different Y heights, tilted slightly
- During descent: stars streak vertically (warp effect), nebula layers pass by as atmosphere
- After landing: stars are mostly hidden by fog, nebula layers provide ambient sky color

**Files to Create:**
- `src/scene/sky.ts` — CREATE — Starfield and nebula module

**Files to Modify:**
- `src/main.ts` — MODIFY — Import and call sky creation after scene init

**Inputs:**
- `SceneContext` from `src/scene/setup.ts`
- `CONFIG` star/sky constants

**Outputs:**
- `createSky(scene: THREE.Scene): SkyContext`

**Interface Contract:**

```typescript
// src/scene/sky.ts

import * as THREE from 'three';

export interface SkyContext {
  /** Star particle system */
  stars: THREE.Points;
  /** Star position buffer attribute — descent controller writes to this for warp */
  starPositions: THREE.BufferAttribute;
  /** Per-star speed multipliers */
  starSpeeds: Float32Array;
  /** Star material — descent controller adjusts opacity */
  starMaterial: THREE.PointsMaterial;
  /** Nebula cloud meshes */
  nebulae: THREE.Mesh[];
}

export function createSky(scene: THREE.Scene): SkyContext;
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Star positions MUST be stored as a `Float32Array` in a `BufferAttribute` — the descent controller (TASK-07) directly mutates this buffer for the warp animation.
- Star speeds MUST be a separate `Float32Array` (not a buffer attribute) — it's read-only reference data.
- Nebula planes must use `depthWrite: false` and `transparent: true` to layer correctly.
- Nebula planes should be positioned between y=-50 and y=-180 (the descent path passes through them).
- Use `DoubleSide` material for nebula planes so they're visible from both directions.

**Must NOT do:**
- Do not animate the stars — that is TASK-07 (descent sequence)
- Do not add sky dome or environment map — fog + nebula layers provide the atmosphere
- Do not modify scene fog — that is owned by TASK-03

**Acceptance Criteria:**
- [ ] `STAR_COUNT` particles created with random positions spread across configured volume
- [ ] Each star has a random speed multiplier between 0.5 and 2.0
- [ ] Star material: white, size ~1.5, sizeAttenuation true, transparent
- [ ] At least 5 nebula planes created at different Y heights between -50 and -180
- [ ] Nebula colors use neon palette values (greens, magentas, cyans)
- [ ] Nebula planes have low opacity (0.03–0.06), are slightly tilted, and have varied scales
- [ ] All objects added to the provided scene
- [ ] Returned `SkyContext` provides direct access to all listed properties

**Edge Cases to Handle:**
- Very high `STAR_COUNT` values (>10000) → should still work but may impact performance. No special handling needed for expected range (3000-5000).

**Test Requirements:**
No automated tests. Visual verification: dev server shows a star field visible from the starting camera position (high up, looking down).

**Known Risks / Likely Mistakes:**
- AI may use `ShaderMaterial` for stars instead of `PointsMaterial` — use `PointsMaterial` for simplicity; the descent controller handles animation by mutating the position buffer directly.
- AI may forget `sizeAttenuation: true` on stars — without it, stars look wrong at varying distances.
- AI may place all nebula planes at the same Y height — they must be distributed through the descent path.
