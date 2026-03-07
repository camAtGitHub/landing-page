import { CameraStateMachine } from '../camera/state-machine';
import { CameraState } from '../types';
import { CONFIG } from '../config';

export interface ControlHints {
  dispose: () => void;
}

export function createControlHints(stateMachine: CameraStateMachine): ControlHints {
  const ui = document.getElementById('ui');
  if (!ui) return { dispose: () => {} };

  const style = document.createElement('style');
  style.textContent = `
    .control-hints {
      position: absolute;
      left: 50%;
      bottom: 15%;
      transform: translateX(-50%);
      max-width: 500px;
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

  const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT_PX;

  const desktopHint = `
    <div class="control-hints-row">
      <span><strong>WASD / ↑↓</strong> Move</span>
      <span><strong>Mouse / ←→</strong> Look Around</span>
    </div>
    <div class="control-hints-row">
      <span class="control-hints-highlight">Click labels to navigate</span>
      <span><strong>ESC</strong> Toggle view</span>
    </div>
  `;

  const mobileHint = `
    <div class="control-hints-row">
      <span><strong>Drag</strong> Orbit</span>
      <span><strong>Pinch</strong> Zoom</span>
    </div>
    <div class="control-hints-row">
      <span class="control-hints-highlight">Double-tap labels to blink</span>
      <span><strong>Hold 2.5s</strong> Skip descent</span>
    </div>
  `;

  const el = document.createElement('div');
  el.className = 'control-hints';
  el.innerHTML = isMobile ? mobileHint : desktopHint;
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
  };

  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;

    clearTimers();
    removeInputListeners();

    el.style.transition = 'opacity 0.4s ease';
    el.classList.remove('visible');
    hideTimeout = setTimeout(() => {
      el.style.display = 'none';
    }, 400);
  };

  const show = (): void => {
    if (shown || disposed) return;
    shown = true;

    el.style.display = 'block';
    showTimeout = setTimeout(() => {
      showTimeout = null;
      if (dismissed || disposed) return;
      el.style.transition = 'opacity 0.5s ease';
      el.classList.add('visible');
    }, 300);

    dismissTimeout = setTimeout(() => {
      dismiss();
    }, 8000);

    document.addEventListener('keydown', dismissOnInput);
    document.addEventListener('mousedown', dismissOnInput);
    document.addEventListener('touchstart', dismissOnInput, { passive: true });
  };

  stateMachine.onStateChange((newState, oldState) => {
    if (oldState === CameraState.DESCENT && newState !== CameraState.DESCENT) {
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

  return { dispose };
}
