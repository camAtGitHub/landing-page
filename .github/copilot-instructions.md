# ORCHESTRATOR.md — Alien Landing Page Build Instructions

---

## READ EVERYTHING BELOW BEFORE STARTING

## SPAWN A NEW SUB-AGENT TO COMPLETE EACH TASK: TASK-01 → TASK-17

## FOLLOW, GENERATE AND COMPLETE THE 'TESTING STRATEGY' AS WRITTEN

## AFTER EACH TASK: RUN `npm test` AND `npm run build` — FIX FAILURES BEFORE MOVING ON

## ONLY STOP WHEN EVERYTHING HAS BEEN COMPLETED SUCCESSFULLY

---

## Sub-Agent Bootstrap Sequence

Every sub-agent MUST follow these steps before writing any code:

### Step 0 — Orient
1. Read `AGENTS.md` in the project root (coding standards, stack, conventions)
2. Read `01-system-frame-and-bootstrap.md` (architecture, data schema, constraints)
3. Read `02-dependency-graph-and-task-overview.md` (dependency graph, execution order, risks)

### Step 1 — Locate Your Task
Find your assigned TASK-XX in the appropriate phase document:
- TASK-01 to TASK-05 → `03-task-packets-phase1-foundation.md`
- TASK-06 to TASK-08 → `04-task-packets-phase2-camera.md`
- TASK-09, TASK-10a to TASK-10d → `05-task-packets-phase3-structures-part1.md`
- TASK-10e to TASK-10g, TASK-11 → `06-task-packets-phase3-structures-part2.md`
- TASK-12 to TASK-16 → `07-task-packets-phase4-5-controllers-ui-effects.md`
- TASK-17 → `08-task-packets-phase6-integration.md`

Also read `09-visual-reference-guide.md` if your task involves any visual output (structures, terrain, sky, particles, HUD).

### Step 2 — Verify Dependencies
Check that all tasks your task depends on are complete:
- Files listed in "Inputs" and "Bootstrap Context" must exist
- Run `npm test` to confirm prior tests pass
- Run `npm run build` to confirm no build errors

If a dependency is missing, STOP and report. Do not improvise missing modules.

### Step 3 — Implement
Follow the task packet exactly:
- Create/modify ONLY the files listed in "Files to Create / Modify"
- Respect every ⚠️ CRITICAL CONSTRAINT
- Respect every "Must NOT do" item
- Add config constants under your task's namespace prefix in `config.ts` if needed

### Step 4 — Test
- Write tests specified in "Test Requirements" (see Testing Strategy below)
- Run `npm test` — all tests must pass (yours AND all prior tasks')
- Run `npm run build` — build must succeed with no type errors
- If the task specifies visual verification, run `npm run dev` and verify in browser

### Step 5 — Verify Acceptance Criteria
Go through every checkbox in "Acceptance Criteria" and confirm each is met.

### Step 6 — Hand Off
Move to the next task or report completion.

---

## Task Execution Order

Execute tasks in this exact order. Tasks marked with the same parallel group letter CAN be done simultaneously, but if executing sequentially, follow the listed order.

```
TASK-01  Project Scaffolding & Core Types
TASK-02  Data Loader
TASK-03  Scene Foundation
TASK-04  Terrain Generation
TASK-05  Starfield & Sky
TASK-06  Camera State Machine
TASK-07  Descent Sequence
TASK-08  Descent HUD Overlay
TASK-09  Structure Generator Framework
TASK-10a Crystal Generator          ← parallel group C
TASK-10b Flora Generator            ← parallel group C
TASK-10c Mushroom Generator         ← parallel group C
TASK-10d Vortex Generator           ← parallel group C
TASK-10e Geometric Generator        ← parallel group C
TASK-10f Entity Generator           ← parallel group C
TASK-10g Architecture Generator     ← parallel group C
TASK-11  Structure Placement & Data Integration
TASK-12  Free Camera Controls       ← parallel group D
TASK-13  Fixed/Orbit Camera         ← parallel group D
TASK-14  HTML Label System
TASK-15  Particle Systems
TASK-16  Post-Processing Effects
TASK-17  Mobile Adaptation & Final Integration
```

---

## Testing Strategy

### Test Infrastructure (created by TASK-01)

Add `vitest` as a devDependency. Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/ui/**', 'src/hud/**', 'src/effects/**'],
    },
  },
});
```

### Test File Map

Each task with automated tests creates its test file. Here is the full map:

| Task | Test File | What to Test |
|------|-----------|-------------|
| TASK-01 | — | No automated tests (visual: black canvas, build output check) |
| TASK-02 | `tests/data/loader.test.ts` | fetch mock, validation, defaults, sorting, edge cases |
| TASK-03 | — | No automated tests (visual: dark scene with fog) |
| TASK-04 | `tests/scene/terrain.test.ts` | getHeightAt determinism, flat zone, displacement math |
| TASK-05 | — | No automated tests (visual: star field) |
| TASK-06 | `tests/camera/state-machine.test.ts` | State transitions, cooldown, callbacks, Escape flow |
| TASK-07 | `tests/camera/descent.test.ts` | Progress calc, camera Y easing, star warp, isComplete |
| TASK-08 | — | No automated tests (visual: HUD overlay) |
| TASK-09 | `tests/structures/base.test.ts` | PRNG determinism, range/int/pick, registry CRUD, priorityScale, disposeGroup |
| TASK-10a | `tests/structures/generators/crystal.test.ts` | Registration, determinism, child count range, bounding radius, dispose |
| TASK-10b | `tests/structures/generators/flora.test.ts` | Registration, determinism, sub-variant consistency |
| TASK-10c | `tests/structures/generators/mushroom.test.ts` | Registration, determinism, child count ranges |
| TASK-10d | `tests/structures/generators/vortex.test.ts` | Registration, determinism, component presence |
| TASK-10e | `tests/structures/generators/geometric.test.ts` | Registration, determinism, floating Y offset |
| TASK-10f | `tests/structures/generators/entity.test.ts` | Registration, determinism, tendril count 5-12 |
| TASK-10g | `tests/structures/generators/architecture.test.ts` | Registration, determinism, sub-variant consistency |
| TASK-11 | `tests/structures/placement.test.ts` | Priority→radius mapping, angular distribution, terrain height, fallback |
| TASK-12 | `tests/camera/free-cam.test.ts` | Yaw/pitch calc, forward vector, blink target, boundary clamp |
| TASK-13 | `tests/camera/fixed-cam.test.ts` | Orbit position at different elapsed, parallax offset |
| TASK-14 | — | No automated tests (visual: label projection + clicks) |
| TASK-15 | — | No automated tests (visual: particle effects) |
| TASK-16 | — | No automated tests (visual: bloom glow) |
| TASK-17 | — | Manual integration testing (see checklist below) |

**Total: 16 test files covering the testable logic. 7 tasks are visual-only verification.**

---

### Test Patterns & Mocking Guide

All tests should follow these patterns:

#### Mocking Three.js

Three.js objects are heavy and need WebGL context. Do NOT import Three.js in tests unless you're testing pure math. Instead, mock:

```typescript
// tests/helpers/three-mocks.ts

export function mockVector3(x = 0, y = 0, z = 0) {
  return { x, y, z, set: vi.fn(), copy: vi.fn(), clone: vi.fn() };
}

export function mockGroup() {
  const children: any[] = [];
  return {
    children,
    position: mockVector3(),
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    scale: { x: 1, y: 1, z: 1 },
    add: vi.fn((child: any) => children.push(child)),
    remove: vi.fn(),
  };
}

export function mockCamera() {
  return {
    position: mockVector3(0, 300, 0),
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    aspect: 16 / 9,
    updateProjectionMatrix: vi.fn(),
    lookAt: vi.fn(),
  };
}

export function mockMesh() {
  return {
    geometry: { dispose: vi.fn() },
    material: { dispose: vi.fn(), emissiveIntensity: 0.5 },
    position: mockVector3(),
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}
```

#### Mocking fetch (for data loader)

```typescript
function mockFetch(data: any, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}
```

#### Generator Test Template

All 7 generator tests follow the same skeleton:

```typescript
// tests/structures/generators/[type].test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// NOTE: you'll need to mock THREE before importing the generator
vi.mock('three', () => ({
  Group: vi.fn(() => mockGroup()),
  CylinderGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(() => ({ dispose: vi.fn(), emissiveIntensity: 0.5 })),
  PointLight: vi.fn(() => ({ position: { set: vi.fn() } })),
  Color: vi.fn(() => ({ r: 1, g: 0, b: 1, clone: vi.fn(), offsetHSL: vi.fn(), multiplyScalar: vi.fn() })),
  // ... add other geometry/material types as needed by the specific generator
}));

describe('[Type] Generator', () => {
  it('registers itself in the StructureRegistry', () => {
    // Import triggers side-effect registration
    // Check StructureRegistry.get('[type]') is defined
  });

  it('produces deterministic output for same seed', () => {
    const result1 = generator(42, 5, color);
    const result2 = generator(42, 5, color);
    // Compare child counts, bounding radius
  });

  it('produces different output for different seeds', () => {
    const result1 = generator(42, 5, color);
    const result2 = generator(99, 5, color);
    // At least one measurable property differs
  });

  it('returns bounding radius > 0', () => {
    const result = generator(42, 5, color);
    expect(result.boundingRadius).toBeGreaterThan(0);
  });

  it('update() does not throw', () => {
    const result = generator(42, 5, color);
    expect(() => result.update(1.0, 0.016)).not.toThrow();
  });

  it('dispose() does not throw', () => {
    const result = generator(42, 5, color);
    expect(() => result.dispose()).not.toThrow();
  });

  // === Type-specific tests ===
  // crystal: child count 3-8
  // flora: sub-variant determinism
  // mushroom: large count 1-3, small count 2-5
  // vortex: has additive blending materials
  // geometric: local Y offset > 0 (floating)
  // entity: tendril count 5-12, dome opacity ≤ 0.5
  // architecture: sub-variant determinism, no rotation in update
});
```

---

### Checkpoint Validation

After completing each phase, run these checkpoint commands:

#### After Phase 1 (TASK-01 through TASK-05):
```bash
npm test                  # loader + terrain tests pass
npm run build             # clean build, dist/ produced
# Visual: npm run dev → stars visible, terrain visible, dark scene
```

#### After Phase 2 (TASK-06 through TASK-08):
```bash
npm test                  # + state machine + descent tests pass
npm run build             # clean build
# Visual: npm run dev → descent plays, HUD visible, Escape skips
```

#### After Phase 3 (TASK-09 through TASK-11):
```bash
npm test                  # + base, all 7 generators, placement tests pass
npm run build             # clean build
# Visual: npm run dev → structures visible on terrain after descent
```

#### After Phase 4-5 (TASK-12 through TASK-16):
```bash
npm test                  # + free-cam, fixed-cam tests pass
npm run build             # clean build
# Visual: npm run dev → full experience: WASD, blink, orbit, labels, bloom, particles
```

#### After Phase 6 (TASK-17):
```bash
npm test                  # ALL tests pass
npm run build             # clean production build
# Visual: full manual integration test (see checklist below)
```

---

### TASK-17 Manual Integration Checklist

After final integration, manually verify every item:

```
[ ] Page loads → loading screen appears ("APPROACHING...")
[ ] Loading screen fades → descent begins automatically
[ ] Stars warp during descent (streak upward)
[ ] HUD overlay visible during descent (corner lines, altitude, velocity)
[ ] Nebula color layers pass by during descent
[ ] Escape during descent → skips to surface immediately
[ ] After descent → structures visible as varied alien formations
[ ] Each structure type is visually distinct (crystal ≠ flora ≠ mushroom etc.)
[ ] Priority affects structure size/prominence (Blog biggest, Contact smallest)
[ ] Labels appear above structures with names and descriptions
[ ] Clicking a label with relative URL → navigates in same tab
[ ] Clicking a label with absolute URL → opens new tab
[ ] Desktop: mouse look rotates camera
[ ] Desktop: WASD moves camera on terrain
[ ] Desktop: left click performs blink teleport forward
[ ] Desktop: blink does NOT trigger when clicking a label
[ ] Desktop: camera follows terrain height (no flying, smooth Y)
[ ] Desktop: camera stays within terrain boundary
[ ] Desktop: Escape toggles to orbit view
[ ] Desktop: Escape again toggles back to free-cam
[ ] Orbit view: camera orbits slowly, mouse adds parallax
[ ] Mobile (or narrow viewport): starts in orbit view after descent
[ ] Mobile: touch adds parallax to orbit view
[ ] Mode indicator shows correct text per mode
[ ] Ambient dust particles float across scene
[ ] Per-structure particles emit (spores, motes, energy)
[ ] Bloom glow visible on emissive structures
[ ] Edit data.json → reload → changes reflected without rebuild
[ ] Empty data.json [] → empty planet, no crash
[ ] Unknown type in data.json → falls back to crystal, no crash
[ ] npm run build → dist/ contains index.html, JS bundle, data.json
[ ] Serve dist/ with static server → full experience works
[ ] Chrome, Firefox, Safari → all work
[ ] Console: no errors (warnings for fallbacks are OK)
```

---

## Failure Recovery

If a task fails or produces broken output:

1. **Build fails:** Run `tsc --noEmit` to find type errors. Check import paths (especially Three.js `.js` extensions).
2. **Tests fail:** Read the failure message. Check if a prior task's interface changed — if so, fix the contract violation at the source.
3. **Visual glitch:** Check the relevant module's `update()` function. Ensure `needsUpdate = true` on buffers. Check material `depthWrite` and `transparent` settings.
4. **Nothing renders:** Check `main.ts` wiring order. Ensure all generator imports are present (side-effect imports). Ensure `postProc.render()` is called instead of `renderer.render()`.
5. **Labels don't appear:** Check that `labels.show()` is called after descent ends. Check the 3D→2D projection math. Check `#overlay` exists in HTML.
6. **Camera broken:** Verify `camera.rotation.order = 'YXZ'`. Check state machine has all controllers registered. Check `activate()` sets initial position.

---

## Reference Documents

| File | Contains |
|------|----------|
| `AGENTS.md` | Coding standards, stack, conventions, file layout |
| `01-system-frame-and-bootstrap.md` | Architecture, data schema, constraints, module map |
| `02-dependency-graph-and-task-overview.md` | Dependencies, execution order, parallel groups, risk register |
| `03-task-packets-phase1-foundation.md` | TASK-01 through TASK-05 |
| `04-task-packets-phase2-camera.md` | TASK-06 through TASK-08 |
| `05-task-packets-phase3-structures-part1.md` | TASK-09, TASK-10a through TASK-10d |
| `06-task-packets-phase3-structures-part2.md` | TASK-10e through TASK-10g, TASK-11 |
| `07-task-packets-phase4-5-controllers-ui-effects.md` | TASK-12 through TASK-16 |
| `08-task-packets-phase6-integration.md` | TASK-17 |
| `09-visual-reference-guide.md` | Aesthetic targets, color palette, structure type descriptions |
