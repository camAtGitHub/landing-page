import * as THREE from 'three';
import { CameraController } from './state-machine';
import { CONFIG } from '../config';

export function createFixedCamController(): CameraController {
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  const onMouseMove = (e: MouseEvent): void => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  const onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    targetMouseX = (touch.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -((touch.clientY / window.innerHeight) * 2 - 1);
  };

  const activate = (camera: THREE.PerspectiveCamera): void => {
    camera.rotation.order = 'YXZ';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
  };

  const deactivate = (): void => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('touchmove', onTouchMove);
  };

  const update = (camera: THREE.PerspectiveCamera, _delta: number, elapsed: number): void => {
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    const orbitX = Math.sin(elapsed * CONFIG.FIXED_CAM_ORBIT_SPEED) * CONFIG.FIXED_CAM_ORBIT_RADIUS;
    const orbitZ = Math.cos(elapsed * CONFIG.FIXED_CAM_ORBIT_SPEED) * CONFIG.FIXED_CAM_ORBIT_RADIUS;

    camera.position.x = orbitX + mouseX * CONFIG.FIXED_CAM_PARALLAX_STRENGTH;
    camera.position.y = CONFIG.FIXED_CAM_HEIGHT + mouseY * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.5;
    camera.position.z = orbitZ;

    camera.lookAt(0, CONFIG.TERRAIN_Y_OFFSET + 5, 0);
  };

  return { activate, deactivate, update };
}
