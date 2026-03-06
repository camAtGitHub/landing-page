---
## TASK-02: Fix Nebula Planes Appearing as Walls at Ground Level

**Depends on:** TASK-01 (descent must work so the fade can be tested during descent-to-ground transition)

**Objective:** Eliminate the visual artifact where 6 nebula `PlaneGeometry` layers in `sky.ts` appear as semi-transparent colored walls when viewed at ground level. These planes are positioned at Y values between -50 and -175 and are intended as subtle atmospheric haze visible from above during descent, but from the ground camera (~Y -195) they are seen edge-on and bisect the environment.

**Bootstrap Context:**
Read `TASK-00-bootstrap-context.md` first.
Then read:
- `src/scene/sky.ts` — the file you will modify (contains both starfield and nebula layers)
- `src/camera/descent.ts` — understand how `progress` goes from 0 to 1 over the descent
- `src/config.ts` — for relevant constants

Key facts you need:
- `sky.ts` lines 46-72 create 6 `PlaneGeometry` meshes with `MeshBasicMaterial` (transparent, DoubleSide) at Y positions: -50, -90, -120, -150, -175, -65.
- The terrain surface is at Y ≈ -200 (TERRAIN_Y_OFFSET). The free camera sits ~5 units above terrain, so ~Y -195.
- These planes have sizes 260-340 units and slight rotations. From the descent camera looking down they read as atmospheric layers. From ground level looking horizontally they appear as 4+ translucent colored walls cutting through the scene.
- The `SkyContext` interface exports `nebulae: THREE.Mesh[]` — used only internally, no other module reads the nebulae array.
- The descent controller already modifies `sky.starMaterial.opacity` during descent (line 101 of descent.ts), so the pattern of the descent controller reaching into sky properties is established.

**Files to Modify:**
- `src/scene/sky.ts` — MODIFY — Add method to fade out and remove nebula layers.
- `src/camera/descent.ts` — MODIFY — Call nebula fade during descent progress.

**Inputs:**
- `SkyContext` interface (currently: `{ stars, starPositions, starSpeeds, starMaterial, nebulae }`).
- Descent `progress` value (0 to 1).

**Outputs:**
- Nebula planes are fully visible at descent start (progress=0) and completely faded out and removed from the scene by the time the camera reaches ground level.
- No colored walls visible when exploring on foot.
- Descent still shows atmospheric haze layers when viewed from above.

**Interface Contract:**

Add a new method to `SkyContext`:

```typescript
export interface SkyContext {
  stars: THREE.Points;
  starPositions: THREE.BufferAttribute;
  starSpeeds: Float32Array;
  starMaterial: THREE.PointsMaterial;
  nebulae: THREE.Mesh[];
  /** Fade nebulae opacity. t=0 full opacity, t=1 fully invisible. Removes from scene when invisible. */
  fadeNebulae: (t: number) => void;
}
```

Implementation of `fadeNebulae(t)`:
- For each nebula mesh, set its material opacity to `originalOpacity * (1 - t)`.
- When `t >= 1`, call `scene.remove(mesh)` for each nebula and set a flag to prevent further processing.
- Store each nebula's original opacity (from the config object) at creation time so the fade is relative to the designed values.

In `descent.ts`, call `sky.fadeNebulae(progress)` inside the `update()` function. The nebulae will naturally fade as the camera descends. By progress=1.0 (landing), they are gone.

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Do NOT remove the nebulae entirely from the codebase — they add valuable atmosphere during descent. Only fade and remove them as the camera approaches ground level.
- Do NOT modify the starfield code in `sky.ts` — stars are working correctly.
- `depthWrite: false` must remain on all nebula materials.
- `side: THREE.DoubleSide` must remain on nebula materials (they need to be visible from both above and below during descent).
- The `fadeNebulae` function must be idempotent — calling it multiple times with `t >= 1` must not throw errors or try to remove already-removed meshes.
- Do NOT store scene reference in the `SkyContext` — pass it as a closure during construction instead.

**Must NOT do:**
- Do not modify any structure generators or the terrain.
- Do not modify `src/camera/state-machine.ts` (that's TASK-01).
- Do not modify `src/camera/free-cam.ts` or `src/camera/fixed-cam.ts`.
- Do not change the starfield (stars, starPositions, starSpeeds, starMaterial).
- Do not add new files.

**Acceptance Criteria:**
- [ ] During descent, nebula layers are visible as atmospheric haze when viewed from above.
- [ ] Nebulae progressively fade as descent progresses (opacity decreases linearly with progress).
- [ ] By the time the camera reaches ground level (progress=1.0), all nebula planes are invisible and removed from the scene.
- [ ] In FREE_CAM mode at ground level, there are NO colored walls or translucent barriers visible anywhere in the environment.
- [ ] The `SkyContext` interface includes the `fadeNebulae` method.
- [ ] `npm run build` succeeds without errors.
- [ ] ESC to skip descent also results in nebulae being removed (because skip triggers a final update or the fade is called with t=1 during transition).

**Edge Cases to Handle:**
- ESC skip during descent (progress jumps to 1.0 instantly) — nebulae must still be cleaned up. The descent controller's `deactivate()` runs on skip. Add a `sky.fadeNebulae(1)` call in `deactivate()` to ensure cleanup even if descent doesn't complete naturally.
- `fadeNebulae` called with values > 1 — clamp to 1.
- `fadeNebulae` called after nebulae already removed — must be a no-op (use a `removed` boolean flag).

**Test Requirements:**
No automated test needed for this visual fix. Manual verification:
1. Load page → observe nebula atmospheric layers during descent.
2. Let descent complete → walk around at ground level → confirm no walls.
3. Reload page → press ESC immediately → confirm no walls at ground level.

**Known Risks / Likely Mistakes:**
- AI may remove the nebula creation code entirely instead of fading them — they must still exist during descent.
- AI may forget to handle the ESC skip case — if descent is skipped, `deactivate()` runs but the nebulae may not be cleaned up unless explicitly handled. Add `sky.fadeNebulae(1)` to the `deactivate` function.
- AI may try to animate the fade independently with `requestAnimationFrame` — do NOT do this. The fade is driven by the descent `progress` value which already advances each frame.
- AI may forget to store original opacities and instead use the config values — this works too since the nebula opacities are set from config, but storing them at creation time is more robust.
---
