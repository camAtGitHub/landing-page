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

  private initializeCurrentController(): void {
    if (this.initialized) return;

    const controller = this.controllers.get(this.currentState);
    if (!controller) return;

    controller.activate(this.camera);
    this.initialized = true;
  }

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
  }

  registerController(state: CameraState, controller: CameraController): void {
    this.controllers.set(state, controller);
    this.initializeCurrentController();
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
    this.initializeCurrentController();

    const controller = this.controllers.get(this.currentState);
    if (!controller) return;

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

  dispose(): void {
    window.removeEventListener('keydown', this.escapeListener);
  }
}
