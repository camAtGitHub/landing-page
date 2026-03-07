import * as THREE from 'three';
import { CameraState } from '../types';
import { CONFIG } from '../config';

export type CameraController = {
  activate: (camera: THREE.PerspectiveCamera) => void;
  deactivate: () => void;
  update: (camera: THREE.PerspectiveCamera, delta: number, elapsed: number) => void;
  isComplete?: () => boolean;
};

export type StateChangeCallback = (
  newState: CameraState,
  oldState: CameraState,
) => void;

export class CameraStateMachine {
  private camera: THREE.PerspectiveCamera;
  private isMobile: boolean;
  private currentState: CameraState = CameraState.DESCENT;
  private controllers = new Map<CameraState, CameraController>();
  private callbacks: StateChangeCallback[] = [];
  private lastTransitionTime = -Infinity;
  private escapeListener: (e: KeyboardEvent) => void;
  private descentComplete = false;
  private initialized = false;
  private longPressSkipTimer: ReturnType<typeof setTimeout> | null = null;
  private mobileTouchStartListener?: (e: TouchEvent) => void;
  private mobileTouchMoveListener?: (e: TouchEvent) => void;
  private mobileTouchEndListener?: () => void;
  private longPressStartX = 0;
  private longPressStartY = 0;

  constructor(camera: THREE.PerspectiveCamera, isMobile: boolean) {
    this.camera = camera;
    this.isMobile = isMobile;

    this.escapeListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.currentState === CameraState.DESCENT) {
          this.skip();
        } else {
          this.toggle();
        }
      }
    };
    window.addEventListener('keydown', this.escapeListener);

    if (this.isMobile) {
      this.mobileTouchStartListener = (e: TouchEvent): void => {
        if (this.currentState !== CameraState.DESCENT || e.touches.length !== 1) return;
        const touch = e.touches[0];
        this.longPressStartX = touch.clientX;
        this.longPressStartY = touch.clientY;
        this.clearLongPressTimer();
        this.longPressSkipTimer = setTimeout(() => {
          this.skip();
        }, CONFIG.MOBILE_LONG_PRESS_SKIP_MS);
      };

      this.mobileTouchMoveListener = (e: TouchEvent): void => {
        if (!this.longPressSkipTimer || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const drift = Math.hypot(touch.clientX - this.longPressStartX, touch.clientY - this.longPressStartY);
        if (drift > CONFIG.MOBILE_LONG_PRESS_MAX_DRIFT_PX) {
          this.clearLongPressTimer();
        }
      };

      this.mobileTouchEndListener = (): void => {
        this.clearLongPressTimer();
      };

      window.addEventListener('touchstart', this.mobileTouchStartListener, { passive: true });
      window.addEventListener('touchmove', this.mobileTouchMoveListener, { passive: true });
      window.addEventListener('touchend', this.mobileTouchEndListener, { passive: true });
      window.addEventListener('touchcancel', this.mobileTouchEndListener, { passive: true });
    }
  }

  registerController(state: CameraState, controller: CameraController): void {
    this.controllers.set(state, controller);
  }

  onStateChange(callback: StateChangeCallback): void {
    this.callbacks.push(callback);
  }

  getState(): CameraState {
    return this.currentState;
  }

  skip(): void {
    if (this.currentState !== CameraState.DESCENT) return;
    const targetState = this.isMobile ? CameraState.FIXED_CAM : CameraState.FREE_CAM;
    this.transition(targetState);
  }

  toggle(): void {
    if (this.currentState === CameraState.DESCENT) return;
    const targetState =
      this.currentState === CameraState.FREE_CAM
        ? CameraState.FIXED_CAM
        : CameraState.FREE_CAM;
    this.transition(targetState);
  }

  private transition(newState: CameraState): void {
    const now = performance.now();
    if (now - this.lastTransitionTime < CONFIG.STATE_TRANSITION_COOLDOWN_MS) return;

    const targetController = this.controllers.get(newState);
    if (!targetController) {
      console.error(`No controller registered for state: ${newState}`);
      return;
    }

    const oldState = this.currentState;
    const oldController = this.controllers.get(oldState);

    // Activate new controller first (it sets up initial camera position)
    targetController.activate(this.camera);

    // Then deactivate old controller
    if (oldController) {
      oldController.deactivate();
    }

    this.currentState = newState;
    this.lastTransitionTime = now;

    // Fire callbacks after transition is complete
    for (const cb of this.callbacks) {
      cb(newState, oldState);
    }
  }

  update(delta: number, elapsed: number): void {
    const controller = this.controllers.get(this.currentState);
    if (!controller) return;

    if (!this.initialized && this.currentState === CameraState.DESCENT) {
      controller.activate(this.camera);
      this.initialized = true;
    }

    controller.update(this.camera, delta, elapsed);

    // Auto-transition when descent completes
    if (
      this.currentState === CameraState.DESCENT &&
      controller.isComplete?.() &&
      !this.descentComplete
    ) {
      this.descentComplete = true;
      const targetState = this.isMobile ? CameraState.FIXED_CAM : CameraState.FREE_CAM;
      this.transition(targetState);
    }
  }

  private clearLongPressTimer(): void {
    if (!this.longPressSkipTimer) return;
    clearTimeout(this.longPressSkipTimer);
    this.longPressSkipTimer = null;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.escapeListener);
    this.clearLongPressTimer();
    if (this.mobileTouchStartListener) {
      window.removeEventListener('touchstart', this.mobileTouchStartListener);
    }
    if (this.mobileTouchMoveListener) {
      window.removeEventListener('touchmove', this.mobileTouchMoveListener);
    }
    if (this.mobileTouchEndListener) {
      window.removeEventListener('touchend', this.mobileTouchEndListener);
      window.removeEventListener('touchcancel', this.mobileTouchEndListener);
    }
  }
}
