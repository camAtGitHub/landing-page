---
## TASK-03: Fix Free-Cam Mouse Sensitivity and Arrow Key Behaviour

**Depends on:** None (can run in parallel with TASK-01 and TASK-02)

**Objective:** Fix two issues with the free-camera controller: (1) mouse look sensitivity is far too low, requiring excessive physical mouse movement to look around; (2) arrow keys behave identically to WASD (strafe), but left/right arrows should rotate the view (look left/right) and up/down arrows should move forward/backward.

**Bootstrap Context:**
Read `TASK-00-bootstrap-context.md` first.
Then read these two files in full:
- `src/camera/free-cam.ts` — the file you will modify
- `src/config.ts` — contains `FREE_CAM_LOOK_SENSITIVITY` and other free-cam constants

Key facts you need:
- `free-cam.ts` uses mouse deltas (`dx`, `dy`) for look, not absolute cursor position. The delta is clamped to ±50 pixels per frame (line 27-28). The sensitivity multiplier is `CONFIG.FREE_CAM_LOOK_SENSITIVITY` which is currently `0.002`.
- `yaw` and `pitch` are accumulated from mouse deltas (lines 32-34). `pitch` is clamped between `FREE_CAM_PITCH_MIN` (-π/3) and `FREE_CAM_PITCH_MAX` (π/3).
- Movement keys (lines 116-131): `w`/`arrowup` = forward, `s`/`arrowdown` = backward, `a`/`arrowleft` = strafe left, `d`/`arrowright` = strafe right.
- The user wants: W/S = forward/back, A/D = strafe left/right (unchanged). ArrowUp/ArrowDown = forward/back (unchanged). **ArrowLeft/ArrowRight = look left/right (CHANGED from strafe to yaw rotation).**
- Mouse pointer is NOT locked (no `requestPointerLock`). The user must physically move the mouse across their mousepad. Higher sensitivity helps but there is still a finite limit imposed by physical mousepad size.

**Files to Modify:**
- `src/config.ts` — MODIFY — Increase `FREE_CAM_LOOK_SENSITIVITY`, add new constant for arrow key look speed.
- `src/camera/free-cam.ts` — MODIFY — Remap arrow left/right from strafe to yaw rotation.

**Inputs:**
- Current `CONFIG.FREE_CAM_LOOK_SENSITIVITY` value: `0.002`
- Current arrow key bindings in `free-cam.ts` `update()` function

**Outputs:**
- Mouse look feels responsive — a moderate mouse movement (not full mousepad sweep) lets you comfortably look ~90° left or right.
- ArrowLeft key rotates view left (decreases yaw). ArrowRight key rotates view right (increases yaw).
- ArrowUp/ArrowDown still move forward/backward (same as W/S).
- WASD behaviour unchanged.

**Interface Contract:**

New constants to add to `config.ts`:

```typescript
// Increase from 0.002 to 0.006
FREE_CAM_LOOK_SENSITIVITY: 0.006,

// New: rotation speed for arrow keys (radians per second)
FREE_CAM_ARROW_LOOK_SPEED: 2.0,
```

Modified movement logic in `free-cam.ts` `update()`:

```typescript
// Arrow keys — up/down move, left/right LOOK
if (keys['arrowup']) {
  cam.position.x += fw.x * speed;
  cam.position.z += fw.z * speed;
}
if (keys['arrowdown']) {
  cam.position.x -= fw.x * speed;
  cam.position.z -= fw.z * speed;
}
if (keys['arrowleft']) {
  yaw += CONFIG.FREE_CAM_ARROW_LOOK_SPEED * delta;
}
if (keys['arrowright']) {
  yaw -= CONFIG.FREE_CAM_ARROW_LOOK_SPEED * delta;
}

// WASD — unchanged
if (keys['w']) {
  cam.position.x += fw.x * speed;
  cam.position.z += fw.z * speed;
}
if (keys['s']) {
  cam.position.x -= fw.x * speed;
  cam.position.z -= fw.z * speed;
}
if (keys['a']) {
  cam.position.x -= right.x * speed;
  cam.position.z -= right.z * speed;
}
if (keys['d']) {
  cam.position.x += right.x * speed;
  cam.position.z += right.z * speed;
}
```

Note the yaw sign convention: `yaw +=` for look LEFT (positive yaw = counter-clockwise from above), `yaw -=` for look RIGHT. Verify this matches the existing mouse delta convention at line 32: `yaw -= dx * sensitivity` — a rightward mouse movement (positive dx) decreases yaw (turns right). So `arrowright` should `yaw -=` and `arrowleft` should `yaw +=`. This is correct.

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- `FREE_CAM_LOOK_SENSITIVITY` must stay in `config.ts` — do NOT hardcode sensitivity values in `free-cam.ts`.
- `FREE_CAM_ARROW_LOOK_SPEED` must also live in `config.ts` — no magic numbers.
- Arrow key look rotation must be delta-time-multiplied (`* delta`) for frame-rate independence. Mouse look is already frame-rate independent because it uses per-event pixel deltas.
- Do NOT change WASD behaviour — W/S forward/back, A/D strafe left/right must remain as-is.
- Do NOT add pointer lock (`requestPointerLock`) — the spec explicitly says "mouse look without pointer lock".
- `pitch` clamping must remain between `FREE_CAM_PITCH_MIN` and `FREE_CAM_PITCH_MAX`.
- The mouse delta clamp of ±50 pixels (lines 27-28) must remain — it prevents huge jumps when the cursor re-enters the window.
- `camera.rotation.order = 'YXZ'` must remain set.

**Must NOT do:**
- Do not modify `src/camera/state-machine.ts` (owned by TASK-01).
- Do not modify `src/scene/sky.ts` (owned by TASK-02).
- Do not modify `src/camera/descent.ts`.
- Do not modify `src/camera/fixed-cam.ts`.
- Do not add `requestPointerLock()`.
- Do not add new files.
- Do not change the `CameraController` interface.

**Acceptance Criteria:**
- [ ] Moving the mouse ~3 inches (half a typical mousepad) rotates the view approximately 90°.
- [ ] Arrow Right key rotates the view to the right at a smooth, comfortable speed.
- [ ] Arrow Left key rotates the view to the left at a smooth, comfortable speed.
- [ ] Arrow Up key moves the camera forward (same as W key).
- [ ] Arrow Down key moves the camera backward (same as S key).
- [ ] W/A/S/D keys behaviour is completely unchanged from current implementation.
- [ ] Holding Arrow Left/Right while moving with W/S produces a smooth turning-while-walking effect.
- [ ] Arrow key rotation is smooth and frame-rate independent (uses `delta`).
- [ ] `FREE_CAM_LOOK_SENSITIVITY` in config.ts is `0.006` (3× increase from `0.002`).
- [ ] `FREE_CAM_ARROW_LOOK_SPEED` exists in config.ts with value `2.0`.
- [ ] `npm run build` succeeds without errors.

**Edge Cases to Handle:**
- Holding both ArrowLeft and ArrowRight simultaneously → net zero rotation (they cancel out). This is natural from the addition.
- Holding ArrowLeft and D simultaneously → camera strafes right while looking left. This is expected and correct.
- Mouse delta clamp still prevents jumps when cursor re-enters the browser window after leaving it.

**Test Requirements:**
If tests exist for `free-cam.ts`, update them:
- Test that `arrowleft` key increases yaw by approximately `FREE_CAM_ARROW_LOOK_SPEED * delta` after one update.
- Test that `arrowright` key decreases yaw by approximately `FREE_CAM_ARROW_LOOK_SPEED * delta` after one update.
- Test that `arrowup` still moves position forward (same as `w`).
- Test that `arrowdown` still moves position backward (same as `s`).
- Test that `a` and `d` still strafe (not rotate).

**Known Risks / Likely Mistakes:**
- AI may get the yaw sign convention backwards for arrow keys — verify against the existing mouse delta convention: `yaw -= dx * sensitivity` where positive `dx` = mouse moved right = look right. So `arrowright` must be `yaw -=` and `arrowleft` must be `yaw +=`.
- AI may forget `* delta` on the arrow look speed, making it frame-rate dependent — the rotation would be extremely fast on high-refresh displays and slow on low-refresh ones.
- AI may accidentally remove the combined `keys['w'] || keys['arrowup']` pattern instead of separating arrow keys into their own blocks — be careful to keep W/S on their own and ArrowUp/ArrowDown on their own (since ArrowLeft/ArrowRight now do something different from A/D).
- AI may set sensitivity too high (e.g., 0.02) making mouse look jittery — 0.006 is a 3× increase which should feel comfortable. Can be fine-tuned later.
---
