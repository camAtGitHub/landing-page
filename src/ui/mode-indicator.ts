import { CameraStateMachine } from '../camera/state-machine';
import { CameraState } from '../types';

export interface ModeIndicator {
  dispose: () => void;
}

const DESKTOP_MODE_TEXT: Record<CameraState, string> = {
  [CameraState.DESCENT]: 'ESC to skip',
  [CameraState.FREE_CAM]: 'WASD move · click blink · press escape for simple view',
  [CameraState.FIXED_CAM]: 'ESC free camera',
};

const MOBILE_MODE_TEXT: Record<CameraState, string> = {
  [CameraState.DESCENT]: 'Hold screen for 2.5s to skip',
  [CameraState.FREE_CAM]: 'Swipe look · tap labels · simple view available',
  [CameraState.FIXED_CAM]: 'Drag orbit · pinch zoom · tap label to open page',
};

export function createModeIndicator(
  stateMachine: CameraStateMachine,
  isMobile: boolean,
  onHelpRequest?: () => void,
): ModeIndicator {
  const ui = document.getElementById('ui');
  if (!ui) return { dispose: () => {} };

  const modeText = isMobile ? MOBILE_MODE_TEXT : DESKTOP_MODE_TEXT;

  // --- Mode text element (top-left) ---
  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute;
    top: 24px;
    left: 24px;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(0, 255, 200, 0.3);
    pointer-events: none;
    text-transform: uppercase;
  `;
  el.textContent = modeText[stateMachine.getState()];
  ui.appendChild(el);

  // --- Help hint element (shows after descent) ---
  const helpEl = document.createElement('div');
  helpEl.style.cssText = `
    position: absolute;
    top: 24px;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0;
    transition: opacity 0.5s ease;
    display: none;
  `;

  if (isMobile) {
    // Mobile: right-aligned tappable "Help" button
    helpEl.style.right = '24px';
    helpEl.style.fontSize = '11px';
    helpEl.style.color = 'rgba(0, 255, 200, 0.5)';
    helpEl.style.pointerEvents = 'auto';
    helpEl.style.cursor = 'pointer';
    helpEl.style.padding = '6px 12px';
    helpEl.style.border = '1px solid rgba(0, 255, 200, 0.2)';
    helpEl.style.background = 'rgba(0, 0, 0, 0.3)';
    helpEl.textContent = 'Help';

    helpEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onHelpRequest) onHelpRequest();
    });
  } else {
    // Desktop: centered "Press H for help" text prompt
    helpEl.style.left = '50%';
    helpEl.style.transform = 'translateX(-50%)';
    helpEl.style.fontSize = '10px';
    helpEl.style.color = 'rgba(0, 255, 200, 0.3)';
    helpEl.style.pointerEvents = 'none';
    helpEl.textContent = 'Press H for help';
  }

  ui.appendChild(helpEl);

  // --- H key listener (desktop only) ---
  let keyListener: ((e: KeyboardEvent) => void) | null = null;
  if (!isMobile) {
    keyListener = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && stateMachine.getState() !== CameraState.DESCENT) {
        if (onHelpRequest) onHelpRequest();
      }
    };
    window.addEventListener('keydown', keyListener);
  }

  // --- Show/hide help hint based on state ---
  let helpVisible = false;

  const showHelp = (): void => {
    if (helpVisible) return;
    helpVisible = true;
    helpEl.style.display = 'block';
    requestAnimationFrame(() => {
      helpEl.style.opacity = '1';
    });
  };

  const hideHelp = (): void => {
    if (!helpVisible) return;
    helpVisible = false;
    helpEl.style.opacity = '0';
    setTimeout(() => {
      if (!helpVisible) helpEl.style.display = 'none';
    }, 500);
  };

  stateMachine.onStateChange((newState, oldState) => {
    el.textContent = modeText[newState] ?? '';

    if (oldState === CameraState.DESCENT) {
      // Descent just ended — show help hint after a short delay
      setTimeout(() => showHelp(), 1500);
    }
    if (newState === CameraState.DESCENT) {
      hideHelp();
    }
  });

  // If we're already past descent, show help immediately
  if (stateMachine.getState() !== CameraState.DESCENT) {
    showHelp();
  }

  const dispose = (): void => {
    el.remove();
    helpEl.remove();
    if (keyListener) {
      window.removeEventListener('keydown', keyListener);
    }
  };

  return { dispose };
}
