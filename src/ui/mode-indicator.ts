import { CameraStateMachine } from '../camera/state-machine';
import { CameraState } from '../types';
import { CONFIG } from '../config';

export interface ModeIndicator {
  dispose: () => void;
}

function getModeText(state: CameraState, isMobile: boolean): string {
  if (state === CameraState.DESCENT) {
    return isMobile ? 'Hold 2.5s to skip landing' : 'ESC to skip';
  }
  if (state === CameraState.FREE_CAM) {
    return 'WASD move · click blink · ESC simple view';
  }
  return isMobile
    ? 'Drag orbit · pinch zoom · double-tap label blink'
    : 'ESC free camera';
}

export function createModeIndicator(stateMachine: CameraStateMachine): ModeIndicator {
  const ui = document.getElementById('ui');
  if (!ui) return { dispose: () => {} };

  const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT_PX;

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
  el.textContent = getModeText(stateMachine.getState(), isMobile);
  ui.appendChild(el);

  stateMachine.onStateChange((newState) => {
    el.textContent = getModeText(newState, isMobile);
  });

  const dispose = (): void => {
    el.remove();
  };

  return { dispose };
}
