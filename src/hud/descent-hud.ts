import { CameraStateMachine } from '../camera/state-machine';
import { CameraState } from '../types';
import { CONFIG } from '../config';

export interface DescentHUD {
  update: (progress: number) => void;
  dispose: () => void;
}

export function createDescentHUD(stateMachine: CameraStateMachine): DescentHUD {
  const hud = document.getElementById('hud');
  if (!hud) return { update: () => {}, dispose: () => {} };

  const style = document.createElement('style');
  style.textContent = `
    .hud-corner {
      position: absolute;
      pointer-events: none;
    }
    .hud-corner-tl {
      top: 24px;
      left: 24px;
      border-top: 1px solid rgba(0, 255, 200, 0.2);
      border-left: 1px solid rgba(0, 255, 200, 0.2);
      width: 60px;
      height: 60px;
    }
    .hud-corner-br {
      bottom: 24px;
      right: 24px;
      border-bottom: 1px solid rgba(0, 255, 200, 0.2);
      border-right: 1px solid rgba(0, 255, 200, 0.2);
      width: 60px;
      height: 60px;
    }
    .hud-telemetry {
      position: absolute;
      bottom: 80px;
      left: 24px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      letter-spacing: 2px;
      color: rgba(0, 255, 200, 0.4);
      pointer-events: none;
      line-height: 1.8;
    }
    .hud-scanline {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(0, 255, 200, 0.08);
      pointer-events: none;
    }
    .hud-wrapper {
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'hud-wrapper';
  wrapper.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none;';

  const cornerTL = document.createElement('div');
  cornerTL.className = 'hud-corner hud-corner-tl';

  const cornerBR = document.createElement('div');
  cornerBR.className = 'hud-corner hud-corner-br';

  const telemetry = document.createElement('div');
  telemetry.className = 'hud-telemetry';
  telemetry.innerHTML = 'ALT 300.00<br>VEL  0.00';

  const scanline = document.createElement('div');
  scanline.className = 'hud-scanline';
  scanline.style.top = '0%';

  wrapper.appendChild(cornerTL);
  wrapper.appendChild(cornerBR);
  wrapper.appendChild(telemetry);
  wrapper.appendChild(scanline);
  hud.appendChild(wrapper);

  let visible = false;
  let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  const show = (): void => {
    if (fadeTimeout) clearTimeout(fadeTimeout);
    wrapper.style.display = 'block';
    requestAnimationFrame(() => {
      wrapper.style.opacity = '1';
    });
    visible = true;
  };

  const hide = (): void => {
    wrapper.style.opacity = '0';
    fadeTimeout = setTimeout(() => {
      wrapper.style.display = 'none';
    }, CONFIG.HUD_FADE_OUT_DURATION_MS);
    visible = false;
  };

  const update = (progress: number): void => {
    if (!visible) return;
    const p = Math.max(0, Math.min(1, progress));

    const alt = 300 * (1 - p);
    const vel = Math.sin(p * Math.PI) * 50;

    telemetry.innerHTML = `ALT ${alt.toFixed(2).padStart(6, ' ')}<br>VEL ${vel.toFixed(2).padStart(5, ' ')}`;

    // Scan line moves top to bottom over descent duration
    scanline.style.top = `${p * 100}%`;
  };

  const dispose = (): void => {
    if (fadeTimeout) clearTimeout(fadeTimeout);
    wrapper.remove();
    style.remove();
  };

  // Subscribe to state changes
  stateMachine.onStateChange((newState, oldState) => {
    if (newState === CameraState.DESCENT) {
      show();
    } else if (oldState === CameraState.DESCENT) {
      hide();
    }
  });

  // Show immediately if we start in descent (which we do)
  if (stateMachine.getState() === CameraState.DESCENT) {
    fadeTimeout = setTimeout(() => show(), CONFIG.HUD_FADE_IN_DURATION_MS);
  }

  return { update, dispose };
}
