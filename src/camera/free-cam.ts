import * as THREE from 'three';
import { CameraController } from './state-machine';
import { TerrainContext } from '../scene/terrain';
import { CONFIG } from '../config';

export function createFreeCamController(terrain: TerrainContext): CameraController {
  let yaw = 0;
  let pitch = 0;
  let lastMouseX = -1;
  let lastMouseY = -1;
  let blinking = false;
  let blinkStartTime = 0;
  let blinkStartPos = new THREE.Vector3();
  let blinkTargetPos = new THREE.Vector3();
  let targetHeight = CONFIG.TERRAIN_Y_OFFSET + CONFIG.FREE_CAM_HEIGHT_ABOVE_TERRAIN;
  let currentHeight = targetHeight;
  let camera: THREE.PerspectiveCamera | null = null;

  const keys: Record<string, boolean> = {};

  const onMouseMove = (e: MouseEvent): void => {
    if (lastMouseX === -1) {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      return;
    }
    const dx = Math.max(-50, Math.min(50, e.clientX - lastMouseX));
    const dy = Math.max(-50, Math.min(50, e.clientY - lastMouseY));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    yaw -= dx * CONFIG.FREE_CAM_LOOK_SENSITIVITY;
    pitch -= dy * CONFIG.FREE_CAM_LOOK_SENSITIVITY;
    pitch = Math.max(CONFIG.FREE_CAM_PITCH_MIN, Math.min(CONFIG.FREE_CAM_PITCH_MAX, pitch));
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    keys[e.key.toLowerCase()] = true;
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    keys[e.key.toLowerCase()] = false;
  };

  const onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 || blinking) return;

    const target = e.target as HTMLElement;
    if (target && (target.closest('.entry-label') || target.classList.contains('entry-label'))) return;

    if (!camera) return;

    const forward = new THREE.Vector3(
      -Math.sin(yaw),
      0,
      -Math.cos(yaw),
    ).normalize();

    blinkTargetPos = new THREE.Vector3(
      camera.position.x + forward.x * CONFIG.FREE_CAM_BLINK_MAX_DISTANCE,
      camera.position.y,
      camera.position.z + forward.z * CONFIG.FREE_CAM_BLINK_MAX_DISTANCE,
    );

    const dist = Math.sqrt(blinkTargetPos.x ** 2 + blinkTargetPos.z ** 2);
    if (dist > CONFIG.FREE_CAM_TERRAIN_BOUNDARY_RADIUS) {
      const scale = CONFIG.FREE_CAM_TERRAIN_BOUNDARY_RADIUS / dist;
      blinkTargetPos.x *= scale;
      blinkTargetPos.z *= scale;
    }

    blinkStartPos.copy(camera.position);
    blinkStartTime = performance.now();
    blinking = true;
  };

  const activate = (cam: THREE.PerspectiveCamera): void => {
    camera = cam;
    cam.rotation.order = 'YXZ';
    cam.position.set(0, CONFIG.TERRAIN_Y_OFFSET + CONFIG.FREE_CAM_HEIGHT_ABOVE_TERRAIN, 25);
    yaw = Math.PI;
    pitch = 0;
    lastMouseX = -1;
    lastMouseY = -1;
    blinking = false;
    currentHeight = CONFIG.TERRAIN_Y_OFFSET + CONFIG.FREE_CAM_HEIGHT_ABOVE_TERRAIN;
    targetHeight = currentHeight;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
  };

  const deactivate = (): void => {
    camera = null;
    blinking = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousedown', onMouseDown);
  };

  const update = (cam: THREE.PerspectiveCamera, delta: number, _elapsed: number): void => {
    if (blinking) {
      const now = performance.now();
      const t = Math.min(1, (now - blinkStartTime) / CONFIG.FREE_CAM_BLINK_DURATION_MS);
      cam.position.x = blinkStartPos.x + (blinkTargetPos.x - blinkStartPos.x) * t;
      cam.position.z = blinkStartPos.z + (blinkTargetPos.z - blinkStartPos.z) * t;
      if (t >= 1) blinking = false;
    } else {
      if (keys['arrowleft']) {
        yaw += CONFIG.FREE_CAM_ARROW_LOOK_SPEED * delta;
      }
      if (keys['arrowright']) {
        yaw -= CONFIG.FREE_CAM_ARROW_LOOK_SPEED * delta;
      }

      const speed = CONFIG.FREE_CAM_MOVE_SPEED * delta;
      const fw = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

      if (keys['w'] || keys['arrowup']) {
        cam.position.x += fw.x * speed;
        cam.position.z += fw.z * speed;
      }
      if (keys['s'] || keys['arrowdown']) {
        cam.position.x -= fw.x * speed;
        cam.position.z -= fw.z * speed;
      }
      if (keys['a']) {
        cam.position.x -= right.x * speed;
        cam.position.z -= right.z * speed;
      }
      if (keys['d']) {
        cam.position.x += right.x * speed;
        cam.position.z += right.z * speed;
      }
    }

    const distFromOrigin = Math.sqrt(cam.position.x ** 2 + cam.position.z ** 2);
    if (distFromOrigin > CONFIG.FREE_CAM_TERRAIN_BOUNDARY_RADIUS) {
      const pushFactor = 0.9;
      cam.position.x *= pushFactor;
      cam.position.z *= pushFactor;
    }

    const terrainY = terrain.getHeightAt(cam.position.x, cam.position.z);
    targetHeight = terrainY + CONFIG.FREE_CAM_HEIGHT_ABOVE_TERRAIN;
    currentHeight += (targetHeight - currentHeight) * Math.min(1, delta * 8);
    cam.position.y = currentHeight;

    cam.rotation.order = 'YXZ';
    cam.rotation.y = yaw;
    cam.rotation.x = pitch;
  };

  return { activate, deactivate, update };
}
