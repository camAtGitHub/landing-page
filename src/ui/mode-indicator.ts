import { CameraStateMachine } from '../camera/state-machine';
import { CameraState } from '../types';

export interface ModeIndicator {
  dispose: () => void;
}

const MODE_TEXT: Record<CameraState, string> = {
  [CameraState.DESCENT]: 'ESC to skip',
  [CameraState.FREE_CAM]: 'WASD move · click blink · ESC simple view',
  [CameraState.FIXED_CAM]: 'ESC free camera',
};

export function createModeIndicator(stateMachine: CameraStateMachine): ModeIndicator {
  const ui = document.getElementById('ui');
  if (!ui) return { dispose: () => {} };

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
  el.textContent = MODE_TEXT[stateMachine.getState()];
  ui.appendChild(el);

  stateMachine.onStateChange((newState) => {
    el.textContent = MODE_TEXT[newState] ?? '';
  });

  const dispose = (): void => {
    el.remove();
  };

  return { dispose };
}
