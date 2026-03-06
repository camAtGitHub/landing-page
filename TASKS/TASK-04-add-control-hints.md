---
## TASK-04: Add Control Instructions Overlay After Landing

**Depends on:** TASK-01 (descent must work so the post-landing trigger fires correctly), TASK-03 (arrow key behaviour must be finalized so instructions are accurate)

**Objective:** Create a brief, stylish control hints overlay that appears after the descent completes (or is skipped) and auto-dismisses after a few seconds or on any user input. The overlay must clearly communicate: how to move (WASD + arrow keys), how to look around (mouse + arrow left/right), that clicking the floating text labels navigates to pages, and that ESC toggles camera modes. The current mode indicator text is too small and too subtle for first-time visitors to notice.

**Bootstrap Context:**
Read `TASK-00-bootstrap-context.md` first.
Then read:
- `src/ui/mode-indicator.ts` — understand the existing tiny hint system (you will NOT modify this, but it provides design context)
- `src/ui/labels.ts` — understand how labels work and their `.entry-label` CSS class
- `src/camera/state-machine.ts` — understand the `onStateChange` callback system
- `src/hud/descent-hud.ts` — example of how the HUD subscribes to state changes and manages visibility

Key facts you need:
- The `#ui` div (z-index 60) is the topmost overlay layer and is where UI elements mount.
- The existing mode indicator mounts in `#ui` at top-left with 10px font, 30% opacity — it's nearly invisible.
- The user initially tried clicking on the 3D structures themselves to navigate, not realizing they need to click the floating HTML label text above the structures.
- The HUD and labels already use `'Courier New', monospace` with neon green `rgba(0, 255, 200, ...)` styling — the instructions overlay must match this aesthetic.
- `stateMachine.onStateChange(callback)` fires when transitioning between states.

**Files to Create:**
- `src/ui/control-hints.ts` — CREATE — The control hints overlay module.

**Files to Modify:**
- `src/main.ts` — MODIFY — Import and initialize the control hints, wire to state machine.

**Inputs:**
- `CameraStateMachine` instance — to subscribe to state changes.
- `CameraState` enum — to detect when transitioning out of DESCENT.

**Outputs:**
- A visually clear but non-intrusive overlay that appears when FREE_CAM or FIXED_CAM activates for the first time (after descent ends or is skipped).
- The overlay lists controls in a compact, readable layout.
- The overlay auto-dismisses after 8 seconds OR immediately on any keypress/mouse click/touch.
- The overlay only shows ONCE per page load — it does not reappear when toggling between FREE_CAM and FIXED_CAM.

**Interface Contract:**

```typescript
// src/ui/control-hints.ts

export interface ControlHints {
  dispose: () => void;
}

/**
 * Creates a one-time control hints overlay that appears after descent ends.
 * Shows for 8 seconds or until user interacts. Only shows once per session.
 */
export function createControlHints(stateMachine: CameraStateMachine): ControlHints;
```

In `main.ts`, add after the mode indicator line:

```typescript
import { createControlHints } from './ui/control-hints';
// ... after createModeIndicator(stateMachine);
createControlHints(stateMachine);
```

**Visual Design Specification:**

The overlay should appear as a centered panel, vertically positioned in the lower-third of the screen. Design:

```
┌─────────────────────────────────────────────────┐
│                                                   │
│   WASD / ↑↓  Move        Mouse / ←→  Look Around │
│   Click labels to navigate    ESC  Toggle view    │
│                                                   │
└─────────────────────────────────────────────────┘
```

Styling:
- Font: `'Courier New', monospace` — match existing HUD aesthetic.
- Text color: `rgba(0, 255, 200, 0.7)` — neon green, slightly transparent.
- Background: `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(6px)`.
- Border: `1px solid rgba(0, 255, 200, 0.15)`.
- Font size: 12px for controls, 10px for the "click labels" hint.
- Letter-spacing: 1.5px, text-transform: uppercase.
- Max width: 500px, centered horizontally, positioned at `bottom: 15%`.
- Padding: 16px 24px.
- Fade-in animation: opacity 0→1 over 0.5s with a 0.3s delay (let the scene settle first).
- Fade-out animation: opacity 1→0 over 0.4s, then `display: none`.
- `pointer-events: none` — the overlay must not intercept clicks.

The "Click labels to navigate" line should be slightly emphasized — use a subtle glow: `text-shadow: 0 0 8px rgba(0, 255, 200, 0.3)`.

**Implementation Details:**

```typescript
export function createControlHints(stateMachine: CameraStateMachine): ControlHints {
  let shown = false;
  let dismissed = false;
  let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  const ui = document.getElementById('ui');
  if (!ui) return { dispose: () => {} };

  // Create style
  const style = document.createElement('style');
  style.textContent = `
    .control-hints { /* ... styles per spec above ... */ }
    .control-hints.visible { opacity: 1; }
  `;
  document.head.appendChild(style);

  // Create element
  const el = document.createElement('div');
  el.className = 'control-hints';
  el.innerHTML = `
    <div class="hints-row">
      <span><strong>WASD / ↑↓</strong> Move</span>
      <span><strong>Mouse / ←→</strong> Look</span>
    </div>
    <div class="hints-row hints-secondary">
      <span class="hints-highlight">Click floating labels to navigate</span>
      <span><strong>ESC</strong> Toggle view</span>
    </div>
  `;
  ui.appendChild(el);

  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    el.classList.remove('visible');
    if (dismissTimeout) clearTimeout(dismissTimeout);
    setTimeout(() => { el.style.display = 'none'; }, 400);
    // Clean up listeners
    document.removeEventListener('keydown', dismissOnInput);
    document.removeEventListener('mousedown', dismissOnInput);
    document.removeEventListener('touchstart', dismissOnInput);
  };

  const dismissOnInput = (): void => { dismiss(); };

  const show = (): void => {
    if (shown) return;
    shown = true;
    // Delayed fade-in
    setTimeout(() => {
      el.classList.add('visible');
    }, 300);
    // Auto-dismiss after 8 seconds
    dismissTimeout = setTimeout(dismiss, 8000);
    // Dismiss on any input
    document.addEventListener('keydown', dismissOnInput);
    document.addEventListener('mousedown', dismissOnInput);
    document.addEventListener('touchstart', dismissOnInput, { passive: true });
  };

  // Trigger on first exit from DESCENT
  stateMachine.onStateChange((newState, oldState) => {
    if (oldState === CameraState.DESCENT && !shown) {
      show();
    }
  });

  const dispose = (): void => {
    dismiss();
    el.remove();
    style.remove();
  };

  return { dispose };
}
```

⚠️ CRITICAL CONSTRAINTS — THESE MUST NOT BE VIOLATED:
- The overlay must have `pointer-events: none` — it must NEVER intercept clicks that should go to labels or the scene.
- The overlay must appear ONLY ONCE per page load. The `shown` flag must prevent re-display on subsequent state changes.
- The overlay must not appear during descent — only after transition to FREE_CAM or FIXED_CAM.
- The dismiss input listener must be cleaned up after dismissal to avoid orphaned event listeners.
- All styling must use inline `<style>` elements appended to `<head>` — no external CSS files (project constraint).
- Mount only in the `#ui` div — do not create new root-level DOM elements.

**Must NOT do:**
- Do not modify `src/ui/mode-indicator.ts` — it continues to work as-is alongside the new hints.
- Do not modify `src/ui/labels.ts`.
- Do not modify `src/hud/descent-hud.ts`.
- Do not modify `src/camera/` files.
- Do not modify `src/scene/` files.
- Do not add external font imports or CSS files.
- Do not use `z-index` on the hints element — the `#ui` div already has z-index 60.

**Acceptance Criteria:**
- [ ] After descent completes naturally (~14s), the control hints overlay fades in within 0.5s.
- [ ] After pressing ESC to skip descent, the control hints overlay fades in within 0.5s.
- [ ] The overlay displays: move controls (WASD/arrows), look controls (mouse/arrow left-right), label click instruction, ESC toggle instruction.
- [ ] The overlay auto-dismisses after 8 seconds with a fade-out animation.
- [ ] Any keypress, mouse click, or touch dismisses the overlay immediately.
- [ ] The overlay does NOT reappear when toggling between FREE_CAM and FIXED_CAM with ESC.
- [ ] The overlay does not block clicks on labels or the scene (pointer-events: none).
- [ ] The overlay matches the existing HUD aesthetic (Courier New, neon green, dark semi-transparent background).
- [ ] `npm run build` succeeds without errors.
- [ ] One new import line added to `main.ts`, one new function call — no other changes to `main.ts`.

**Edge Cases to Handle:**
- `#ui` element missing from DOM → return no-op `dispose` function, do not throw.
- User presses ESC during the 0.3s delay before hints appear → hints should still not appear (check `dismissed` flag in the `show` timeout callback).
- Rapid state changes (ESC spam) → `shown` flag prevents multiple overlays.

**Test Requirements:**
No automated test required — this is a purely visual UI element. Manual verification:
1. Load page → let descent complete → hints appear → auto-dismiss after 8s.
2. Load page → press ESC immediately → hints appear → press any key → hints dismiss instantly.
3. After hints dismiss, press ESC multiple times → hints do NOT reappear.
4. While hints are visible, click a label → label click works (pointer-events: none verified).

**Known Risks / Likely Mistakes:**
- AI may forget `pointer-events: none` on the overlay, causing it to intercept label clicks during the 8-second display window. This is critical.
- AI may use `addEventListener` for dismissal but forget to `removeEventListener` after — this leaks listeners.
- AI may put the overlay at z-index higher than the `#overlay` div (z-index 50) which would block label interaction — since the hints mount in `#ui` (z-index 60) this is fine, but `pointer-events: none` must be set.
- AI may show hints during descent if it subscribes to the wrong event — subscribe to the transition OUT of DESCENT, not the DESCENT state itself.
---
