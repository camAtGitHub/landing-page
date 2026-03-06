# Alien Landing Page — Task Packets: Phase 2 (Camera System)

---

## TASK-06: Camera State Machine

**Objective:** Create `src/camera/state-machine.ts` that manages the three camera states (descent, free-cam, fixed-cam), handles transitions triggered by the Escape key, enforces a transition cooldown, and delegates per-frame updates to the active camera controller.

**Bootstrap Context:**
Read `src/types.ts` for the `CameraState` enum. Read `src/config.ts` for `STATE_TRANSITION_COOLDOWN_MS` and `MOBILE_BREAKPOINT_PX`. The state machine is the **sole authority** on camera position — no other module sets `camera.position` or `camera.rotation` directly. Camera controllers (descent, free-cam, fixed-cam) are registered with the state machine and the active one is called each frame.

Key facts:
- Initial state: `DESCENT`
- Escape during descent → skip to default post-descent mode (free-cam on desktop, fixed-cam on mobile)
- Escape after descent → toggle between free-cam and fixed-cam
- 300ms cooldown between transitions to prevent rapid toggling
- Mobile detection uses viewport width at startup

**Files to Create:**
- `src/camera/state-machine.ts` — CREATE — Camera state machine

**Inputs:**
- `CameraState` enum from `src/types.ts`
- `CONFIG` constants
- `THREE.PerspectiveCamera` reference from `SceneContext`

**Outputs:**
- `CameraStateMachine` class with `update()`, `getState()`, `skip()`, `registerController()`, `onStateChange()`

**Interface Contract:**

```typescript
// src/camera/state-machine.ts

import * as THREE from 'three';
import { CameraState } from '../types';

export type CameraController = {
  /** Called when this controller becomes active */
  activate: (camera: THREE.PerspectiveCamera) => void;
  /** Called when this controller is deactivated */
  deactivate: () => void;
  /** Called every frame while this controller is active */
  update: (camera: THREE.PerspectiveCamera, delta: number, elapsed: number) => void;
  /** Whether the descent is complete (only relevant for descent controller) */
  isComplete?: () => boolean;
};

export type StateChangeCallback = (
  newState: CameraState,
  oldState: CameraState
) => void;

export class CameraStateMachine {
  constructor(camera: THREE.PerspectiveCamera, isMobile: boolean);

  /** Register a controller for a specific state */
  registerController(state: CameraState, controller: CameraController): void;

  /** Subscribe to state changes */
  onStateChange(callback: StateChangeCallback): void;

  /** Get current state */
  getState(): CameraState;

  /** Skip descent (called on Escape during descent) */
  skip(): void;

  /** Toggle between free-cam and fixed-cam (called on Escape after descent) */
  toggle(): void;

  /**
   * Called every frame. Delegates to active controller.
   * If in descent and descent controller reports complete, auto-transitions.
   */
  update(delta: number, elapsed: number): void;
}
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- The state machine is the ONLY module that calls `controller.activate()` / `controller.deactivate()` / `controller.update()`. No other module calls these directly.
- Transition cooldown of `STATE_TRANSITION_COOLDOWN_MS` MUST be enforced. Transitions requested within the cooldown window are silently ignored.
- The Escape key listener MUST be registered by the state machine itself (not by individual controllers or main.ts).
- When descent `isComplete()` returns true, the state machine auto-transitions to the default post-descent mode. This check happens in `update()`.
- `onStateChange` callbacks are called AFTER the transition is complete (new controller is activated).

**Must NOT do:**
- Do not implement any camera movement logic — controllers (TASK-07, TASK-12, TASK-13) handle that
- Do not directly reference `scene` or any scene objects — the state machine only knows about the camera
- Do not add any DOM elements or UI — mode indicator is TASK-14

**Acceptance Criteria:**
- [ ] Initial state is `CameraState.DESCENT`
- [ ] `registerController()` associates a controller with a state
- [ ] `update()` calls the active controller's `update()` each frame
- [ ] When descent controller's `isComplete()` returns true, auto-transitions to free-cam (desktop) or fixed-cam (mobile)
- [ ] `skip()` during descent transitions immediately to post-descent default
- [ ] `toggle()` after descent swaps between free-cam and fixed-cam
- [ ] `toggle()` during descent does nothing
- [ ] Escape key calls `skip()` during descent, `toggle()` after descent
- [ ] Transitions within `STATE_TRANSITION_COOLDOWN_MS` of the last transition are ignored
- [ ] `onStateChange` callbacks fire after each transition with correct new/old states
- [ ] `activate()` is called on the new controller, `deactivate()` on the old, in that order
- [ ] Missing controller for a state → `console.error`, remain in current state

**Edge Cases to Handle:**
- `registerController` called for same state twice → overwrite the previous controller
- `skip()` called when not in descent → no-op
- `toggle()` called when no free-cam or fixed-cam controller registered → `console.error`, stay in current state
- Rapid Escape presses → cooldown prevents rapid toggling

**Test Requirements:**
Write unit tests in `tests/camera/state-machine.test.ts`. Create mock controllers that track `activate`/`deactivate`/`update` calls. Test: initial state, descent auto-complete transition, skip, toggle, cooldown enforcement, callback firing order. Mock `performance.now()` or `Date.now()` for cooldown testing.

**Known Risks / Likely Mistakes:**
- AI may forget the cooldown and allow rapid state toggling → test with rapid `toggle()` calls
- AI may call `deactivate` before `activate` on the new controller → activate new FIRST (so it can set initial camera position before old controller clears anything)
- AI may add the Escape listener to `window` without cleanup → store the listener reference for potential disposal

---

## TASK-07: Descent Sequence

**Objective:** Create `src/camera/descent.ts` that implements the cinematic descent camera controller — a ~14-second animated camera path from space through atmosphere to planet surface, with star warp effects, phased visual events, and mouse-influenced camera drift.

**Bootstrap Context:**
Read `src/camera/state-machine.ts` for the `CameraController` interface. Read `src/scene/sky.ts` for `SkyContext` (star positions, speeds, material). Read `src/config.ts` for descent constants.

Key facts:
- Descent has 3 phases: space (0-30%), atmosphere (30-70%), approach (70-100%)
- Camera starts at `DESCENT_START_Y`, ends at `DESCENT_END_Y`
- Mouse position (normalized -1 to 1) influences camera drift — more influence early, fading as descent progresses
- Star warp: stars move upward faster during mid-descent (simulating forward velocity), slow at start/end
- Star material opacity fades out as camera enters atmosphere
- Fog density increases during descent (atmosphere thickening)
- The descent is non-interactive other than mouse drift and Escape to skip

**Files to Create:**
- `src/camera/descent.ts` — CREATE — Descent camera controller

**Inputs:**
- `CameraController` interface from `src/camera/state-machine.ts`
- `SkyContext` from `src/scene/sky.ts` (star buffer manipulation)
- `SceneContext` from `src/scene/setup.ts` (fog density adjustment)
- `CONFIG` descent constants
- Mouse position (read from a shared input state or passed in)

**Outputs:**
- `createDescentController(sky: SkyContext, scene: THREE.Scene, fog: THREE.FogExp2): CameraController`

**Interface Contract:**

```typescript
// src/camera/descent.ts

import * as THREE from 'three';
import { CameraController } from './state-machine';
import { SkyContext } from '../scene/sky';

export interface DescentControllerOptions {
  sky: SkyContext;
  scene: THREE.Scene;
  fog: THREE.FogExp2;
}

/**
 * Creates a descent camera controller.
 * Mouse input is read from a module-level mouse tracker
 * (mousemove listener on document).
 */
export function createDescentController(
  options: DescentControllerOptions
): CameraController;
```

Mouse tracking: The descent controller registers its own `mousemove` listener on `document` to track normalized mouse position (-1 to 1 on each axis). This listener is added on `activate()` and removed on `deactivate()`.

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Descent progress is tracked as a float from 0.0 to 1.0 based on elapsed time vs `DESCENT_DURATION_SECONDS`.
- Camera Y position uses an easeInOutQuad curve (slow start, fast middle, slow landing).
- Star warp speed follows a sine-bell curve: `Math.sin(progress * Math.PI)` — fastest at 50% progress.
- Star positions are mutated IN-PLACE on the `SkyContext.starPositions` buffer. After mutation, set `starPositions.needsUpdate = true`.
- Stars that move above the visible range are recycled to the bottom (wrap-around).
- `isComplete()` returns true when progress >= 1.0.
- On `activate()`: reset progress to 0, reset camera to start position. On `deactivate()`: stop mutating sky/fog.
- Mouse influence on camera reduces as descent progresses: multiply by `(1 - progress)`.

**Must NOT do:**
- Do not set camera state or call state machine methods — the state machine calls this controller
- Do not modify terrain or structures — this controller only affects camera, stars, and fog
- Do not create or remove scene objects — only modify existing star positions and fog density

**Acceptance Criteria:**
- [ ] Camera starts at `(0, DESCENT_START_Y, 0)` and ends at approximately `(0, DESCENT_END_Y, 25)`
- [ ] Descent takes `DESCENT_DURATION_SECONDS` (14s) to complete
- [ ] Camera Y follows easeInOutQuad: slow departure, fast mid-transit, gentle landing
- [ ] Camera XZ drifts with mouse input, influence decreasing over descent duration
- [ ] Camera always looks generally downward/forward (toward the landing zone)
- [ ] Star positions animate upward with speed proportional to `sin(progress * PI)` bell curve
- [ ] Stars wrapping above range are recycled to bottom
- [ ] `starPositions.needsUpdate` is set to `true` every frame during descent
- [ ] Star material opacity fades from 1.0 to ~0.1 over the descent
- [ ] Fog density increases from initial value to ~0.008+ over the descent
- [ ] `isComplete()` returns false during descent, true after progress reaches 1.0
- [ ] `activate()` resets all state (progress, camera position, star opacity, fog density)
- [ ] `deactivate()` removes the mousemove listener

**Edge Cases to Handle:**
- Very large delta values (lag spike) → clamp delta to max 0.1s to prevent progress jumping
- `activate()` called multiple times → reset cleanly each time
- Mouse at extreme edges of screen → clamp influence, don't let camera go to wild positions

**Test Requirements:**
Write unit tests in `tests/camera/descent.test.ts`. Mock `SkyContext` with a minimal starPositions Float32Array (10 stars). Mock fog as `{ density: 0.002 }`. Test: progress calculation, camera Y at 0%, 50%, 100% progress, star wrap-around, `isComplete()` state. Do not test visual output.

**Known Risks / Likely Mistakes:**
- AI may use linear interpolation instead of easeInOutQuad for camera Y — the easing is critical for the cinematic feel
- AI may forget `needsUpdate = true` on the star buffer — without this, Three.js won't upload the changed positions to the GPU
- AI may apply mouse influence additively without clamping — camera could drift far off the descent path
- AI may not handle the fog reference correctly — fog is on `scene.fog`, accessed as `(scene.fog as THREE.FogExp2).density`

---

## TASK-08: Descent HUD Overlay

**Objective:** Create `src/hud/descent-hud.ts` that renders a subtle HTML-based heads-up display during the descent sequence — thin geometric lines, countdown-style numbers, and minimal telemetry aesthetics. The HUD fades in at descent start and fades out when descent ends.

**Bootstrap Context:**
Read `src/camera/state-machine.ts` for `StateChangeCallback` and `CameraState`. The HUD subscribes to state changes and is visible ONLY during the `DESCENT` state. It mounts into the `#hud` div in `index.html`.

Key facts:
- The HUD is purely decorative — it shows fake telemetry (altitude numbers counting down, velocity indicator, thin geometric framing lines)
- It must feel like subtle sci-fi film design, NOT a cockpit simulator or gamer UI
- Keep it gender-neutral and visually abstract — decorative data, not functional instruments
- Use thin lines, monospace font, low opacity, neon accent color
- Fade in over `HUD_FADE_IN_DURATION_MS`, fade out over `HUD_FADE_OUT_DURATION_MS`

**Files to Create:**
- `src/hud/descent-hud.ts` — CREATE — Descent HUD overlay

**Inputs:**
- `CameraStateMachine` (to subscribe to state changes)
- `CONFIG` HUD constants
- Descent progress (0-1 float, read from a shared source or passed via update callback)

**Outputs:**
- `createDescentHUD(stateMachine: CameraStateMachine): DescentHUD`

**Interface Contract:**

```typescript
// src/hud/descent-hud.ts

import { CameraStateMachine } from '../camera/state-machine';

export interface DescentHUD {
  /**
   * Called every frame during descent to update telemetry numbers.
   * @param progress 0.0 to 1.0 descent progress
   */
  update: (progress: number) => void;
  /** Remove all DOM elements and listeners */
  dispose: () => void;
}

/**
 * Creates the descent HUD. Subscribes to state machine changes.
 * Mounts into #hud div. Shows during DESCENT state only.
 */
export function createDescentHUD(
  stateMachine: CameraStateMachine
): DescentHUD;
```

**Visual Design Specification:**

The HUD consists of these HTML/CSS elements inside `#hud`:

1. **Corner brackets** — thin (1px) lines in top-left and bottom-right corners of the viewport, forming incomplete rectangle corners. Color: neon green (`#00ffc8`) at 20% opacity. Length: 60px each arm.

2. **Altitude readout** — bottom-left area. Monospace font, 11px, letter-spacing 2px. Shows a number counting down from ~300 to 0 (maps to descent progress). Format: `ALT ███.██` where █ are digits. Color: neon green at 40% opacity.

3. **Velocity indicator** — bottom-left, below altitude. Same font styling. Shows a value that peaks mid-descent and decreases at landing. Format: `VEL ██.██`. Same color.

4. **Thin horizontal scan line** — a 1px line that slowly moves vertically across the viewport during descent. Color: neon green at 8% opacity. Takes the full descent duration to traverse top to bottom.

5. **No crosshairs, no targeting reticles, no flight instruments.** Keep it abstract.

All elements use `pointer-events: none`.

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- All HUD elements mount inside `#hud` and ONLY `#hud` — do not mount in `#overlay` or `#ui` (those are for other tasks).
- HUD elements must use `pointer-events: none` — they must not intercept clicks.
- HUD must be INVISIBLE when not in descent state. On state change away from DESCENT, fade out then `display: none`.
- Font must be monospace (use `'Courier New', monospace`). Do NOT load external fonts.
- Maximum opacity of any element is 40%. This is decorative, not prominent.

**Must NOT do:**
- Do not add any interactive elements (buttons, links)
- Do not add a cockpit frame or targeting reticle
- Do not load external fonts or images
- Do not modify any other DOM elements outside `#hud`

**Acceptance Criteria:**
- [ ] HUD elements are created inside `#hud` div
- [ ] HUD is visible during DESCENT state, hidden otherwise
- [ ] HUD fades in over `HUD_FADE_IN_DURATION_MS` on descent start
- [ ] HUD fades out over `HUD_FADE_OUT_DURATION_MS` on descent end
- [ ] Altitude number counts down from ~300 to ~0 proportional to progress
- [ ] Velocity number peaks at ~50% progress and decreases toward landing
- [ ] Corner bracket lines are visible and correctly positioned
- [ ] Scan line moves from top to bottom of viewport over descent duration
- [ ] All elements use `pointer-events: none`
- [ ] No element exceeds 40% opacity
- [ ] `dispose()` removes all DOM elements and unsubscribes from state machine
- [ ] Font is monospace, not an external web font

**Edge Cases to Handle:**
- Window resize during descent → reposition corner brackets (use CSS viewport units, not fixed px positions)
- `update()` called with progress > 1.0 → clamp to 1.0
- `update()` called when HUD is hidden → no-op (no DOM updates when invisible)

**Test Requirements:**
No automated tests. Visual verification: during descent, subtle green overlay elements are visible and animate with the descent. After landing, they fade and disappear.

**Known Risks / Likely Mistakes:**
- AI may make the HUD too prominent (high opacity, large fonts, too many elements) — keep it subtle. Maximum 40% opacity on anything.
- AI may use `position: absolute` without `pointer-events: none` — this blocks clicks on the canvas
- AI may forget to clean up DOM elements in `dispose()` — must remove all created elements from `#hud`
- AI may create a full cockpit UI with instruments and gauges — this is NOT the intention. It's subtle decorative telemetry.
