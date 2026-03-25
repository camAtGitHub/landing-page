import * as THREE from 'three';
import { CameraController } from './state-machine';
import { CONFIG } from '../config';
import { TerrainContext } from '../scene/terrain';

export interface FixedCamControllerOptions {
  domElement: HTMLElement;
  terrain: TerrainContext;
}

const FIXED_CAM_MIN_CAMERA_CLEARANCE = 3;

export function createFixedCamController(options: FixedCamControllerOptions): CameraController {
  const { domElement, terrain } = options;

  const focalPoint = new THREE.Vector3(0, CONFIG.TERRAIN_Y_OFFSET + 5, 0);

  let orbitYaw = 0;
  let autoOrbitEnabled = true;

  let dragActive = false;
  let dragLastX = 0;
  let dragLastY = 0;
  let manualYaw = 0;
  let manualPitch = 0;
  let resumeOrbitTimer: ReturnType<typeof setTimeout> | null = null;

  let pinchActive = false;
  let pinchLastDist = 0;
  let currentRadius: number = CONFIG.FIXED_CAM_ORBIT_RADIUS;

  let orientationYaw = 0;
  let orientationPitch = 0;

  const clearResumeTimer = (): void => {
    if (resumeOrbitTimer) {
      clearTimeout(resumeOrbitTimer);
      resumeOrbitTimer = null;
    }
  };

  const startResumeOrbitTimer = (): void => {
    clearResumeTimer();
    autoOrbitEnabled = false;
    resumeOrbitTimer = setTimeout(() => {
      orbitYaw = manualYaw;
      autoOrbitEnabled = true;
      resumeOrbitTimer = null;
    }, CONFIG.FIXED_CAM_RESUME_ORBIT_DELAY);
  };

  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY,
    );
  };

  const onDeviceOrientation = (e: DeviceOrientationEvent): void => {
    const gamma = THREE.MathUtils.clamp(e.gamma ?? 0, -45, 45);
    const beta = THREE.MathUtils.clamp(e.beta ?? 0, -45, 45);
    orientationYaw = gamma / 45;
    orientationPitch = beta / 45;
  };

  const onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      pinchActive = true;
      pinchLastDist = getTouchDistance(e.touches);
      dragActive = false;
      clearResumeTimer();
      autoOrbitEnabled = false;
      return;
    }

    if (e.touches.length === 1) {
      dragActive = true;
      pinchActive = false;
      dragLastX = e.touches[0].clientX;
      dragLastY = e.touches[0].clientY;
      clearResumeTimer();
      autoOrbitEnabled = false;
    }
  };

  const onTouchMove = (e: TouchEvent): void => {
    // Prevent browser zoom/scroll when pinching inside the 3D view
    if (e.touches.length >= 2) {
      e.preventDefault();
    }

    if (pinchActive && e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const delta = pinchLastDist - dist;
      pinchLastDist = dist;

      currentRadius += delta * CONFIG.FIXED_CAM_PINCH_SENSITIVITY;
      currentRadius = Math.max(
        CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN,
        Math.min(CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX, currentRadius),
      );
      return;
    }

    if (!dragActive || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - dragLastX;
    const dy = touch.clientY - dragLastY;

    dragLastX = touch.clientX;
    dragLastY = touch.clientY;

    manualYaw += dx * CONFIG.FIXED_CAM_DRAG_SENSITIVITY;
    manualPitch -= dy * CONFIG.FIXED_CAM_DRAG_SENSITIVITY;
    manualPitch = THREE.MathUtils.clamp(manualPitch, CONFIG.FIXED_CAM_PITCH_MIN, CONFIG.FIXED_CAM_PITCH_MAX);
  };

  const onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      pinchActive = true;
      dragActive = false;
      pinchLastDist = getTouchDistance(e.touches);
      return;
    }

    if (e.touches.length === 1) {
      pinchActive = false;
      dragActive = true;
      dragLastX = e.touches[0].clientX;
      dragLastY = e.touches[0].clientY;
      clearResumeTimer();
      autoOrbitEnabled = false;
      return;
    }

    pinchActive = false;
    if (dragActive) {
      dragActive = false;
      startResumeOrbitTimer();
    }
  };

  const onTouchCancel = (): void => {
    pinchActive = false;
    if (dragActive) {
      dragActive = false;
      startResumeOrbitTimer();
    }
  };

  const activate = (camera: THREE.PerspectiveCamera): void => {
    camera.rotation.order = 'YXZ';

    const dx = camera.position.x - focalPoint.x;
    const dz = camera.position.z - focalPoint.z;
    const dy = camera.position.y - focalPoint.y;
    const horizontal = Math.hypot(dx, dz);
    const radius = Math.max(0.001, Math.hypot(horizontal, dy));

    manualYaw = Math.atan2(dx, dz);
    manualPitch = THREE.MathUtils.clamp(Math.asin(dy / radius), CONFIG.FIXED_CAM_PITCH_MIN, CONFIG.FIXED_CAM_PITCH_MAX);
    orbitYaw = manualYaw;
    currentRadius = Math.max(
      CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN,
      Math.min(CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX, radius),
    );

    autoOrbitEnabled = true;
    dragActive = false;
    pinchActive = false;
    clearResumeTimer();

    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    // passive: false is critical — allows e.preventDefault() to block browser pinch-zoom
    domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    domElement.addEventListener('touchend', onTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', onTouchCancel, { passive: true });
    window.addEventListener('deviceorientation', onDeviceOrientation);
  };

  const deactivate = (): void => {
    dragActive = false;
    pinchActive = false;
    clearResumeTimer();

    domElement.removeEventListener('touchstart', onTouchStart);
    domElement.removeEventListener('touchmove', onTouchMove);
    domElement.removeEventListener('touchend', onTouchEnd);
    domElement.removeEventListener('touchcancel', onTouchCancel);
    window.removeEventListener('deviceorientation', onDeviceOrientation);
  };

  const update = (camera: THREE.PerspectiveCamera, delta: number, _elapsed: number): void => {
    if (!dragActive && !resumeOrbitTimer && autoOrbitEnabled) {
      orbitYaw += CONFIG.FIXED_CAM_ORBIT_SPEED * delta;
      manualYaw = orbitYaw;
    }

    const yaw = manualYaw + orientationYaw * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.03;
    const pitch = THREE.MathUtils.clamp(
      manualPitch + orientationPitch * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.01,
      CONFIG.FIXED_CAM_PITCH_MIN,
      CONFIG.FIXED_CAM_PITCH_MAX,
    );

    camera.position.x = focalPoint.x + currentRadius * Math.cos(pitch) * Math.sin(yaw);
    camera.position.y = focalPoint.y + currentRadius * Math.sin(pitch);
    camera.position.z = focalPoint.z + currentRadius * Math.cos(pitch) * Math.cos(yaw);

    const terrainHeight = terrain.getHeightAt(camera.position.x, camera.position.z);
    if (camera.position.y < terrainHeight + FIXED_CAM_MIN_CAMERA_CLEARANCE) {
      camera.position.y = terrainHeight + FIXED_CAM_MIN_CAMERA_CLEARANCE;
    }

    camera.lookAt(focalPoint);
  };

  return { activate, deactivate, update };
}
