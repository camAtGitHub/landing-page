---
## TASK-01: Fix Descent Animation — Controller Never Activated

**Objective:** Fix the descent animation so it actually plays on page load. The root cause is that `CameraStateMachine` sets its initial state to `DESCENT` but never calls `activate()` on the descent controller, so the controller's internal `active` flag stays `false` and `update()` returns immediately every frame.

**Bootstrap Context:**
Read `TASK-00-bootstrap-context.md` first.
Then read these two files in full:
- `src/camera/state-machine.ts` — the camera state machine
- `src/camera/descent.ts` — the descent controller

Key facts you need:
- `CameraStateMachine` constructor (line 20) sets `currentState = CameraState.DESCENT` but never calls `activate()` on any controller.
- `activate()` is only called inside `transition()` (line 84), which is only called by `skip()` or `toggle()` — neither runs at startup.
- In `descent.ts`, the `activate` function (line 37) sets `active = true` and configures camera start position. The `update` function (line 58) returns immediately if `!active`.
- This is why the HUD shows ALT 300 / VEL 0 and stars are static — `progress` never advances from 0.

Stop reading after you understand these two files. Do not explore generators or other modules.

**Files to Modify:**
- `src/camera/state-machine.ts` — MODIFY — Add initial controller activation after all controllers are registered.

**Inputs:**
- The existing `CameraStateMachine` class with its `controllers` Map and `currentState` field.
- The `CameraController` interface with its `activate(camera)` method.

**Outputs:**
- When the application starts and the state machine is in `DESCENT`, the descent controller's `activate()` must be called before the first `update()` cycle.
- The descent animation must play automatically on page load — camera descends from Y=300 to Y=-190 over 14 seconds with star warp, and the HUD shows changing ALT/VEL values.

**Interface Contract:**
The fix must not change any public API signatures. Existing code in `main.ts` that calls `registerController()` and then begins the animation loop must continue to work without modification.

Two acceptable approaches (choose one):

**Approach A — Lazy activation in `update()`:**
Add a flag `private initialized = false;` to the class. In the `update()` method, before calling `controller.update()`, check if `!this.initialized`. If so, call `controller.activate(this.camera)` and set `this.initialized = true`. This ensures the first controller registered for the initial state gets activated on the first frame.

**Approach B — Explicit `start()` method:**
Add a public `start(): void` method that activates the controller for the current state. Then add a `stateMachine.start();` call in `main.ts` after all `registerController()` calls and before `animate()`. This requires a one-line addition to `main.ts`.

Either approach is acceptable. Approach A is preferred because it requires changes to only one file and is more robust if registration order changes.

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- `activate()` must be called EXACTLY ONCE for the initial state — do not double-activate if `update()` is called multiple times.
- `camera.rotation.order` must be set to `'YXZ'` — the descent controller's `activate()` already does this, so just make sure it gets called.
- Do NOT reset `progress` or any descent state outside of the controller's own `activate()` method — let the controller manage its own state.
- The 300ms transition cooldown must still work correctly — initial activation is NOT a transition, so do not call `this.transition()` for the initial state.

**Must NOT do:**
- Do not modify `src/camera/descent.ts` — the controller logic is correct, it just needs to be activated.
- Do not modify `src/camera/free-cam.ts` or `src/camera/fixed-cam.ts`.
- Do not modify `src/hud/descent-hud.ts` — the HUD already subscribes to state changes and shows on DESCENT state.
- Do not add any new files.
- Do not change the `CameraController` interface.

**Acceptance Criteria:**
- [ ] On page load, the descent animation begins automatically — camera moves from Y=300 downward.
- [ ] The HUD telemetry updates: ALT decreases from 300 toward 0, VEL follows a sine bell curve peaking mid-descent.
- [ ] Stars stream downward during descent (warp effect).
- [ ] After ~14 seconds, descent completes and auto-transitions to FREE_CAM (desktop) or FIXED_CAM (mobile).
- [ ] ESC during descent still skips to the ground immediately.
- [ ] No console errors on startup or during descent.
- [ ] `npm run build` succeeds without errors.

**Edge Cases to Handle:**
- If `registerController()` is called after the first `update()` (unlikely but possible) — the lazy activation approach handles this naturally since it checks on each `update()` until initialized.
- If the descent controller is not registered (e.g., error in import) — the existing `if (!controller) return;` guard in `update()` handles this.

**Test Requirements:**
If tests exist for `state-machine.ts`, update them to verify that the initial state's controller has `activate()` called. Specifically:
- Create a mock controller with a jest/vitest spy on `activate`.
- Construct a `CameraStateMachine` in DESCENT state.
- Register the mock controller for DESCENT.
- Call `update(0.016, 0)` once.
- Assert that `activate` was called exactly once with the camera instance.
- Call `update(0.016, 0.016)` again and assert `activate` was NOT called a second time.

**Known Risks / Likely Mistakes:**
- AI may call `this.transition(CameraState.DESCENT)` in the constructor — this is wrong because `transition()` deactivates the "old" state (which doesn't exist yet) and fires state change callbacks prematurely. Use direct `activate()` call instead.
- AI may put the `activate()` call inside `registerController()` — this is fragile because it would activate on every registration, not just the initial state's controller. Only activate for the controller matching `this.currentState`.
- AI may forget the initialized guard and call `activate()` on every `update()` frame — this would reset descent progress every frame. The flag is essential.
---
