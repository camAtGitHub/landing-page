# Bugfix Phase — Task Overview, Dependencies & Risk Register

## System Frame

**Problem statement:** Three critical bugs and one UX enhancement need fixing in the cammckenzie.com 3D landing page after its initial build.

**System boundaries:** Only the runtime TypeScript application in `src/` is in scope. No changes to `public/data.json`, build tooling, HTML structure, or the 7 structure generators.

**Key architectural decision:** All fixes follow the existing factory-function pattern with config-driven constants. No new patterns introduced.

---

## Task List

| Task | Name | Status | Parallel? |
|------|------|--------|-----------|
| TASK-00 | Bootstrap Context | Reference doc | — |
| TASK-01 | Fix descent animation activation | Bug fix | Yes (parallel with TASK-03) |
| TASK-02 | Fix nebula walls at ground level | Bug fix | After TASK-01 |
| TASK-03 | Fix camera mouse sensitivity + arrow keys | Bug fix | Yes (parallel with TASK-01) |
| TASK-04 | Add control hints overlay | Enhancement | After TASK-01 + TASK-03 |

---

## Dependency Graph

```
TASK-01 (descent activation) ──┬──→ TASK-02 (nebula fade)
                               │
                               └──→ TASK-04 (control hints)
                                       ↑
TASK-03 (camera controls) ─────────────┘
```

**Parallel group:** TASK-01 and TASK-03 touch completely different files and can be done simultaneously.

**Sequential:** TASK-02 depends on TASK-01 because the nebula fade is driven by descent progress — descent must work first. TASK-04 depends on both TASK-01 (descent must complete to trigger the hints) and TASK-03 (arrow key behaviour must be finalized so the hint text is accurate).

---

## Files Touched Per Task

| File | TASK-01 | TASK-02 | TASK-03 | TASK-04 |
|------|---------|---------|---------|---------|
| `src/camera/state-machine.ts` | MODIFY | — | — | — |
| `src/scene/sky.ts` | — | MODIFY | — | — |
| `src/camera/descent.ts` | — | MODIFY | — | — |
| `src/config.ts` | — | — | MODIFY | — |
| `src/camera/free-cam.ts` | — | — | MODIFY | — |
| `src/ui/control-hints.ts` | — | — | — | CREATE |
| `src/main.ts` | — | — | — | MODIFY (1 import + 1 call) |

**No file conflicts.** Each task modifies a distinct set of files. TASK-02 modifies `descent.ts` but TASK-01 does not, so there is no merge conflict risk.

---

## Execution Order

### Phase A (parallel):
- **TASK-01** — Fix descent activation in `state-machine.ts`
- **TASK-03** — Fix camera sensitivity and arrow keys in `config.ts` + `free-cam.ts`

**Checkpoint A:** `npm test && npm run build` — verify descent plays and camera controls feel right.

### Phase B (sequential, after Phase A):
- **TASK-02** — Add nebula fade to `sky.ts` + `descent.ts`

**Checkpoint B:** `npm test && npm run build` — verify no walls at ground level, nebulae visible during descent.

### Phase C (sequential, after Phase B):
- **TASK-04** — Create `control-hints.ts`, wire in `main.ts`

**Checkpoint C (final):** `npm test && npm run build` — full manual walkthrough: load → descent plays → hints appear → controls work → no walls → labels clickable → ESC toggles views.

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Descent controller double-activation if `update()` guard fails | HIGH | TASK-01 specifies an `initialized` boolean flag; acceptance test verifies `activate()` called exactly once. |
| R2 | Nebula fade not triggered on ESC skip | MEDIUM | TASK-02 specifies `sky.fadeNebulae(1)` call in descent `deactivate()` method — covers both natural completion and skip. |
| R3 | Arrow key yaw direction reversed | LOW | TASK-03 documents the sign convention explicitly (`yaw +=` for left, `yaw -=` for right) with reference to existing mouse delta convention. |
| R4 | Control hints overlay blocks label clicks | HIGH | TASK-04 mandates `pointer-events: none` on the overlay element. Acceptance criteria includes manual click-through test. |
| R5 | Config.ts merge conflict if TASK-01 and TASK-03 both touch it | NONE | TASK-01 does not touch `config.ts`. Only TASK-03 modifies it. |
| R6 | Hints text inaccurate if TASK-03 arrow key behaviour changes | LOW | TASK-04 depends on TASK-03 being complete first. Execution order enforces this. |

---

## Agent Instructions

1. Read `TASK-00-bootstrap-context.md` before starting any task.
2. Tasks in the same phase can be worked in parallel by separate agents.
3. After completing each task, run `npm test && npm run build` to verify.
4. After completing each phase, perform the checkpoint verification described above.
5. Do NOT read the original `TASKS/` documents from Phase 1 — they describe the initial build, not these fixes.
6. All work targets the `copilot/follow-instructions-from-docs` branch.
