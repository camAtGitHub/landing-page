# Alien Landing Page — Dependency Graph & Task Overview

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

## Shared Contracts (files touched by multiple tasks)

| File | Owned by | Read by |
|------|----------|---------|
| `src/types.ts` | TASK-01 | All tasks |
| `src/config.ts` | TASK-01 (created), TASK-03 through TASK-17 (extended) |  All tasks |
| `src/structures/base.ts` | TASK-09 | TASK-10a through TASK-10g, TASK-11, TASK-15 |
| `src/structures/registry.ts` | TASK-09 | TASK-10a through TASK-10g (register), TASK-11 (consume) |
| `src/camera/state-machine.ts` | TASK-06 | TASK-07, TASK-08, TASK-12, TASK-13, TASK-14 |

⚠️ **RISK: `config.ts` is extended by many tasks.** Each task adds its own config section. Tasks must ONLY add new properties under their designated namespace — never modify existing properties. Config uses a flat-namespace object with section prefixes (e.g., `TERRAIN_`, `DESCENT_`, `STRUCTURE_`).

⚠️ **RISK: `structures/registry.ts` is written to by all generator tasks.** Each generator task registers itself via a single `registerGenerator()` call. The registry pattern avoids file conflicts — generators import the registry and register themselves, rather than the registry importing generators.

---

## Task List

### Phase 1: Foundation
| Task | Name | Depends on | Parallel group |
|------|------|-----------|----------------|
| TASK-01 | Project Scaffolding & Core Types | — | — |
| TASK-02 | Data Loader | TASK-01 | — |
| TASK-03 | Scene Foundation | TASK-01 | A |
| TASK-04 | Terrain Generation | TASK-03 | — |
| TASK-05 | Starfield & Sky | TASK-03 | B (parallel with TASK-04) |

### Phase 2: Camera System
| Task | Name | Depends on | Parallel group |
|------|------|-----------|----------------|
| TASK-06 | Camera State Machine | TASK-01 | — |
| TASK-07 | Descent Sequence | TASK-05, TASK-06 | — |
| TASK-08 | Descent HUD Overlay | TASK-06, TASK-07 | — |

### Phase 3: Structure System
| Task | Name | Depends on | Parallel group |
|------|------|-----------|----------------|
| TASK-09 | Structure Generator Framework | TASK-01 | — |
| TASK-10a | Crystal Generator | TASK-09 | C |
| TASK-10b | Flora Generator | TASK-09 | C |
| TASK-10c | Mushroom Generator | TASK-09 | C |
| TASK-10d | Vortex Generator | TASK-09 | C |
| TASK-10e | Geometric Generator | TASK-09 | C |
| TASK-10f | Entity Generator | TASK-09 | C |
| TASK-10g | Architecture Generator | TASK-09 | C |
| TASK-11 | Structure Placement & Data Integration | TASK-02, TASK-04, TASK-09, TASK-10* | — |

### Phase 4: Camera Controllers
| Task | Name | Depends on | Parallel group |
|------|------|-----------|----------------|
| TASK-12 | Free Camera Controls | TASK-04, TASK-06 | D |
| TASK-13 | Fixed/Orbit Camera | TASK-06 | D |

### Phase 5: UI & Effects
| Task | Name | Depends on | Parallel group |
|------|------|-----------|----------------|
| TASK-14 | HTML Label System | TASK-06, TASK-11 | E |
| TASK-15 | Particle Systems | TASK-09, TASK-11 | E |
| TASK-16 | Post-Processing Effects | TASK-03 | E |

### Phase 6: Polish
| Task | Name | Depends on | Parallel group |
|------|------|-----------|----------------|
| TASK-17 | Mobile Adaptation & Integration | ALL prior tasks | — |

---

## Execution Order (Critical Path)

```
TASK-01 ──┬── TASK-02 ──────────────────────────────────────────┐
          ├── TASK-03 ──┬── TASK-04 ──┐                         │
          │             └── TASK-05 ──┼── TASK-07 ── TASK-08    │
          ├── TASK-06 ────────────────┘                         │
          └── TASK-09 ──┬── TASK-10a ┐                          │
                        ├── TASK-10b │                          │
                        ├── TASK-10c │                          │
                        ├── TASK-10d ├── TASK-11 ───────────────┤
                        ├── TASK-10e │      │                   │
                        ├── TASK-10f │      ├── TASK-14         │
                        └── TASK-10g ┘      ├── TASK-15         │
                                            │                   │
          TASK-04 ── TASK-12 (parallel D)   │   TASK-16         │
          TASK-06 ── TASK-13 (parallel D)   │                   │
                                            └───────────────────┴── TASK-17
```

**Critical path:** TASK-01 → TASK-03 → TASK-04/05 → TASK-07 → TASK-08 (descent experience must work first)

**Parallelism opportunities:**
- Group C: All 7 structure generators can be built simultaneously
- Group D: Free-cam and fixed-cam controllers can be built simultaneously
- Group E: Labels, particles, and post-processing can be built simultaneously
- TASK-02 (data loader) can be built any time after TASK-01

---

## Risk Register

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | `config.ts` merge conflicts from multiple tasks adding constants | Medium — broken builds | Each task adds constants under a namespaced prefix. Tasks must not modify existing constants. |
| R2 | Three.js import path inconsistency (`three` vs `three/examples/jsm/...`) | High — runtime errors | TASK-01 establishes import conventions in `types.ts` header comment. All tasks follow. |
| R3 | Structure generators producing geometry that clips through terrain | Medium — visual glitch | TASK-11 (placement) samples terrain height and positions structures on surface. Generators produce geometry relative to local origin (0,0,0). |
| R4 | Camera state machine race conditions during rapid Escape presses | Low — camera glitch | TASK-06 implements transition cooldown (300ms minimum between state changes). |
| R5 | Seeded PRNG producing visually poor/degenerate structures for certain seeds | Medium — ugly page | Each generator must clamp/normalize PRNG outputs to safe ranges. Test with seeds 0, 1, 42, 999, 2147483647. |
| R6 | EffectComposer + bloom causing performance issues on low-end devices | Medium — poor experience | TASK-16 must include a performance detection fallback that disables bloom if FPS drops below 30. |
| R7 | Click-to-blink teleport allowing player to leave the terrain bounds | Medium — falling into void | TASK-12 must clamp blink target to within terrain boundaries (configurable radius from origin). |
| R8 | HTML labels desyncing from 3D positions during camera animation | Low — visual glitch | TASK-14 updates label positions every frame in the render loop, not on a separate timer. |
