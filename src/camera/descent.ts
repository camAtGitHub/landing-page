import * as THREE from 'three';
import { CameraController } from './state-machine';
import { SkyContext } from '../scene/sky';
import { CONFIG } from '../config';

export interface DescentControllerOptions {
  sky: SkyContext;
  scene: THREE.Scene;
  fog: THREE.FogExp2;
}

export interface DescentController extends CameraController {
  getProgress: () => number;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function createDescentController(
  options: DescentControllerOptions,
): DescentController {
  const { sky, scene, fog } = options;
  void scene; // scene reference kept for future fog access

  let progress = 0;
  let mouseX = 0;
  let mouseY = 0;
  let active = false;
  const initialFogDensity = fog.density;

  const mouseMoveListener = (e: MouseEvent): void => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  };

  const activate = (camera: THREE.PerspectiveCamera): void => {
    progress = 0;
    active = true;
    mouseX = 0;
    mouseY = 0;

    camera.position.set(0, CONFIG.DESCENT_START_Y, 0);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(-Math.PI / 8, 0, 0);

    sky.starMaterial.opacity = 1.0;
    fog.density = initialFogDensity;

    document.addEventListener('mousemove', mouseMoveListener);
  };

  const deactivate = (): void => {
    sky.fadeNebulae(1);
    active = false;
    document.removeEventListener('mousemove', mouseMoveListener);
  };

  const update = (camera: THREE.PerspectiveCamera, delta: number, _elapsed: number): void => {
    if (!active) return;

    const clampedDelta = Math.min(delta, CONFIG.DESCENT_MAX_DELTA_SECONDS);
    progress = Math.min(1, progress + clampedDelta / CONFIG.DESCENT_DURATION_SECONDS);

    const easedProgress = easeInOutQuad(progress);

    // Camera Y position
    const startY = CONFIG.DESCENT_START_Y;
    const endY = CONFIG.DESCENT_END_Y;
    const targetY = startY + (endY - startY) * easedProgress;
    camera.position.y = targetY;

    // Camera Z drift toward landing zone
    camera.position.z = progress * 25;

    // Mouse influence decreases as descent progresses
    const mouseInfluence = (1 - progress) * 5;
    camera.position.x = Math.max(-20, Math.min(20, mouseX * mouseInfluence));

    // Camera rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseX * (1 - progress) * 0.1;
    camera.rotation.x = -Math.PI / 8 + mouseY * (1 - progress) * 0.05;

    // Star warp - speed follows sin bell curve
    const warpSpeed = Math.sin(progress * Math.PI) * 8;
    const posArr = sky.starPositions.array as Float32Array;
    const topBound = CONFIG.DESCENT_START_Y + 100;
    const bottomBound = CONFIG.DESCENT_END_Y - 100;

    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
      const i3 = i * 3;
      posArr[i3 + 1] -= warpSpeed * sky.starSpeeds[i] * clampedDelta * 60;

      if (posArr[i3 + 1] < bottomBound) {
        posArr[i3 + 1] = topBound;
      }
    }
    sky.starPositions.needsUpdate = true;

    // Star opacity fades
    sky.starMaterial.opacity = Math.max(0.1, 1.0 - progress * 0.9);
    sky.fadeNebulae(progress);

    // Fog density increases
    fog.density = initialFogDensity + progress * 0.006;
  };

  const isComplete = (): boolean => progress >= 1.0;
  const getProgress = (): number => Math.min(1, Math.max(0, progress));

  return { activate, deactivate, update, isComplete, getProgress };
}
