# Alien Landing Page — Task Packets: Phase 3 Part 2 (Generators E-G + Placement)

---

## TASK-10e: Geometric Generator

**Objective:** Create `src/structures/generators/geometric.ts` — a procedural cosmic geometric object generator that produces ringed orbital spheres, floating platonic solids with neon orbit rings, and energy auras.

**Bootstrap Context:**
Same as TASK-10a. Visual reference: a brilliant sphere with one or more orbital rings (like a stylized atom or planet with rings), surrounded by faint particle-like dots and energy glow. Think Saturn-meets-neon-atom.

**Files to Create:**
- `src/structures/generators/geometric.ts` — CREATE — Geometric/cosmic object generator

**Inputs:**
- Same base utilities as TASK-10a

**Outputs:**
- A registered generator under the name `'geometric'`

**Generation Algorithm:**

1. **Central body:** Select shape from seed — `IcosahedronGeometry`, `OctahedronGeometry`, or `DodecahedronGeometry` (based on `rng.int(0, 2)`). Radius: `rng.range(0.8, 1.8) * scale`. High emissive intensity (0.7-1.0), warm-shifted variant of the base color for inner glow feel.
2. **Orbital rings:** `rng.int(1, 3)` rings. Each ring: `TorusGeometry(ringRadius, tubeRadius, 16, 64)` where `ringRadius = bodyRadius * rng.range(1.5, 2.5)` and `tubeRadius = 0.03-0.08 * scale`. Each ring tilted at a unique angle: `rotation.x = rng.range(0, PI)`, `rotation.z = rng.range(0, PI)`. Material: neon color, emissive 0.6, semi-transparent.
3. **Hover height:** The entire structure floats above ground. Set `group.position.y = rng.range(2, 5) * scale`. This is a LOCAL y offset — the placement system adds the terrain height.
4. **Aura dots:** 10-20 small `SphereGeometry(0.05-0.1)` meshes scattered in a sphere around the central body. Randomised positions within `bodyRadius * 2` distance.
5. **Light:** `createStructureLight` at center with high intensity
6. **`update()`:** Central body rotates slowly (`elapsed * 0.1` on Y, `elapsed * 0.07` on X). Each orbital ring rotates on its own axis at different speeds (`elapsed * (0.2 + i * 0.15)`). Aura dots slowly orbit (update their positions using sin/cos on elapsed time). Body emissive pulses.
7. **`dispose()`:** `disposeGroup(group)`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Same core constraints as TASK-10a
- The structure MUST float (local Y offset > 0) — it looks wrong sitting flat on the ground
- Orbital rings must have DIFFERENT tilt angles — identical angles look like one thick ring
- Use `IcosahedronGeometry` / `OctahedronGeometry` / `DodecahedronGeometry` — NOT `SphereGeometry` for the body. The faceted look is intentional.

**Must NOT do:**
- Same restrictions as TASK-10a

**Acceptance Criteria:**
- [ ] `StructureRegistry.get('geometric')` returns the generator
- [ ] Central body is a faceted platonic solid (not smooth sphere)
- [ ] 1-3 orbital rings at different tilt angles
- [ ] Structure floats above local origin (y > 0)
- [ ] Aura dots scattered around body
- [ ] `update()` rotates body and rings independently, orbits aura dots
- [ ] Deterministic for same seed
- [ ] Different seeds produce different platonic solid types and ring configurations

**Test Requirements:**
Same approach as TASK-10a tests.

**Known Risks / Likely Mistakes:**
- AI may use `SphereGeometry` for body — must use platonic solid geometries for faceted alien look
- AI may forget the local Y offset (floating) — the geometric type specifically floats
- AI may make all orbital rings rotate in the same direction — vary direction via `rng.chance(0.5) ? 1 : -1`

---

## TASK-10f: Entity Generator

**Objective:** Create `src/structures/generators/entity.ts` — a procedural bioluminescent alien entity generator that produces a jellyfish-like creature with a translucent dome body, trailing tendrils, and organic pulsing animation.

**Bootstrap Context:**
Same as TASK-10a. Visual reference: a massive glowing jellyfish hovering above the ground — translucent bell/dome, long trailing tendrils, internal glow, bioluminescent speckles. Distinctly alive-feeling but abstract enough that procedural variation always looks intentional.

**Files to Create:**
- `src/structures/generators/entity.ts` — CREATE — Alien entity generator

**Inputs:**
- Same base utilities as TASK-10a

**Outputs:**
- A registered generator under the name `'entity'`

**Generation Algorithm:**

1. **Bell/dome body:** `SphereGeometry(bodyRadius, 24, 16, 0, PI*2, 0, PI * 0.55)` — top hemisphere only, creating a dome. `bodyRadius = rng.range(1.5, 3.0) * scale`. Material: very transparent (opacity 0.35-0.5), high emissive, color shifted slightly toward a complementary hue using `color.offsetHSL(0, 0, rng.range(-0.1, 0.1))`.
2. **Inner glow core:** Smaller `SphereGeometry(bodyRadius * 0.4)` inside the dome. Higher emissive intensity (0.9), slightly different color (warmer). This creates the impression of internal organs/energy.
3. **Membrane veins:** 3-5 `Line` objects on the dome surface using `LineBasicMaterial`. Each vein follows a path from the dome apex downward in a branching pattern (2-3 segments per vein). Low opacity (0.3), neon color.
4. **Tendrils:** `rng.int(5, 12)` tendrils hanging below the dome. Each tendril is built from 6-10 connected thin `CylinderGeometry` segments forming a downward curve. Tendril length: `rng.range(3, 8) * scale`. Tendrils attach at random points around the dome's bottom rim. Material: semi-transparent, emissive, tapering opacity (more transparent at tips).
5. **Hover height:** The entity floats significantly above ground. Local Y: `rng.range(4, 8) * scale`.
6. **Light:** `createStructureLight` inside the dome at high intensity
7. **`update()`:**
   - Gentle up/down bob: `group.position.y = baseY + sin(elapsed * 0.4) * 0.5`
   - Dome "breathing": scale the dome Y slightly: `dome.scale.y = 1 + sin(elapsed * 0.6) * 0.05`
   - Tendril sway: each tendril segment rotates slightly on X/Z based on `sin(elapsed * 0.5 + segmentIndex * 0.3) * 0.03` — creates organic wave motion from top to bottom of each tendril
   - Inner glow pulse: emissive intensity cycles slowly
8. **`dispose()`:** `disposeGroup(group)`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Same core constraints as TASK-10a
- Entity MUST float well above ground (local Y offset ≥ 4 * scale) — it's a hovering creature
- Dome material MUST have low opacity (≤ 0.5) — the translucency is core to the jellyfish look
- Tendrils MUST animate independently — they should not move as rigid bodies, but wave/flex
- The entity must NOT look humanoid — no limbs, no face-like features, no bilateral symmetry

**Must NOT do:**
- Same restrictions as TASK-10a
- Do not add eyes, mouth, or face features
- Do not make it bipedal or humanoid in any way

**Acceptance Criteria:**
- [ ] `StructureRegistry.get('entity')` returns the generator
- [ ] Dome is a partial sphere (hemisphere), translucent
- [ ] Inner core visible through dome
- [ ] 5-12 tendrils hanging below dome
- [ ] Tendrils are segmented curves, not straight lines
- [ ] Entity floats above local origin
- [ ] `update()` produces breathing, bobbing, and tendril wave animation
- [ ] Deterministic for same seed
- [ ] Does not look humanoid

**Test Requirements:**
Same approach as TASK-10a tests. Additional: verify tendril count is between 5 and 12 for any seed.

**Known Risks / Likely Mistakes:**
- AI may make tendrils as single stretched cylinders — they MUST be multi-segment curves for organic wave motion
- AI may forget the tendril animation (each segment moving independently) — test that `update()` modifies tendril segment rotations
- AI may set dome opacity too high — keep it ≤ 0.5 for translucency
- AI may position tendrils at the dome center instead of around the bottom rim — compute attachment points along the dome's equator

---

## TASK-10g: Architecture Generator

**Objective:** Create `src/structures/generators/architecture.ts` — a procedural alien tower/monolith generator with geometric stepped forms, glowing windows/panels, and cascading data-glyph elements.

**Bootstrap Context:**
Same as TASK-10a. Visual reference: a tall alien building/tower with geometric forms (stepped pyramid, brutalist blocks, crystalline spires), glowing panels/windows on the surface, and streams of light or data-like patterns cascading down the facade. Think alien civilisation's architecture — monumental, geometric, lit from within.

**Files to Create:**
- `src/structures/generators/architecture.ts` — CREATE — Alien architecture generator

**Inputs:**
- Same base utilities as TASK-10a

**Outputs:**
- A registered generator under the name `'architecture'`

**Generation Algorithm:**

1. **Base form:** Select from seed — stepped tower, monolith slab, or spired cathedral.
   - Stepped tower: 3-6 stacked `BoxGeometry` blocks, each smaller than the one below. Block widths decrease linearly. Heights vary per block.
   - Monolith slab: Single tall `BoxGeometry` with proportions width:depth:height roughly 1:0.3:4. Add smaller protruding box elements on faces.
   - Spired cathedral: Central tall `CylinderGeometry(4-6 sides)` with 2-4 smaller flanking spires at different heights.
2. **Total height:** `rng.range(6, 15) * scale`
3. **Material — structure body:** Dark, low emissive (0.1-0.2), metallic (0.8), low roughness (0.3). Color: dark variant of the provided color (use `color.clone().multiplyScalar(0.2)`).
4. **Glowing panels/windows:** For each face of the main structure, add 3-8 small thin `BoxGeometry` panels (`width * 0.15, height * 0.1, 0.05`) positioned on the surface (offset slightly outward from the face). These use highly emissive material (0.8+) in the full neon color. Positions determined by PRNG.
5. **Data cascade:** A vertical strip on one face of the main structure. Build from 10-20 very small `BoxGeometry` elements arranged in a column, alternating on/off emissive states. These represent cascading data/glyphs. In `update()`, cycle which elements are "on" to create a scrolling effect.
6. **Foundation:** A flat `BoxGeometry` base platform slightly wider than the structure, at ground level.
7. **Light:** `createStructureLight` at the structure's peak
8. **`update()`:** Data cascade scrolling (cycle `visible` or `emissiveIntensity` of cascade elements at regular intervals). Window panels pulse gently. Whole structure does NOT rotate (buildings don't spin).
9. **`dispose()`:** `disposeGroup(group)`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Same core constraints as TASK-10a
- Architecture structures do NOT rotate in `update()` — they are static buildings. Only light/glow animations.
- The structure body must be DARK with bright emissive panels — not uniformly glowing. The contrast between dark structure and bright windows is the key aesthetic.
- Data cascade must animate (scroll/cycle) — static dots don't read as "data"

**Must NOT do:**
- Same restrictions as TASK-10a
- Do not add text or readable characters to the data cascade — it's abstract geometric dots/dashes

**Acceptance Criteria:**
- [ ] `StructureRegistry.get('architecture')` returns the generator
- [ ] One of three sub-variants produced based on seed (stepped, monolith, spired)
- [ ] Dark body material contrasts with bright emissive window panels
- [ ] Data cascade column with animated scrolling glow
- [ ] Foundation platform at base
- [ ] Structure does NOT rotate
- [ ] `update()` animates cascade and pulses windows
- [ ] Deterministic for same seed

**Test Requirements:**
Same approach as TASK-10a tests. Verify sub-variant selection is deterministic.

**Known Risks / Likely Mistakes:**
- AI may make the whole structure glow uniformly — the body MUST be dark, only panels/windows glow
- AI may forget the data cascade animation — static dots don't convey the "digital" aesthetic
- AI may make the structure rotate — architecture is static; only light effects animate

---

## TASK-11: Structure Placement & Data Integration

**Objective:** Create `src/structures/placement.ts` that takes the loaded `DataEntry[]` array, resolves each entry to a structure generator, creates structure instances, positions them on the terrain surface using priority-driven angular distribution, and returns the array of `StructureInstance` objects for the render loop.

**Bootstrap Context:**
Read `src/types.ts` for `DataEntry`, `StructureInstance`, `StructureGenerator`. Read `src/structures/registry.ts` for `StructureRegistry`. Read `src/scene/terrain.ts` for `TerrainContext.getHeightAt()`. Read `src/data/loader.ts` for the data format.

Key facts:
- Entries arrive sorted by priority descending (from the data loader)
- Higher priority entries are placed closer to the center (smaller radius from origin)
- Entries are distributed evenly around the center using angular spacing
- Each structure sits on the terrain surface — use `getHeightAt(x, z)` for the Y position
- If an entry has no `type`, one was already assigned by the data loader (round-robin)
- If a type has no registered generator, fall back to 'crystal' with `console.warn`

**Files to Create:**
- `src/structures/placement.ts` — CREATE — Structure placement and data integration

**Files to Modify:**
- `src/main.ts` — MODIFY — Import placement, call after data load and scene init, integrate update loop

**Inputs:**
- `DataEntry[]` from `loadSiteData()`
- `TerrainContext` from `createTerrain()`
- `StructureRegistry` from `src/structures/registry.ts`
- `CONFIG` structure placement constants

**Outputs:**
- `placeStructures(entries: DataEntry[], terrain: TerrainContext, scene: THREE.Scene): StructureInstance[]`

**Interface Contract:**

```typescript
// src/structures/placement.ts

import * as THREE from 'three';
import { DataEntry, StructureInstance } from '../types';
import { TerrainContext } from '../scene/terrain';

/**
 * Creates and places structure instances for each data entry.
 * Returns array of StructureInstance for render loop integration.
 *
 * Placement strategy:
 * - Entries sorted by priority (already sorted from loader)
 * - Higher priority = closer to center
 * - Angular distribution: entries spaced evenly around the Y axis
 * - Radius from center: STRUCTURE_MIN_RADIUS + (1 - normalizedPriority) * (STRUCTURE_MAX_RADIUS - STRUCTURE_MIN_RADIUS)
 * - Y position: terrain.getHeightAt(x, z)
 */
export function placeStructures(
  entries: DataEntry[],
  terrain: TerrainContext,
  scene: THREE.Scene,
): StructureInstance[];
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Structure generators MUST be imported dynamically or the generator files must be imported in `main.ts` so their registration side effects fire BEFORE `placeStructures` is called. The placement function itself does NOT import generators — it uses the registry.
- Each structure's `group.position` is set to world coordinates based on terrain height. Generators produce geometry relative to local (0,0,0) — placement adds the world offset.
- If `StructureRegistry.get(entry.type)` returns undefined, fall back to `StructureRegistry.get('crystal')`. If crystal also missing, skip the entry with `console.error`.
- Color for each structure: pick from `CONFIG.NEON_COLORS` based on entry index modulo array length.
- Seed: use `entry.seed` (guaranteed to be populated by the data loader).
- The returned `StructureInstance.worldPosition` must be accurate — the label system (TASK-14) uses it.

**Must NOT do:**
- Do not modify the data loader — entries arrive already validated and defaulted
- Do not modify structure generators or the registry
- Do not add particles — TASK-15 reads the StructureInstance array and adds particles
- Do not add labels — TASK-14 handles that

**Acceptance Criteria:**
- [ ] Each entry in the array produces one `StructureInstance`
- [ ] Higher priority entries are placed closer to center
- [ ] Entries are distributed evenly by angle (no overlapping/bunching)
- [ ] Each structure sits on terrain surface (Y from `getHeightAt`)
- [ ] Unknown types fall back to 'crystal' with console.warn
- [ ] `StructureInstance.worldPosition` accurately reflects the placed position
- [ ] `StructureInstance.update` delegates to the generator's update function
- [ ] `StructureInstance.dispose` delegates to the generator's dispose function
- [ ] All structure groups are added to the provided scene
- [ ] An entry with priority 10 is placed at approximately `STRUCTURE_MIN_RADIUS` from center
- [ ] An entry with priority 1 is placed at approximately `STRUCTURE_MAX_RADIUS` from center

**Edge Cases to Handle:**
- Empty entries array `[]` → return `[]`
- Single entry → placed at angle 0, at radius determined by its priority
- All entries same priority → equal radius, evenly spaced angles
- Generator returns group with no mesh children → still create StructureInstance (may be particles-only later)

**Test Requirements:**
Write unit tests in `tests/structures/placement.test.ts`. Mock `TerrainContext.getHeightAt` to return a fixed value. Mock `StructureRegistry.get` to return a simple generator. Test: placement radius scales with priority, angular distribution is even, world positions are correct, fallback behavior for unknown types.

**Known Risks / Likely Mistakes:**
- AI may compute placement radius inversely (high priority = far from center) — HIGH priority entries go CLOSER to center (smaller radius)
- AI may forget to call the generator's `update()` from `StructureInstance.update()` — the render loop depends on this delegation
- AI may import generator files inside `placement.ts` — this creates a circular dependency risk. Generators register themselves; placement only reads the registry. Ensure main.ts imports all generators before calling placement.
- AI may compute angular distribution starting from 0° for the first entry — add a small offset (`Math.PI / 6` or similar) so entries don't align with the camera's initial forward direction
