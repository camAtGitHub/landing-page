# Alien Landing Page — Task Packets: Phase 4 & 5 (Camera Controllers, UI, Effects)

---

## TASK-12: Free Camera Controls

**Objective:** Create `src/camera/free-cam.ts` that implements the desktop free-camera controller — mouse look, WASD movement, and click-to-blink teleport navigation. The camera stays at a fixed height above the terrain surface and is bounded within the terrain area.

**Bootstrap Context:**
Read `src/camera/state-machine.ts` for the `CameraController` interface. Read `src/scene/terrain.ts` for `TerrainContext.getHeightAt()`. Read `src/config.ts` for `FREE_CAM_*` constants.

Key facts:
- Mouse look: moving the mouse rotates the camera (yaw on X movement, pitch on Y movement)
- Mouse look is ALWAYS active when in free-cam mode — no pointer lock required. Just standard mouse movement on the page.
- WASD: move forward/back/strafe relative to camera facing direction
- Click-to-blink: left click performs a fast forward teleport in the direction the camera is facing. The camera smoothly animates to the new position over `BLINK_DURATION_MS`.
- Camera height: always `FREE_CAM_HEIGHT_ABOVE_TERRAIN` above the terrain at current XZ position
- Camera bounded within `FREE_CAM_TERRAIN_BOUNDARY_RADIUS` of world origin
- Pitch clamped between `FREE_CAM_PITCH_MIN` and `FREE_CAM_PITCH_MAX`

**Files to Create:**
- `src/camera/free-cam.ts` — CREATE — Free camera controller

**Inputs:**
- `CameraController` interface
- `TerrainContext` for height sampling
- `CONFIG` free-cam constants

**Outputs:**
- `createFreeCamController(terrain: TerrainContext): CameraController`

**Interface Contract:**

```typescript
// src/camera/free-cam.ts

import { CameraController } from './state-machine';
import { TerrainContext } from '../scene/terrain';

export function createFreeCamController(
  terrain: TerrainContext
): CameraController;
```

**Behavior Specification:**

**Mouse Look (always active):**
- Track mouse position on `mousemove` event (added on `activate`, removed on `deactivate`)
- Camera yaw (left/right) = horizontal mouse delta * `FREE_CAM_LOOK_SENSITIVITY`
- Camera pitch (up/down) = vertical mouse delta * `FREE_CAM_LOOK_SENSITIVITY`
- Pitch clamped to `[PITCH_MIN, PITCH_MAX]`
- Use `camera.rotation.order = 'YXZ'` for correct FPS-style rotation
- Mouse delta is computed as change from last known position (NOT movementX/Y — no pointer lock)

**WASD Movement:**
- Track key state on `keydown`/`keyup` events
- W = forward, S = backward, A = strafe left, D = strafe right
- Movement direction is relative to camera yaw (ignore pitch for movement direction)
- Speed: `FREE_CAM_MOVE_SPEED * delta`
- Forward vector: `(-sin(yaw), 0, -cos(yaw))` — movement is horizontal only

**Click-to-Blink:**
- On left `mousedown` (NOT on UI elements), initiate blink
- Blink target: current position + forward direction * `FREE_CAM_BLINK_MAX_DISTANCE`
- Blink animates camera position over `FREE_CAM_BLINK_DURATION_MS` using lerp
- During blink animation, WASD and further clicks are ignored
- Blink target is clamped to terrain boundary

**Height & Boundary:**
- Every frame, compute terrain height at camera XZ: `terrain.getHeightAt(camera.position.x, camera.position.z)`
- Set `camera.position.y = terrainHeight + FREE_CAM_HEIGHT_ABOVE_TERRAIN`
- If camera XZ exceeds `FREE_CAM_TERRAIN_BOUNDARY_RADIUS` from origin, clamp it back
- Height follows terrain smoothly — no sudden jumps (lerp Y position toward target height)

**Activate/Deactivate:**
- `activate()`: set camera to a sensible initial position (0, height, 25), facing toward origin. Add event listeners.
- `deactivate()`: remove all event listeners, cancel any in-progress blink.

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Camera `rotation.order` MUST be `'YXZ'` — other orders cause gimbal issues with FPS-style look
- Mouse look must NOT use pointer lock — just track mouse position changes. Pointer lock is too aggressive for a website.
- Click-to-blink must check that the click target is NOT an `.entry-label` element (TASK-14's labels are clickable) — check `event.target` for class/tag before initiating blink.
- Camera Y position MUST lerp toward terrain height, not snap — prevents jarring pops when crossing terrain features.
- Boundary clamping must be SMOOTH (push back gently), not a hard wall — use distance-based force that increases as you approach the boundary.

**Must NOT do:**
- Do not implement pointer lock
- Do not modify the state machine — this controller is registered by main.ts
- Do not modify terrain — only read heights via `getHeightAt`
- Do not create any DOM elements — this is a pure camera controller

**Acceptance Criteria:**
- [ ] Mouse movement rotates camera (yaw and pitch)
- [ ] Pitch is clamped to configured min/max
- [ ] WASD moves camera relative to facing direction
- [ ] Movement is horizontal only (no flying)
- [ ] Left click initiates blink teleport forward
- [ ] Blink animates smoothly over configured duration
- [ ] Blink does not trigger on clicks targeting `.entry-label` elements
- [ ] Camera Y follows terrain height + configured offset
- [ ] Camera Y lerps smoothly (no snapping)
- [ ] Camera stays within terrain boundary radius
- [ ] Boundary enforcement is smooth (gradual pushback, not hard wall)
- [ ] `activate()` sets initial position and adds listeners
- [ ] `deactivate()` removes all listeners and cancels blink

**Edge Cases to Handle:**
- Mouse moves off screen and back → no huge delta jump (cap maximum delta per frame)
- Multiple rapid clicks → only first blink executes, others ignored during animation
- WASD pressed during blink → ignored until blink completes
- Terrain height changes rapidly (edge of flat zone) → Y lerp smooths the transition
- Camera at exact boundary → gently pushed inward, no oscillation

**Test Requirements:**
Write unit tests in `tests/camera/free-cam.test.ts`. Mock terrain with `getHeightAt` returning -195. Test: yaw/pitch calculation from mouse delta, WASD forward vector direction, blink target calculation, boundary clamping. Do not test actual Three.js rendering.

**Known Risks / Likely Mistakes:**
- AI may implement pointer lock instead of standard mouse tracking — the spec explicitly says NO pointer lock
- AI may compute forward direction using camera's full rotation matrix (including pitch) for WASD — movement must be pitch-independent (horizontal plane only)
- AI may forget to check click target for labels before blink — this would make labels unclickable
- AI may snap camera Y to terrain height instead of lerping — causes jitter on terrain features

---

## TASK-13: Fixed/Orbit Camera

**Objective:** Create `src/camera/fixed-cam.ts` that implements the simplified orbit camera — a slowly orbiting view centered on the structure area with mouse/touch parallax influence. This is the default mode for mobile and the fallback for desktop users who escape from free-cam.

**Bootstrap Context:**
Read `src/camera/state-machine.ts` for `CameraController` interface. Read `src/config.ts` for `FIXED_CAM_*` constants.

Key facts:
- Camera orbits automatically around the origin at a fixed height
- Mouse/touch position adds a parallax offset (look slightly in the direction of input)
- No user-controlled movement — the camera is on rails with a subtle parallax influence
- Simple and comfortable for mobile touch interaction

**Files to Create:**
- `src/camera/fixed-cam.ts` — CREATE — Fixed orbit camera controller

**Inputs:**
- `CameraController` interface
- `CONFIG` fixed-cam constants

**Outputs:**
- `createFixedCamController(): CameraController`

**Interface Contract:**

```typescript
// src/camera/fixed-cam.ts

import { CameraController } from './state-machine';

export function createFixedCamController(): CameraController;
```

**Behavior Specification:**

**Orbit:**
- Camera position: `x = sin(elapsed * ORBIT_SPEED) * ORBIT_RADIUS`, `z = cos(elapsed * ORBIT_SPEED) * ORBIT_RADIUS`, `y = FIXED_CAM_HEIGHT`
- Camera always looks at origin `(0, TERRAIN_Y_OFFSET + 5, 0)` — slightly above terrain center

**Parallax:**
- Track mouse position (desktop) or touch position (mobile) normalized to -1..1
- Add offset to camera position: `x += mouseX * PARALLAX_STRENGTH`, `y += mouseY * (PARALLAX_STRENGTH * 0.5)`
- Parallax is additive on top of orbit position
- Smooth the input (lerp toward target mouse position) to prevent jitter

**Touch support:**
- Listen for `touchmove` events and compute touch position normalized to viewport
- Single touch only — ignore multi-touch

**Activate/Deactivate:**
- `activate()`: add mouse/touch listeners, set initial orbit angle based on elapsed time
- `deactivate()`: remove listeners

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Camera MUST always call `camera.lookAt()` after setting position — orbit + parallax can put the camera in arbitrary positions, lookAt keeps it pointed at center
- Touch listener must use `{ passive: true }` to avoid scroll performance warnings
- Orbit speed must be SLOW (use the configured value, ~0.08 radians/sec) — fast orbiting causes motion sickness
- Parallax input must be smoothed (lerp factor ~0.05 per frame) — raw input causes jitter

**Must NOT do:**
- Do not implement zoom, pan, or any user-controlled camera movement
- Do not modify the state machine
- Do not create DOM elements

**Acceptance Criteria:**
- [ ] Camera orbits around origin at configured radius and height
- [ ] Camera always looks at the center of the scene
- [ ] Mouse movement adds parallax offset (smooth, not jerky)
- [ ] Touch movement adds parallax offset on mobile
- [ ] Touch listener uses `{ passive: true }`
- [ ] Orbit is continuous and smooth
- [ ] `activate()` adds listeners, `deactivate()` removes them
- [ ] Camera never looks away from center (lookAt always called)

**Edge Cases to Handle:**
- Mouse leaves window → parallax smoothly returns toward center (the lerp handles this naturally)
- No touch support on device → no errors, mouse fallback works
- Very long elapsed time (hours) → orbit position wraps naturally via sin/cos (no overflow)

**Test Requirements:**
Write unit tests in `tests/camera/fixed-cam.test.ts`. Test orbit position calculation at different elapsed values. Test parallax offset application. Mock camera with position/lookAt tracking.

**Known Risks / Likely Mistakes:**
- AI may forget `camera.lookAt()` after setting position — camera will look in wrong direction
- AI may use raw mouse position without smoothing — causes jerky parallax
- AI may add `preventDefault()` to touch handlers without `{ passive: false }` — causes console warnings

---

## TASK-14: HTML Label System

**Objective:** Create `src/ui/labels.ts` that projects HTML labels from 3D structure positions onto the 2D viewport, and `src/ui/mode-indicator.ts` that shows the current camera mode and hint text. Labels are the clickable entry points that navigate to URLs from data.json.

**Bootstrap Context:**
Read `src/types.ts` for `StructureInstance` and `DataEntry`. Read `src/camera/state-machine.ts` for state change subscription. Labels mount in the `#overlay` div. Mode indicator mounts in the `#ui` div.

Key facts:
- Each `StructureInstance` has a `worldPosition` and associated `entry` with name, description, url
- Labels must be updated every frame (in the render loop) to match projected 3D positions
- Labels behind the camera should be hidden
- Higher priority entries get visually larger/more prominent labels
- Labels are clickable — they navigate to the entry's URL
- Mode indicator shows current state and control hints

**Files to Create:**
- `src/ui/labels.ts` — CREATE — Projected HTML label system
- `src/ui/mode-indicator.ts` — CREATE — Mode and hint display

**Files to Modify:**
- `src/main.ts` — MODIFY — Create labels after structures placed, update in render loop

**Inputs:**
- `StructureInstance[]` from placement
- `THREE.PerspectiveCamera` from scene context
- `CameraStateMachine` for state changes

**Outputs:**
- `createLabels(instances: StructureInstance[], camera: THREE.PerspectiveCamera): LabelSystem`
- `createModeIndicator(stateMachine: CameraStateMachine): ModeIndicator`

**Interface Contract:**

```typescript
// src/ui/labels.ts

import * as THREE from 'three';
import { StructureInstance } from '../types';

export interface LabelSystem {
  /** Update label positions — call every frame */
  update: () => void;
  /** Show all labels (with fade-in) */
  show: () => void;
  /** Hide all labels (with fade-out) */
  hide: () => void;
  /** Remove all DOM elements */
  dispose: () => void;
}

export function createLabels(
  instances: StructureInstance[],
  camera: THREE.PerspectiveCamera,
): LabelSystem;
```

```typescript
// src/ui/mode-indicator.ts

import { CameraStateMachine } from '../camera/state-machine';

export interface ModeIndicator {
  dispose: () => void;
}

export function createModeIndicator(
  stateMachine: CameraStateMachine,
): ModeIndicator;
```

**Label Visual Specification:**

Each label is a `<div>` inside `#overlay`:
- Position: `transform: translate(-50%, -50%)` centered on projected point, offset upward by ~30px
- Font: `'Courier New', monospace`, uppercase, letter-spacing 1.5px
- Base font size: 12px, high priority (≥8): 15px, with class `priority-high`
- Background: `rgba(0, 0, 0, 0.4)` with `backdrop-filter: blur(4px)`
- Border: `1px solid rgba(0, 255, 200, 0.3)`
- `pointer-events: auto` (must be clickable despite overlay being `pointer-events: none`)
- Hover: border brightens, subtle glow box-shadow, text color shifts to neon
- Description (if present): smaller text below name, lower opacity
- Click handler: `window.location.href = url` for relative URLs, `window.open(url, '_blank')` for absolute URLs
- CSS class: `.entry-label` (used by TASK-12 to detect label clicks)
- Fade in/out via CSS transition on opacity

**Mode Indicator Specification:**

A `<div>` inside `#ui`:
- Position: fixed, top-left (24px inset)
- Shows current mode name and hint text
- DESCENT: `"ESC to skip"`
- FREE_CAM: `"WASD move · click blink · ESC simple view"`
- FIXED_CAM: `"ESC free camera"`
- Font: same as labels but 10px, very low opacity (0.3)
- Updates on state change callback

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Labels mount in `#overlay`, mode indicator mounts in `#ui` — do NOT mix containers
- Label elements MUST have class `.entry-label` — TASK-12 checks for this class to avoid triggering blink on label clicks
- `update()` must be called every frame — do NOT use `setInterval` or `requestAnimationFrame` separately
- Labels behind the camera (projected z > 1) must be hidden (`display: none`)
- External URLs (starting with `http`) open in new tab. Relative URLs navigate in same window.
- All label styles must be defined in JavaScript (inline styles or dynamically created `<style>` tag) — do not create a separate CSS file

**Must NOT do:**
- Do not create Canvas-based labels — use HTML divs for accessibility and click handling
- Do not modify `#hud` — that belongs to the descent HUD (TASK-08)
- Do not modify structure or camera code

**Acceptance Criteria:**
- [ ] One label div created per StructureInstance, mounted in `#overlay`
- [ ] Labels show entry name and optional description
- [ ] Labels track 3D positions accurately when camera moves
- [ ] Labels behind camera are hidden
- [ ] High priority entries (≥8) have larger labels
- [ ] Labels are clickable — relative URLs navigate, absolute URLs open new tab
- [ ] Labels have `.entry-label` CSS class
- [ ] Hover state shows visual feedback (glow, border brightening)
- [ ] `show()` fades labels in, `hide()` fades them out
- [ ] Mode indicator updates text on state change
- [ ] Mode indicator shows appropriate hint per mode
- [ ] `dispose()` removes all created DOM elements

**Edge Cases to Handle:**
- Entry with no description → label shows only name (no empty space)
- Label projected to position outside viewport → hide it (check bounds)
- Many labels overlapping → no special handling needed (low item count makes this unlikely)
- Window resize → labels reproject correctly on next `update()` call

**Test Requirements:**
No automated tests. Visual verification: labels appear above structures and track camera movement. Clicking labels navigates. Mode indicator updates on Escape press.

**Known Risks / Likely Mistakes:**
- AI may use `Vector3.project()` incorrectly — the correct formula after projection: `x = (v.x * 0.5 + 0.5) * viewportWidth`, `y = (-v.y * 0.5 + 0.5) * viewportHeight`
- AI may forget `pointer-events: auto` on labels — they'd be unclickable
- AI may put styles in a separate CSS file — all styles must be JS-defined for single-file simplicity

---

## TASK-15: Particle Systems

**Objective:** Create `src/effects/ambient-particles.ts` for global floating neon dust, and `src/structures/particles.ts` for per-structure localised particle emitters that add life and atmosphere to each structure.

**Bootstrap Context:**
Read `src/config.ts` for particle counts and spread. Read `src/types.ts` for `StructureInstance`. Read `src/structures/base.ts` for `SeededRNG` and neon colors.

Key facts:
- Ambient dust: global floating particles across the terrain area — neon colored, slowly drifting
- Structure particles: each structure gets a small local particle emitter — spores, energy motes, sparks depending on structure type
- Both systems update per frame
- Structure particles are positioned relative to the structure's world position

**Files to Create:**
- `src/effects/ambient-particles.ts` — CREATE — Global ambient dust
- `src/structures/particles.ts` — CREATE — Per-structure particle emitters

**Files to Modify:**
- `src/main.ts` — MODIFY — Create both particle systems, update in render loop

**Inputs:**
- `CONFIG` particle constants
- `StructureInstance[]` for per-structure emitters
- `THREE.Scene` to add particles to

**Outputs:**
- `createAmbientParticles(scene: THREE.Scene): AmbientParticles`
- `createStructureParticles(instances: StructureInstance[], scene: THREE.Scene): StructureParticles`

**Interface Contract:**

```typescript
// src/effects/ambient-particles.ts

import * as THREE from 'three';

export interface AmbientParticles {
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

export function createAmbientParticles(scene: THREE.Scene): AmbientParticles;
```

```typescript
// src/structures/particles.ts

import * as THREE from 'three';
import { StructureInstance } from '../types';

export interface StructureParticles {
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

export function createStructureParticles(
  instances: StructureInstance[],
  scene: THREE.Scene,
): StructureParticles;
```

**Ambient Particles Specification:**
- `AMBIENT_DUST_COUNT` particles (Points geometry)
- Random positions within `AMBIENT_DUST_SPREAD` radius, height range: `TERRAIN_Y_OFFSET` to `TERRAIN_Y_OFFSET + 30`
- Vertex colors from `NEON_COLORS` palette
- Size: 0.2-0.4, sizeAttenuation true
- Animation: gentle sinusoidal drift (each particle moves slightly on X/Y/Z based on sin/cos of elapsed + particle index)
- `depthWrite: false` for correct transparency

**Structure Particles Specification:**
- `STRUCTURE_PARTICLE_COUNT` particles per structure instance
- Each emitter is a `Points` geometry positioned at the structure's world position
- Particle positions: random within `boundingRadius * 1.5` of the structure center
- Particle colors: match the structure's color (from NEON_COLORS by index)
- Animation: particles slowly rise upward and respawn at bottom when exceeding height range. Slight horizontal drift.
- Size: 0.15-0.25
- `depthWrite: false`, `transparent: true`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Both particle systems must use `THREE.Points` with `BufferGeometry` — NOT individual mesh objects per particle
- Both must set `depthWrite: false` on materials
- Structure particles must use the structure's `worldPosition` for placement — NOT the group position (which may have local offsets)
- `bufferAttribute.needsUpdate = true` must be set after modifying position buffers

**Must NOT do:**
- Do not modify structure generators or placement
- Do not use external particle libraries
- Do not create particles that block clicks (use small sizes and no `pointer-events`)

**Acceptance Criteria:**
- [ ] Ambient dust visible as colored floating motes across the terrain
- [ ] Ambient particles drift gently (not stationary)
- [ ] Per-structure particles visible around each placed structure
- [ ] Per-structure particle colors match the structure's assigned neon color
- [ ] Particles rise upward and recycle
- [ ] `needsUpdate` set on position buffers each frame
- [ ] `dispose()` cleans up geometries and materials for both systems
- [ ] No visual z-fighting with terrain or structures

**Test Requirements:**
No automated tests. Visual verification.

**Known Risks / Likely Mistakes:**
- AI may create individual Mesh objects per particle instead of Points → severe performance issue
- AI may forget `needsUpdate = true` on buffers → particles appear frozen
- AI may position structure particles at (0,0,0) instead of the structure's world position

---

## TASK-16: Post-Processing Effects

**Objective:** Create `src/effects/post-processing.ts` that sets up the Three.js EffectComposer with a bloom pass (UnrealBloomPass) to give all emissive objects a neon glow halo. Include performance detection to disable bloom on low-end devices.

**Bootstrap Context:**
Read `src/scene/setup.ts` for renderer and scene references. Read `src/config.ts` for `BLOOM_*` constants. Post-processing replaces the standard `renderer.render()` call in the main loop — the composer's `render()` is called instead.

**Files to Create:**
- `src/effects/post-processing.ts` — CREATE — Post-processing setup

**Files to Modify:**
- `src/main.ts` — MODIFY — Replace `renderer.render(scene, camera)` with `composer.render()` (or fallback to standard render)

**Inputs:**
- `SceneContext` (renderer, scene, camera) from setup
- `CONFIG` bloom constants

**Outputs:**
- `createPostProcessing(renderer, scene, camera): PostProcessing`

**Interface Contract:**

```typescript
// src/effects/post-processing.ts

import * as THREE from 'three';

export interface PostProcessing {
  /** Call instead of renderer.render() */
  render: () => void;
  /** Update on window resize */
  resize: (width: number, height: number) => void;
  /** Whether post-processing is enabled (may be disabled for performance) */
  enabled: boolean;
  /** Dispose composer and passes */
  dispose: () => void;
}

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostProcessing;
```

**Setup:**
- `EffectComposer` from `three/examples/jsm/postprocessing/EffectComposer.js`
- `RenderPass` from `three/examples/jsm/postprocessing/RenderPass.js`
- `UnrealBloomPass` from `three/examples/jsm/postprocessing/UnrealBloomPass.js`
- Bloom config: strength `BLOOM_STRENGTH`, radius `BLOOM_RADIUS`, threshold `BLOOM_THRESHOLD`

**Performance Detection:**
- After first 60 frames, compute average FPS
- If average FPS < 30 on the first 60 frames, disable bloom (set `enabled = false`)
- When disabled, `render()` falls back to standard `renderer.render(scene, camera)`
- Log a message: `console.info('Bloom disabled for performance')`

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- Import paths must use `.js` extension: `from 'three/examples/jsm/postprocessing/EffectComposer.js'`
- `resize()` must update both the composer size AND the bloom pass resolution
- The `render()` function MUST check `enabled` flag — disabled state falls back to standard render
- Bloom threshold (`BLOOM_THRESHOLD`) controls which brightness levels bloom — set too low and everything blooms; too high and nothing does. The config value of 0.6 is tuned for emissive materials.

**Must NOT do:**
- Do not add shader passes beyond RenderPass and UnrealBloomPass (keep it simple)
- Do not modify the renderer's tone mapping settings — those are set in TASK-03
- Do not make bloom mandatory — always support fallback rendering

**Acceptance Criteria:**
- [ ] EffectComposer created with RenderPass and UnrealBloomPass
- [ ] Bloom parameters match CONFIG values
- [ ] `render()` renders via composer when enabled
- [ ] `render()` renders via standard renderer when disabled
- [ ] `resize()` updates composer and bloom pass resolution
- [ ] Performance detection disables bloom if FPS < 30 over first 60 frames
- [ ] Performance fallback logs a console message
- [ ] `dispose()` cleans up passes and composer
- [ ] Emissive structure materials produce visible glow halos

**Edge Cases to Handle:**
- WebGL context loss during bloom render → fall back to standard render, log error
- Very small viewport → bloom still works but may look different at low resolution

**Test Requirements:**
No automated tests. Visual verification: emissive objects should have visible glow halos. Test performance fallback by throttling CPU in browser devtools.

**Known Risks / Likely Mistakes:**
- AI may use wrong import paths (missing `.js` extension) → build errors
- AI may forget to update bloom resolution on resize → bloom looks blurry at non-original resolution
- AI may set bloom threshold too low → entire scene glows uniformly (should only bloom emissive surfaces)
