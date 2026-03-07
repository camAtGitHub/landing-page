import { CameraStateMachine } from '../camera/state-machine';
import { CameraState } from '../types';

export interface ModeIndicator {
  dispose: () => void;
}

const DESKTOP_MODE_TEXT: Record<CameraState, string> = {
  [CameraState.DESCENT]: 'ESC to skip',
  [CameraState.FREE_CAM]: 'WASD move · click blink · ESC simple view',
  [CameraState.FIXED_CAM]: 'ESC free camera',
};

const MOBILE_MODE_TEXT: Record<CameraState, string> = {
  [CameraState.DESCENT]: 'Hold 2.5s to skip',
  [CameraState.FREE_CAM]: 'Swipe look · tap labels · simple view available',
  [CameraState.FIXED_CAM]: 'Drag orbit · pinch zoom · double tap label blink',
};

export function createModeIndicator(
  stateMachine: CameraStateMachine,
  isMobile: boolean,
): ModeIndicator {
  const ui = document.getElementById('ui');
  if (!ui) return { dispose: () => {} };

  const modeText = isMobile ? MOBILE_MODE_TEXT : DESKTOP_MODE_TEXT;

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

  stateMachine.onStateChange((newState) => {
    el.textContent = modeText[newState] ?? '';
  });

  const dispose = (): void => {
    el.remove();
  };

  return { dispose };
}
