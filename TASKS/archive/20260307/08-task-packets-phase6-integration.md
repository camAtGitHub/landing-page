# Alien Landing Page — Task Packets: Phase 6 (Mobile Adaptation & Integration)

---

## TASK-17: Mobile Adaptation & Final Integration

**Objective:** Wire together all modules in `src/main.ts`, implement mobile device detection, ensure touch controls work on the fixed-cam view, verify the complete Escape key toggle flow, add a loading screen while data.json loads, and perform final integration testing across the full experience.

**Bootstrap Context:**
Read ALL module interfaces — this is the integration task. Read `src/main.ts` (current state) which should already have partial imports from earlier tasks. This task completes main.ts and adds mobile-specific behavior.

Key facts:
- All individual modules are built. This task wires them together.
- Mobile detection: viewport width < `MOBILE_BREAKPOINT_PX` at startup
- Mobile users skip free-cam entirely — descent → fixed-cam
- Desktop users: descent → free-cam, Escape toggles free↔fixed
- All structure generator files must be imported (to trigger registration) before `placeStructures` is called
- The render loop calls update functions on: camera state machine, structure instances, labels, ambient particles, structure particles, descent HUD

**Files to Modify:**
- `src/main.ts` — MODIFY — Complete the main application wiring and render loop

**Files to Create:**
- `src/ui/loading.ts` — CREATE — Simple loading screen shown while data.json loads

**Inputs:**
- All module exports from all prior tasks

**Outputs:**
- A complete, working application that can be built and served

**Interface Contract:**

```typescript
// src/ui/loading.ts

export interface LoadingScreen {
  /** Show the loading screen */
  show: () => void;
  /** Hide the loading screen with fade out */
  hide: () => void;
  /** Remove all DOM elements */
  dispose: () => void;
}

export function createLoadingScreen(): LoadingScreen;
```

Loading screen: mounts in `#ui`, centered text `"APPROACHING..."` in monospace, neon green, low opacity, with a subtle pulse animation. Shown on page load, hidden after data.json loads and scene is ready.

**`main.ts` Complete Wiring Specification:**

```typescript
// Pseudocode for main.ts structure:

// 1. Import all modules
import all scene, camera, structure, UI, effect modules
import all structure generators (side-effect imports for registration)

// 2. Detect mobile
const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT_PX

// 3. Init scene
const ctx = initScene()

// 4. Show loading screen
const loading = createLoadingScreen()
loading.show()

// 5. Load data (async)
const entries = await loadSiteData()

// 6. Create terrain
const terrain = createTerrain(ctx.scene)

// 7. Create sky
const sky = createSky(ctx.scene)

// 8. Create camera system
const stateMachine = new CameraStateMachine(ctx.camera, isMobile)
const descentCtrl = createDescentController({ sky, scene: ctx.scene, fog: ctx.scene.fog })
const freeCtrl = createFreeCamController(terrain)
const fixedCtrl = createFixedCamController()
stateMachine.registerController(CameraState.DESCENT, descentCtrl)
stateMachine.registerController(CameraState.FREE_CAM, freeCtrl)
stateMachine.registerController(CameraState.FIXED_CAM, fixedCtrl)

// 9. Place structures
const instances = placeStructures(entries, terrain, ctx.scene)

// 10. Create labels
const labels = createLabels(instances, ctx.camera)
// Hide labels during descent, show after
stateMachine.onStateChange((newState, oldState) => {
  if (oldState === CameraState.DESCENT) labels.show()
})

// 11. Create HUD
const hud = createDescentHUD(stateMachine)

// 12. Create mode indicator
const modeIndicator = createModeIndicator(stateMachine)

// 13. Create particles
const ambientP = createAmbientParticles(ctx.scene)
const structureP = createStructureParticles(instances, ctx.scene)

// 14. Create post-processing
const postProc = createPostProcessing(ctx.renderer, ctx.scene, ctx.camera)

// 15. Hide loading screen
loading.hide()

// 16. Resize handler
window.addEventListener('resize', () => {
  ctx.resize()
  postProc.resize(window.innerWidth, window.innerHeight)
})

// 17. Render loop
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  stateMachine.update(delta, elapsed)
  instances.forEach(s => s.update(elapsed, delta))
  labels.update()
  hud.update(descentProgress)  // need to expose progress from descent controller
  ambientP.update(elapsed, delta)
  structureP.update(elapsed, delta)
  postProc.render()
}
animate()
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- ALL 7 structure generator files MUST be imported (side-effect imports) BEFORE `placeStructures()` is called. Example: `import './structures/generators/crystal';` etc. Without this, generators won't be registered and all structures will fall back to 'crystal' or fail.
- The render loop must call `postProc.render()`, NOT `renderer.render()` — post-processing replaces the standard render call.
- Labels must be hidden during descent and shown after — subscribe to state machine changes.
- The loading screen must be shown BEFORE the `await loadSiteData()` call and hidden AFTER all scene setup is complete.
- Mobile detection happens ONCE at startup and is passed to the `CameraStateMachine` constructor. Do not re-detect on resize.
- The `async` init must be wrapped in a top-level async IIFE or similar — `main.ts` cannot use top-level await in all build configurations.

**Must NOT do:**
- Do not modify any module other than `main.ts` and the new `loading.ts`
- Do not add new features — this is integration only
- Do not change the CONFIG values — those are tuned by individual tasks
- Do not add analytics, cookies, or external scripts

**Acceptance Criteria:**
- [ ] Page loads and shows loading screen
- [ ] data.json is fetched and entries are loaded
- [ ] Loading screen fades out after scene is ready
- [ ] Descent sequence plays automatically on page load
- [ ] Stars warp and fade during descent
- [ ] HUD is visible during descent
- [ ] Escape during descent skips to post-descent mode
- [ ] After descent: structures are visible as neon alien formations
- [ ] Labels appear above structures after descent
- [ ] Labels are clickable and navigate to configured URLs
- [ ] Desktop: free-cam mode works (mouse look, WASD, click blink)
- [ ] Desktop: Escape toggles between free-cam and fixed-cam
- [ ] Mobile: fixed-cam mode is default after descent
- [ ] Mobile: touch parallax works on fixed-cam
- [ ] Ambient dust particles float across the scene
- [ ] Per-structure particles emit from each structure
- [ ] Bloom glow is visible on emissive structures
- [ ] Mode indicator shows correct text per state
- [ ] Window resize updates renderer, camera, and bloom
- [ ] `npm run build` produces working static files in `dist/`
- [ ] Built files served by static server display the full experience
- [ ] `data.json` changes (add/remove/edit entries) are reflected on page reload without rebuild

**Edge Cases to Handle:**
- `data.json` fetch fails → show error message in loading screen area, log to console
- Empty `data.json` → descent plays, but no structures/labels on surface (empty planet)
- Very slow network → loading screen stays visible, no race conditions
- User presses Escape before page is fully loaded → no crash (state machine not yet created)

**Test Requirements:**
Manual integration testing. Test the following flows end to end:
1. Fresh load → descent → auto-transition → explore (desktop)
2. Fresh load → Escape during descent → immediate explore (desktop)
3. Fresh load → descent → fixed-cam (mobile viewport)
4. Toggle free↔fixed with Escape (desktop)
5. Edit data.json → reload → verify changes reflected
6. Remove all entries from data.json → reload → empty planet, no crash
7. Add a new entry with unknown type → reload → falls back to crystal, no crash
8. Test on Chrome, Firefox, Safari
9. Test on a real mobile device (or mobile emulation in devtools)

**Known Risks / Likely Mistakes:**
- AI may forget side-effect imports for generators → `import './structures/generators/crystal'` etc. must exist in main.ts
- AI may use `renderer.render()` instead of `postProc.render()` → no bloom effect
- AI may not handle the async data loading correctly (missing await, race condition with render loop) → ensure scene setup completes before render loop starts
- AI may forget to pass descent progress to the HUD update → HUD numbers won't animate. The descent controller needs to expose its progress somehow (via a getter, or the HUD reads from the controller directly).
- AI may accidentally block the main thread during structure generation for many entries → unlikely with <20 entries, but structure creation should happen synchronously after data load, before the render loop starts
