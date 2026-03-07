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

const MOBILE_SKIP_HOLD_MS = 2500;
const MOBILE_SKIP_MOVE_PX = 18;

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

  private mobileHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private mobileHoldTouchId: number | null = null;
  private mobileHoldStartX = 0;
  private mobileHoldStartY = 0;
  private touchStartListener?: (e: TouchEvent) => void;
  private touchMoveListener?: (e: TouchEvent) => void;
  private touchEndListener?: () => void;
  private touchCancelListener?: () => void;

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
      this.touchStartListener = (e: TouchEvent) => {
        if (this.currentState !== CameraState.DESCENT || e.touches.length !== 1) return;

        this.cancelMobileHold();
        const touch = e.touches[0];
        this.mobileHoldTouchId = touch.identifier;
        this.mobileHoldStartX = touch.clientX;
        this.mobileHoldStartY = touch.clientY;

        this.mobileHoldTimer = setTimeout(() => {
          this.mobileHoldTimer = null;
          this.mobileHoldTouchId = null;
          this.skip();
        }, MOBILE_SKIP_HOLD_MS);
      };

      this.touchMoveListener = (e: TouchEvent) => {
        if (this.currentState !== CameraState.DESCENT || this.mobileHoldTouchId === null) return;
        if (e.touches.length !== 1) {
          this.cancelMobileHold();
          return;
        }

        const touch = e.touches[0];
        if (touch.identifier !== this.mobileHoldTouchId) {
          this.cancelMobileHold();
          return;
        }

        const dx = touch.clientX - this.mobileHoldStartX;
        const dy = touch.clientY - this.mobileHoldStartY;
        if (Math.hypot(dx, dy) > MOBILE_SKIP_MOVE_PX) {
          this.cancelMobileHold();
        }
      };

      this.touchEndListener = () => {
        this.cancelMobileHold();
      };

      this.touchCancelListener = () => {
        this.cancelMobileHold();
      };

      window.addEventListener('touchstart', this.touchStartListener, { passive: true });
      window.addEventListener('touchmove', this.touchMoveListener, { passive: true });
      window.addEventListener('touchend', this.touchEndListener, { passive: true });
      window.addEventListener('touchcancel', this.touchCancelListener, { passive: true });
    }
  }

  private cancelMobileHold(): void {
    if (this.mobileHoldTimer) {
      clearTimeout(this.mobileHoldTimer);
      this.mobileHoldTimer = null;
    }
    this.mobileHoldTouchId = null;
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

    targetController.activate(this.camera);

    if (oldController) {
      oldController.deactivate();
    }

    this.currentState = newState;
    this.lastTransitionTime = now;
    this.cancelMobileHold();

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

  dispose(): void {
    window.removeEventListener('keydown', this.escapeListener);
    this.cancelMobileHold();

    if (this.touchStartListener) {
      window.removeEventListener('touchstart', this.touchStartListener);
    }
    if (this.touchMoveListener) {
      window.removeEventListener('touchmove', this.touchMoveListener);
    }
    if (this.touchEndListener) {
      window.removeEventListener('touchend', this.touchEndListener);
    }
    if (this.touchCancelListener) {
      window.removeEventListener('touchcancel', this.touchCancelListener);
    }
  }
}
