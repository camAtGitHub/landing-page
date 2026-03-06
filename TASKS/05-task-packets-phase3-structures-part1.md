# Alien Landing Page — Task Packets: Phase 3 Part 1 (Structure Framework + Generators A-D)

---

## TASK-09: Structure Generator Framework

**Objective:** Create the structure generator framework: a seeded PRNG utility, the base generator interface with shared helper functions, and a registry that maps type names to generator functions. All 7 generator tasks (TASK-10a through TASK-10g) depend on this framework.

**Bootstrap Context:**
Read `src/types.ts` for `StructureGenerator` type definition. Read `src/config.ts` for structure constants (`STRUCTURE_*`, `NEON_COLORS`). The framework provides: (1) a deterministic seeded PRNG, (2) shared helper functions for creating glowing materials and common geometry operations, and (3) a registry where generators register themselves by type name.

Key facts:
- Generators are pure functions: `(seed, priority, color) → { group, boundingRadius, update, dispose }`
- The seeded PRNG must produce identical results for the same seed across page loads
- Each generator uses the PRNG to determine shape parameters (heights, widths, angles, sub-component counts)
- The `update` function on each structure handles per-frame animation (rotation, pulse, sway)
- The `dispose` function cleans up geometries and materials

**Files to Create:**
- `src/structures/base.ts` — CREATE — Seeded PRNG, shared helpers, base utilities
- `src/structures/registry.ts` — CREATE — Type-name-to-generator registry

**Inputs:**
- `StructureGenerator` type from `src/types.ts`
- `CONFIG` constants

**Outputs:**
- `SeededRNG` class with deterministic random methods
- Shared material/geometry helpers
- `StructureRegistry` with `register()` and `get()` methods

**Interface Contract:**

```typescript
// src/structures/base.ts

import * as THREE from 'three';

/**
 * Mulberry32-based seeded PRNG. Deterministic for a given seed.
 * Call methods in consistent order to get reproducible results.
 */
export class SeededRNG {
  constructor(seed: number);

  /** Returns float in [0, 1) */
  next(): number;

  /** Returns float in [min, max) */
  range(min: number, max: number): number;

  /** Returns integer in [min, max] inclusive */
  int(min: number, max: number): number;

  /** Returns a random item from the array */
  pick<T>(array: T[]): T;

  /** Returns a boolean with given probability (0-1) of being true */
  chance(probability: number): boolean;
}

/**
 * Creates a MeshStandardMaterial with emissive glow.
 * Common across all structure generators.
 */
export function createGlowMaterial(
  color: THREE.Color,
  options?: {
    emissiveIntensity?: number;  // default 0.5
    opacity?: number;            // default 0.85
    roughness?: number;          // default 0.3
    metalness?: number;          // default 0.7
  }
): THREE.MeshStandardMaterial;

/**
 * Creates a simple point light matching a structure's color.
 */
export function createStructureLight(
  color: THREE.Color,
  priority: number,
  options?: {
    intensity?: number;   // default: priority / 10
    distance?: number;    // default: 15 + priority * 2
  }
): THREE.PointLight;

/**
 * Utility: compute a scale factor from priority.
 * Returns CONFIG.STRUCTURE_BASE_SCALE + priority * CONFIG.STRUCTURE_PRIORITY_SCALE_FACTOR
 */
export function priorityScale(priority: number): number;

/**
 * Utility: dispose all geometries and materials in a THREE.Group recursively.
 */
export function disposeGroup(group: THREE.Group): void;
```

```typescript
// src/structures/registry.ts

import { StructureGenerator } from '../types';

/**
 * Registry mapping structure type names to generator functions.
 * Generators register themselves on import.
 */
export const StructureRegistry = {
  /** Register a generator for a type name */
  register(typeName: string, generator: StructureGenerator): void;

  /** Get a generator by type name. Returns undefined if not found. */
  get(typeName: string): StructureGenerator | undefined;

  /** Get all registered type names */
  getTypes(): string[];
};
```

Implementation note: `StructureRegistry` is a module-level singleton object (not a class). Generators import it and call `StructureRegistry.register('crystal', crystalGenerator)` at module scope. The placement system (TASK-11) calls `StructureRegistry.get(entry.type)`.

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- `SeededRNG` MUST use the mulberry32 algorithm (or equivalent 32-bit state PRNG). Do NOT use `Math.random()` anywhere in the generator system.
- `SeededRNG` methods must be called in a **consistent order** for a given seed to produce deterministic results. Document this in the class.
- `createGlowMaterial` always sets `transparent: true` — structures may have semi-transparent elements.
- `disposeGroup` must recursively traverse children AND call `.dispose()` on both geometry and material of every Mesh. Failure to do this causes GPU memory leaks.
- `StructureRegistry.register()` called with a duplicate type name logs `console.warn` and overwrites.

**Must NOT do:**
- Do not implement any specific structure generators — those are TASK-10a through TASK-10g
- Do not implement placement logic — that is TASK-11
- Do not add particles — that is TASK-15
- Do not import Three.js post-processing modules

**Acceptance Criteria:**
- [ ] `new SeededRNG(42).next()` returns the same float every time
- [ ] `new SeededRNG(42).range(0, 10)` and `new SeededRNG(42).range(0, 10)` are identical
- [ ] Two different seeds produce different sequences
- [ ] `createGlowMaterial(color)` returns a MeshStandardMaterial with emissive set to the color
- [ ] `createStructureLight(color, 8)` returns a PointLight with intensity ~0.8 and distance ~31
- [ ] `priorityScale(10)` returns `STRUCTURE_BASE_SCALE + 10 * STRUCTURE_PRIORITY_SCALE_FACTOR`
- [ ] `disposeGroup(group)` calls `.dispose()` on all nested geometries and materials
- [ ] `StructureRegistry.register('test', fn)` makes `StructureRegistry.get('test')` return `fn`
- [ ] `StructureRegistry.get('nonexistent')` returns `undefined`
- [ ] `StructureRegistry.getTypes()` returns all registered type names

**Edge Cases to Handle:**
- `SeededRNG` with seed 0 → must still produce valid random numbers (mulberry32 handles this)
- `SeededRNG.int(5, 5)` → returns 5
- `SeededRNG.pick([])` → throw Error (empty array)
- `disposeGroup` on group with no children → no-op, no errors
- `createGlowMaterial` with no options → all defaults applied

**Test Requirements:**
Write unit tests in `tests/structures/base.test.ts`. Test PRNG determinism (same seed → same sequence), PRNG range bounds, PRNG integer bounds, registry register/get/getTypes, `priorityScale` calculation. Mock Three.js objects minimally (geometry/material with `.dispose()` spy for `disposeGroup` test).

**Known Risks / Likely Mistakes:**
- AI may implement PRNG with `Math.random()` seeded by some hack — use the actual mulberry32 algorithm: `function mulberry32(a) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }}`
- AI may forget to export `StructureRegistry` as a concrete object (not a type/interface) — it must be importable and callable at module scope
- AI may make `disposeGroup` non-recursive — it must traverse the full subtree

---

## TASK-10a: Crystal Generator

**Objective:** Create `src/structures/generators/crystal.ts` — a procedural crystal formation generator that produces clusters of faceted prismatic columns with neon glow, sized by priority.

**Bootstrap Context:**
Read `src/structures/base.ts` for `SeededRNG`, `createGlowMaterial`, `createStructureLight`, `priorityScale`, and the `StructureGenerator` type from `src/types.ts`. Read `src/structures/registry.ts` to understand registration.

Key facts:
- Crystals are clusters of elongated prisms growing from a base
- The seed determines: number of prisms (3-8), their heights, tilt angles, thicknesses, and arrangement
- Priority scales the overall size
- Animation: slow rotation of the whole group, individual prism glow pulsing at different rates
- Visual reference: sharp, faceted, translucent columns with bright edges — like quartz clusters but neon-colored

**Files to Create:**
- `src/structures/generators/crystal.ts` — CREATE — Crystal formation generator

**Inputs:**
- `SeededRNG`, `createGlowMaterial`, `createStructureLight`, `priorityScale` from `src/structures/base.ts`
- `StructureRegistry` from `src/structures/registry.ts`
- `StructureGenerator` type from `src/types.ts`

**Outputs:**
- A registered generator under the name `'crystal'`

**Interface Contract:**

```typescript
// src/structures/generators/crystal.ts

// This file imports base utilities, defines the crystal generator function,
// and registers it with StructureRegistry at module scope.
// No named exports are required — registration is the side effect.

// The generator is called as:
// crystalGenerator(seed: number, priority: number, color: THREE.Color)
// → { group, boundingRadius, update(elapsed, delta), dispose() }
```

**Generation Algorithm:**

1. Create `SeededRNG` with provided seed
2. Determine prism count: `rng.int(3, 8)`
3. Compute overall scale: `priorityScale(priority)`
4. For each prism:
   a. Height: `rng.range(2, 8) * scale`
   b. Radius (width): `rng.range(0.2, 0.6) * scale`
   c. Segments: `rng.int(4, 7)` (facets — low segment count = faceted look)
   d. Tilt X: `rng.range(-0.3, 0.3)` radians
   e. Tilt Z: `rng.range(-0.3, 0.3)` radians
   f. Offset from center: `rng.range(0, 1.5) * scale` at random angle `rng.range(0, Math.PI * 2)`
   g. Create `CylinderGeometry(radiusTop * 0.3, radius, height, segments)` — tapers toward top
   h. Apply `createGlowMaterial(color, { emissiveIntensity: 0.4 + rng.range(0, 0.3), opacity: 0.7 + rng.range(0, 0.2) })`
   i. Position at offset, apply tilt rotation
   j. Set `position.y = height / 2` (base sits on ground plane)
5. Add `createStructureLight(color, priority)` at the top of the tallest prism
6. Compute `boundingRadius` from the maximum XZ extent of any prism
7. `update(elapsed, delta)`: rotate group slowly on Y axis (`elapsed * 0.05`), pulse each prism's `emissiveIntensity` with `0.4 + sin(elapsed * (0.8 + i * 0.2)) * 0.3`
8. `dispose()`: call `disposeGroup(group)`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Use ONLY `SeededRNG` for all random values — no `Math.random()`
- The generator function must be PURE — same seed + priority + color → same geometry every time
- Register with `StructureRegistry.register('crystal', generator)` at module scope (top-level side effect)
- `update()` must not create or destroy objects — only modify transforms and material properties
- All geometry origins at local (0,0,0) — the placement system (TASK-11) handles world positioning

**Must NOT do:**
- Do not position the structure in world space — placement is TASK-11
- Do not add particles — that is TASK-15
- Do not modify base.ts or registry.ts

**Acceptance Criteria:**
- [ ] `StructureRegistry.get('crystal')` returns the generator function after module is imported
- [ ] Generator produces a THREE.Group with 3-8 child prisms (varies by seed)
- [ ] Prisms are tapered CylinderGeometry with low segment count (faceted look)
- [ ] Each prism has a glowing emissive material matching the provided color
- [ ] A PointLight exists in the group
- [ ] `boundingRadius` is > 0 and reflects the actual extent
- [ ] `update()` rotates the group and pulses emissive intensities
- [ ] `dispose()` cleans up all geometries and materials
- [ ] Same seed + priority + color produces identical geometry (test with seed 42)
- [ ] Different seeds produce visually different formations

**Edge Cases to Handle:**
- Priority 1 (minimum) → small but still visible formation
- Priority 10 (maximum) → large, impressive formation
- Seed 0 → valid formation (no NaN or degenerate geometry)

**Test Requirements:**
Write unit tests in `tests/structures/generators/crystal.test.ts`. Test: generator registration, determinism (same seed → same child count), bounding radius > 0, dispose cleans up. Mock THREE minimally.

**Known Risks / Likely Mistakes:**
- AI may use `SphereGeometry` or `BoxGeometry` instead of `CylinderGeometry` — crystals must be prismatic cylinders with low face count
- AI may forget to taper the top (`radiusTop` should be significantly smaller than `radiusBottom`)
- AI may place all prisms at the same position instead of offsetting them in a cluster

---

## TASK-10b: Flora Generator

**Objective:** Create `src/structures/generators/flora.ts` — a procedural bioluminescent plant generator that produces DNA-helix twisted tree trunks with glowing foliage bulbs on curving stalks, sized by priority.

**Bootstrap Context:**
Read `src/structures/base.ts` for `SeededRNG`, `createGlowMaterial`, `createStructureLight`, `priorityScale`. Read visual reference: twisted double-helix tree trunks with neon-colored leaves/canopy, OR bulbous glowing orbs on organic curved stems rising from a root base.

Key facts:
- Two sub-variants selected by seed: (a) twisted tree, (b) bulb-stalk plant
- Twisted tree: two intertwined trunk columns spiraling upward with small glowing sphere clusters at top
- Bulb-stalk: 3-6 organic curved stalks rising from a base, each topped with a glowing translucent sphere
- Animation: gentle sway (sinusoidal oscillation on Z/X), bulb glow pulsing, subtle stalk flex

**Files to Create:**
- `src/structures/generators/flora.ts` — CREATE — Flora generator

**Inputs:**
- Same base utilities as TASK-10a

**Outputs:**
- A registered generator under the name `'flora'`

**Generation Algorithm:**

The seed's first random value determines sub-variant: `rng.next() > 0.5 ? 'tree' : 'bulbs'`

**Variant A — Twisted Tree:**
1. Two trunk columns using `CylinderGeometry`, positioned symmetrically
2. Each trunk segment (build in 5-8 vertical segments) is slightly offset in X/Z following a helix path: `x = cos(segmentIndex * helixTwist) * helixRadius`, `z = sin(segmentIndex * helixTwist) * helixRadius`
3. Use thin cylinders (radius 0.15-0.3 * scale) connected end-to-end with slight rotation
4. At the top: cluster of 5-12 small `IcosahedronGeometry` spheres as "foliage" — positioned randomly in a cloud above the trunk tops
5. Foliage spheres use highly emissive material (intensity 0.8+)

**Variant B — Bulb Stalks:**
1. `rng.int(3, 6)` stalks, each built as a curved path
2. Each stalk: series of 4-6 thin cylinders following a quadratic bezier curve from base to bulb position
3. Bulb position: `(rng.range(-2, 2) * scale, height, rng.range(-2, 2) * scale)` where height varies per stalk
4. Bulb: `SphereGeometry` with radius `rng.range(0.4, 0.8) * scale`, highly translucent material (opacity 0.6)
5. Thin connecting tendrils between some stalks using `Line` with `LineBasicMaterial`

Common to both:
- `createStructureLight` at the brightest point
- `boundingRadius` computed from max extent
- `update()`: gentle sway via `group.rotation.z = sin(elapsed * 0.3) * 0.05`, bulb/foliage pulse
- `dispose()`: `disposeGroup(group)`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Same constraints as TASK-10a (seeded RNG only, pure function, register at module scope, no world positioning)
- The helix/curve calculations must use the PRNG for parameters but standard math for the path — do not randomize the math functions themselves
- Stalks must visually connect base to bulb — no floating disconnected segments

**Must NOT do:**
- Same restrictions as TASK-10a

**Acceptance Criteria:**
- [ ] `StructureRegistry.get('flora')` returns the generator function
- [ ] Seed determines sub-variant (tree vs bulbs) deterministically
- [ ] Tree variant: two intertwined trunk paths with foliage spheres at top
- [ ] Bulb variant: 3-6 curved stalks with glowing spheres at tips
- [ ] Materials are emissive and translucent
- [ ] `update()` produces gentle sway animation
- [ ] `dispose()` cleans up all geometries and materials
- [ ] Deterministic for same seed

**Test Requirements:**
Unit tests for registration, determinism, sub-variant selection consistency. Same approach as TASK-10a tests.

**Known Risks / Likely Mistakes:**
- AI may make the helix too tight or too loose — `helixTwist` should be around 0.4-0.8 radians per segment
- AI may create stalks as single stretched cylinders instead of segmented curves — they need to visually curve
- AI may forget tendrils/connections between bulb stalks — these add organic feel

---

## TASK-10c: Mushroom Generator

**Objective:** Create `src/structures/generators/mushroom.ts` — a procedural bioluminescent mushroom cluster generator with glowing caps, fibrous stems, and spore-like particles baked into the geometry.

**Bootstrap Context:**
Same as TASK-10a. Visual reference: large translucent mushroom caps with visible gill-line patterns underneath, thick stems, smaller mushrooms clustered at the base. Vivid neon colors with interior glow.

**Files to Create:**
- `src/structures/generators/mushroom.ts` — CREATE — Mushroom cluster generator

**Inputs:**
- Same base utilities as TASK-10a

**Outputs:**
- A registered generator under the name `'mushroom'`

**Generation Algorithm:**

1. Create `SeededRNG` with seed
2. Main mushroom count: 1-3 large, 2-5 small
3. For each mushroom:
   a. Stem: `CylinderGeometry(stemRadiusTop, stemRadiusBottom, stemHeight, 8)` — slightly wider at base
   b. Cap: `SphereGeometry(capRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6)` — partial sphere (dome)
   c. Cap is positioned on top of stem, rotated so dome faces up
   d. Cap underside: `RingGeometry(innerRadius, capRadius, 24)` with radial line pattern to simulate gills — use a separate mesh with low-opacity material and rotate to face down
   e. Large mushrooms: stem height `rng.range(3, 7) * scale`, cap radius `rng.range(1, 2.5) * scale`
   f. Small mushrooms: stem height `rng.range(0.5, 2) * scale`, cap radius `rng.range(0.3, 0.8) * scale`
   g. Position small mushrooms clustered around the base of large ones
4. Cap material: highly emissive (0.6-0.9), semi-transparent (opacity 0.7), brighter at edges
5. Stem material: lower emissive (0.2), more opaque
6. Add small `SphereGeometry` dots (radius 0.05-0.1) scattered above the caps as "spores" — 5-10 per large mushroom, positioned randomly in a hemisphere above the cap. These are geometry, not a particle system (particles are TASK-15).
7. `createStructureLight` inside the largest cap (light shines through translucent material)
8. `update()`: caps gently bob up/down (`sin(elapsed * 0.5) * 0.1`), spore dots slowly orbit/drift, emissive intensity pulses
9. `dispose()`: `disposeGroup(group)`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Same core constraints as TASK-10a
- Mushroom caps MUST be partial spheres (domes), NOT full spheres — use the `phiLength` parameter of `SphereGeometry`
- Gill pattern on cap underside is a SEPARATE mesh from the cap — do not try to texture the cap
- Spore dots are small sphere MESHES, not a particle system — TASK-15 adds real particles later

**Must NOT do:**
- Same restrictions as TASK-10a
- Do not use textures for gill patterns — use geometry (RingGeometry with radial segments)

**Acceptance Criteria:**
- [ ] `StructureRegistry.get('mushroom')` returns the generator
- [ ] Produces 1-3 large and 2-5 small mushrooms in a cluster
- [ ] Caps are dome-shaped (partial sphere), not full spheres
- [ ] Gill pattern visible on cap undersides
- [ ] Small mushrooms cluster around base of large ones
- [ ] Spore dots float above caps
- [ ] `update()` produces bobbing and glow pulsing animation
- [ ] Deterministic for same seed

**Test Requirements:**
Same approach as TASK-10a tests.

**Known Risks / Likely Mistakes:**
- AI may use full spheres for caps instead of partial — use `SphereGeometry(r, wSeg, hSeg, 0, PI*2, 0, PI*0.6)`
- AI may position small mushrooms randomly instead of clustered near large ones
- AI may make stems perfectly straight and uniform — add slight tilt variation per mushroom

---

## TASK-10d: Vortex Generator

**Objective:** Create `src/structures/generators/vortex.ts` — a procedural energy vortex generator that produces a spiraling column of energy rising from a ground-level pool, with orbiting particle-like ring geometry.

**Bootstrap Context:**
Same as TASK-10a. Visual reference: a brilliant energy column spiraling upward like a contained tornado or plasma vortex, with a glowing pool/crater at the base and thin ribbon-like rings orbiting the column.

**Files to Create:**
- `src/structures/generators/vortex.ts` — CREATE — Energy vortex generator

**Inputs:**
- Same base utilities as TASK-10a

**Outputs:**
- A registered generator under the name `'vortex'`

**Generation Algorithm:**

1. **Base pool:** `RingGeometry(0.5, baseRadius * scale, 32)` laid flat (rotated -PI/2 on X). Highly emissive, semi-transparent. A second slightly larger ring with lower opacity creates a "glow" effect around the pool.
2. **Central column:** Build from 8-15 `TorusGeometry` rings stacked vertically, each slightly offset in XZ to create a spiral path. Ring radius decreases toward the top (cone shape). Each torus: `TorusGeometry(columnRadius * (1 - i/count * 0.5), tubeRadius, 8, 16)`. Position each at increasing Y heights with XZ offset: `x = sin(i * spiralTwist) * spiralRadius`, `z = cos(i * spiralTwist) * spiralRadius`. `spiralTwist = rng.range(0.3, 0.8)`, `spiralRadius = rng.range(0.3, 1.0) * scale`.
3. **Orbiting ribbons:** 2-4 thin `TorusGeometry` rings with large major radius, orbiting the column at different heights. These animate in `update()`.
4. Column height: `rng.range(5, 12) * scale`
5. Material: very high emissive (0.8-1.0), transparent (0.5-0.7), additive-feeling (use `THREE.AdditiveBlending` on the column torus materials for the energy look)
6. `createStructureLight` with high intensity at column center
7. `update()`: rotate the entire column slowly, orbit ribbons around the column at different speeds (`ribbon.rotation.y = elapsed * speed`), pulse column torus emissive intensity in a wave pattern (each ring pulses slightly after the one below it)
8. `dispose()`: `disposeGroup(group)`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Same core constraints as TASK-10a
- Column torus materials MUST use `blending: THREE.AdditiveBlending` for the energy effect. Pool and ribbon materials use default blending.
- The spiral path must be generated from PRNG parameters, not hardcoded — different seeds produce different spiral tightness and offset
- `depthWrite: false` on all transparent/additive materials to prevent z-fighting

**Must NOT do:**
- Same restrictions as TASK-10a
- Do not use `ShaderMaterial` — stick to `MeshStandardMaterial` and `MeshBasicMaterial` with blending modes

**Acceptance Criteria:**
- [ ] `StructureRegistry.get('vortex')` returns the generator
- [ ] Ground-level pool/ring is visible and glowing
- [ ] Spiral column of torus rings rises from pool
- [ ] Column tapers toward the top
- [ ] 2-4 orbiting ribbon rings at different heights
- [ ] Energy materials use additive blending
- [ ] `update()` rotates column, orbits ribbons, pulses in wave pattern
- [ ] Deterministic for same seed

**Test Requirements:**
Same approach as TASK-10a tests.

**Known Risks / Likely Mistakes:**
- AI may use `CylinderGeometry` for the column instead of stacked torus rings — torus rings create the spiral energy look
- AI may forget `depthWrite: false` on additive materials — causes ugly z-fighting artifacts
- AI may make the spiral too tight (rings overlapping) or too loose (just a straight stack) — test with multiple seeds
