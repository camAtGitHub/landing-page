import * as THREE from 'three';
import { CameraController } from './state-machine';
import { CONFIG } from '../config';
import { TerrainContext } from '../scene/terrain';

export interface FixedCamControllerOptions {
  domElement: HTMLElement;
  terrain: TerrainContext;
}

const FIXED_CAM_PITCH_MIN = -0.4;
const FIXED_CAM_PITCH_MAX = 0.4;
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

  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  let blinkActive = false;
  let blinkStartTime = 0;
  let blinkStartYaw = 0;
  let blinkStartPitch = 0;
  let blinkStartRadius = 0;
  let blinkTargetYaw = 0;
  let blinkTargetPitch = 0;
  let blinkTargetRadius = 0;

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

  const handleDoubleTap = (clientX: number, clientY: number): void => {
    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const label = hit?.closest('.entry-label') as HTMLElement | null;
    if (!label) return;

    const worldX = Number(label.dataset.worldX);
    const worldZ = Number(label.dataset.worldZ);
    if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) return;

    const worldY = terrain.getHeightAt(worldX, worldZ) + CONFIG.FREE_CAM_HEIGHT_ABOVE_TERRAIN;

    const dx = worldX - focalPoint.x;
    const dz = worldZ - focalPoint.z;
    const dy = worldY - focalPoint.y;

    const horizontalDist = Math.hypot(dx, dz);
    const sphericalDist = Math.hypot(horizontalDist, dy);
    if (sphericalDist < 0.0001) return;

    const targetYaw = Math.atan2(dx, dz);
    const targetPitch = THREE.MathUtils.clamp(Math.asin(dy / sphericalDist), FIXED_CAM_PITCH_MIN, FIXED_CAM_PITCH_MAX);
    const targetRadius = THREE.MathUtils.clamp(
      sphericalDist + 4,
      CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN,
      CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX,
    );

    blinkStartYaw = manualYaw;
    blinkStartPitch = manualPitch;
    blinkStartRadius = currentRadius;

    blinkTargetYaw = targetYaw;
    blinkTargetPitch = targetPitch;
    blinkTargetRadius = targetRadius;

    blinkActive = true;
    blinkStartTime = performance.now();
    clearResumeTimer();
    autoOrbitEnabled = false;
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
    manualPitch = THREE.MathUtils.clamp(manualPitch, FIXED_CAM_PITCH_MIN, FIXED_CAM_PITCH_MAX);
  };

  const onTouchEnd = (e: TouchEvent): void => {
    const changedTouch = e.changedTouches[0];
    if (changedTouch) {
      const now = Date.now();
      const dx = Math.abs(changedTouch.clientX - lastTapX);
      const dy = Math.abs(changedTouch.clientY - lastTapY);
      const isDoubleTap =
        now - lastTapTime < CONFIG.FIXED_CAM_DOUBLE_TAP_MAX_MS &&
        dx < CONFIG.FIXED_CAM_DOUBLE_TAP_MAX_PX &&
        dy < CONFIG.FIXED_CAM_DOUBLE_TAP_MAX_PX;

      lastTapTime = now;
      lastTapX = changedTouch.clientX;
      lastTapY = changedTouch.clientY;

      if (isDoubleTap) {
        handleDoubleTap(changedTouch.clientX, changedTouch.clientY);
        lastTapTime = 0;
      }
    }

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
    manualPitch = THREE.MathUtils.clamp(Math.asin(dy / radius), FIXED_CAM_PITCH_MIN, FIXED_CAM_PITCH_MAX);
    orbitYaw = manualYaw;
    currentRadius = Math.max(
      CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN,
      Math.min(CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX, radius),
    );

    autoOrbitEnabled = true;
    dragActive = false;
    pinchActive = false;
    blinkActive = false;
    clearResumeTimer();

    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    domElement.addEventListener('touchend', onTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', onTouchCancel, { passive: true });
    window.addEventListener('deviceorientation', onDeviceOrientation);
  };

  const deactivate = (): void => {
    dragActive = false;
    pinchActive = false;
    blinkActive = false;
    clearResumeTimer();

    domElement.removeEventListener('touchstart', onTouchStart);
    domElement.removeEventListener('touchmove', onTouchMove);
    domElement.removeEventListener('touchend', onTouchEnd);
    domElement.removeEventListener('touchcancel', onTouchCancel);
    window.removeEventListener('deviceorientation', onDeviceOrientation);
  };

  const update = (camera: THREE.PerspectiveCamera, delta: number, _elapsed: number): void => {
    if (blinkActive) {
      const now = performance.now();
      const t = Math.min(1, (now - blinkStartTime) / CONFIG.FIXED_CAM_BLINK_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      manualYaw = THREE.MathUtils.lerp(blinkStartYaw, blinkTargetYaw, eased);
      manualPitch = THREE.MathUtils.lerp(blinkStartPitch, blinkTargetPitch, eased);
      currentRadius = blinkStartRadius + (blinkTargetRadius - blinkStartRadius) * eased;

      if (t >= 1) {
        blinkActive = false;
        startResumeOrbitTimer();
      }
    } else if (!dragActive && !resumeOrbitTimer && autoOrbitEnabled) {
      orbitYaw += CONFIG.FIXED_CAM_ORBIT_SPEED * delta;
      manualYaw = orbitYaw;
    }

    const yaw = manualYaw + orientationYaw * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.03;
    const pitch = THREE.MathUtils.clamp(
      manualPitch + orientationPitch * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.01,
      FIXED_CAM_PITCH_MIN,
      FIXED_CAM_PITCH_MAX,
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
