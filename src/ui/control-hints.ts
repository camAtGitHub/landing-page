import { CameraStateMachine } from '../camera/state-machine';
import { CameraState } from '../types';
import { CONFIG } from '../config';

export interface ControlHints {
  reshow: () => void;
  dispose: () => void;
}

export function createControlHints(stateMachine: CameraStateMachine, isMobile: boolean): ControlHints {
  const ui = document.getElementById('ui');
  if (!ui) return { reshow: () => {}, dispose: () => {} };

  const style = document.createElement('style');
  style.textContent = `
    .control-hints {
      position: absolute;
      left: 50%;
      bottom: 15%;
      transform: translateX(-50%);
      max-width: 560px;
      width: calc(100% - 48px);
      padding: 16px 24px;
      border: 1px solid rgba(0, 255, 200, 0.15);
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(6px);
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(0, 255, 200, 0.7);
      pointer-events: none;
      opacity: 0;
      display: none;
      transition: opacity 0.5s ease;
    }
    .control-hints.visible {
      opacity: 1;
    }
    .control-hints.dismissable {
      pointer-events: auto;
      cursor: pointer;
    }
    .control-hints-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      font-size: 12px;
      line-height: 1.5;
    }
    .control-hints-row + .control-hints-row {
      margin-top: 8px;
      font-size: 10px;
    }
    .control-hints-highlight {
      text-shadow: 0 0 8px rgba(0, 255, 200, 0.3);
    }
  `;
  document.head.appendChild(style);

  const desktopMarkup = `
    <div class="control-hints-row">
      <span><strong>WASD / ↑↓</strong> Move</span>
      <span><strong>Mouse / ←→</strong> Look Around</span>
    </div>
    <div class="control-hints-row">
      <span class="control-hints-highlight">Click labels to navigate</span>
      <span><strong>ESC</strong> Toggle view</span>
    </div>
  `;

  const mobileMarkup = `
    <div class="control-hints-row">
      <span><strong>Drag</strong> Orbit</span>
      <span><strong>Pinch</strong> Zoom</span>
    </div>
    <div class="control-hints-row">
      <span class="control-hints-highlight"><strong>Tap</strong> label to open page</span>
    </div>
  `;

  const el = document.createElement('div');
  el.className = 'control-hints';
  el.innerHTML = isMobile ? mobileMarkup : desktopMarkup;
  ui.appendChild(el);

  let shown = false;
  let dismissed = false;
  let disposed = false;
  let showTimeout: ReturnType<typeof setTimeout> | null = null;
  let dismissTimeout: ReturnType<typeof setTimeout> | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = (): void => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  };

  const dismissOnInput = (): void => {
    dismiss();
  };

  const removeInputListeners = (): void => {
    document.removeEventListener('keydown', dismissOnInput);
    document.removeEventListener('mousedown', dismissOnInput);
    document.removeEventListener('touchstart', dismissOnInput);
    el.removeEventListener('click', dismissOnInput);
  };

  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;

    clearTimers();
    removeInputListeners();

    el.style.transition = 'opacity 0.4s ease';
    el.classList.remove('visible');
    el.classList.remove('dismissable');
    hideTimeout = setTimeout(() => {
      el.style.display = 'none';
    }, 400);
  };

  const show = (): void => {
    if (disposed) return;

    // Reset dismissed state to allow re-showing
    dismissed = false;
    shown = true;
    clearTimers();

    el.style.display = 'block';
    showTimeout = setTimeout(() => {
      showTimeout = null;
      if (dismissed || disposed) return;
      el.style.transition = 'opacity 0.5s ease';
      el.classList.add('visible');

      // On mobile, make the hints tappable to dismiss
      if (isMobile) {
        el.classList.add('dismissable');
        el.addEventListener('click', dismissOnInput, { once: true });
      }
    }, 300);

    dismissTimeout = setTimeout(() => {
      dismiss();
    }, CONFIG.HELP_HINT_AUTO_DISMISS_MS);

    document.addEventListener('keydown', dismissOnInput);
    document.addEventListener('mousedown', dismissOnInput);
    document.addEventListener('touchstart', dismissOnInput, { passive: true });
  };

  const reshow = (): void => {
    if (disposed) return;
    // Force reset so hints can appear again
    dismissed = false;
    shown = false;
    clearTimers();
    removeInputListeners();
    el.classList.remove('visible');
    el.classList.remove('dismissable');
    el.style.display = 'none';

    // Small delay then show fresh
    setTimeout(() => show(), 50);
  };

  stateMachine.onStateChange((_newState, oldState) => {
    if (oldState === CameraState.DESCENT) {
      show();
    }
  });

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    dismiss();
    clearTimers();
    removeInputListeners();
    el.remove();
    style.remove();
  };

  return { reshow, dispose };
}
