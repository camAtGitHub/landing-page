import * as THREE from 'three';
import { CameraController } from './state-machine';
import { CONFIG } from '../config';
import { TerrainContext } from '../scene/terrain';

export interface FixedCamControllerOptions {
  domElement: HTMLElement;
  terrain: TerrainContext;
  isMobile: boolean;
}

const FIXED_CAM_MIN_CAMERA_CLEARANCE = 3;

/**
 * Compute a zoom-linked pitch bias (desktop only).
 * Far out = birds-eye (high pitch), zoomed in = more level (low pitch).
 */
function getZoomPitchBias(radius: number): number {
  const t = (radius - CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN) /
            (CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX - CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN);
  const clamped = Math.max(0, Math.min(1, t));
  return CONFIG.FIXED_CAM_ZOOM_PITCH_CLOSE + clamped * (CONFIG.FIXED_CAM_ZOOM_PITCH_FAR - CONFIG.FIXED_CAM_ZOOM_PITCH_CLOSE);
}

export function createFixedCamController(options: FixedCamControllerOptions): CameraController {
  const { domElement, terrain, isMobile } = options;

  const focalPoint = new THREE.Vector3(0, CONFIG.TERRAIN_Y_OFFSET + 5, 0);

  let orbitYaw = 0;
  let autoOrbitEnabled = true;

  let dragActive = false;
  let dragLastX = 0;
  let dragLastY = 0;
  let manualYaw = 0;
  // On mobile: manualPitch is the full pitch value (drag-controlled).
  // On desktop: manualPitch is an offset added to the zoom-linked base pitch.
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

  const clampRadius = (r: number): number =>
    Math.max(CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN, Math.min(CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX, r));

  // === Touch handlers (mobile) ===

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
    if (e.touches.length >= 2) {
      e.preventDefault();
    }

    if (pinchActive && e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const delta = pinchLastDist - dist;
      pinchLastDist = dist;

      currentRadius = clampRadius(currentRadius + delta * CONFIG.FIXED_CAM_PINCH_SENSITIVITY);
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

  // === Mouse handlers (desktop) ===

  const onMouseDown = (e: MouseEvent): void => {
    // Only left button (0) or middle button (1) for drag
    if (e.button !== 0 && e.button !== 1) return;

    // Don't intercept label clicks
    const target = e.target as HTMLElement;
    if (target && (target.closest('.entry-label') || target.classList.contains('entry-label'))) return;

    dragActive = true;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    clearResumeTimer();
    autoOrbitEnabled = false;
  };

  const onMouseMove = (e: MouseEvent): void => {
    if (!dragActive) return;

    const dx = e.clientX - dragLastX;
    const dy = e.clientY - dragLastY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;

    manualYaw += dx * CONFIG.FIXED_CAM_DRAG_SENSITIVITY;
    // On desktop, manualPitch is an offset from the zoom-linked base
    manualPitch -= dy * CONFIG.FIXED_CAM_DRAG_SENSITIVITY;
    // Clamp the offset so total pitch stays in range (checked in update loop)
    manualPitch = THREE.MathUtils.clamp(manualPitch, -1.5, 1.5);
  };

  const onMouseUp = (): void => {
    if (dragActive) {
      dragActive = false;
      startResumeOrbitTimer();
    }
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    // deltaY > 0 = scroll down = zoom out (increase radius)
    // deltaY < 0 = scroll up = zoom in (decrease radius)
    const delta = e.deltaY > 0 ? CONFIG.FIXED_CAM_SCROLL_SENSITIVITY : -CONFIG.FIXED_CAM_SCROLL_SENSITIVITY;
    currentRadius = clampRadius(currentRadius + delta);

    clearResumeTimer();
    autoOrbitEnabled = false;
    startResumeOrbitTimer();
  };

  // === Lifecycle ===

  const activate = (camera: THREE.PerspectiveCamera): void => {
    camera.rotation.order = 'YXZ';

    if (isMobile) {
      // Mobile: derive state from current camera position
      const dx = camera.position.x - focalPoint.x;
      const dz = camera.position.z - focalPoint.z;
      const dy = camera.position.y - focalPoint.y;
      const horizontal = Math.hypot(dx, dz);
      const radius = Math.max(0.001, Math.hypot(horizontal, dy));

      manualYaw = Math.atan2(dx, dz);
      manualPitch = THREE.MathUtils.clamp(Math.asin(dy / radius), CONFIG.FIXED_CAM_PITCH_MIN, CONFIG.FIXED_CAM_PITCH_MAX);
      orbitYaw = manualYaw;
      currentRadius = clampRadius(radius);
    } else {
      // Desktop: birds-eye default at max downward angle
      const dx = camera.position.x - focalPoint.x;
      const dz = camera.position.z - focalPoint.z;
      manualYaw = Math.atan2(dx, dz);
      orbitYaw = manualYaw;
      currentRadius = CONFIG.FIXED_CAM_DESKTOP_DEFAULT_RADIUS;
      // Set manual offset so total pitch = max (highest birds-eye angle)
      const zoomBias = getZoomPitchBias(currentRadius);
      manualPitch = CONFIG.FIXED_CAM_PITCH_MAX - zoomBias;
    }

    autoOrbitEnabled = true;
    dragActive = false;
    pinchActive = false;
    clearResumeTimer();

    if (isMobile) {
      domElement.addEventListener('touchstart', onTouchStart, { passive: true });
      domElement.addEventListener('touchmove', onTouchMove, { passive: false });
      domElement.addEventListener('touchend', onTouchEnd, { passive: true });
      domElement.addEventListener('touchcancel', onTouchCancel, { passive: true });
      window.addEventListener('deviceorientation', onDeviceOrientation);
    } else {
      domElement.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      domElement.addEventListener('wheel', onWheel, { passive: false });
    }
  };

  const deactivate = (): void => {
    dragActive = false;
    pinchActive = false;
    clearResumeTimer();

    if (isMobile) {
      domElement.removeEventListener('touchstart', onTouchStart);
      domElement.removeEventListener('touchmove', onTouchMove);
      domElement.removeEventListener('touchend', onTouchEnd);
      domElement.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('deviceorientation', onDeviceOrientation);
    } else {
      domElement.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
    }
  };

  const update = (camera: THREE.PerspectiveCamera, delta: number, _elapsed: number): void => {
    if (!dragActive && !resumeOrbitTimer && autoOrbitEnabled) {
      orbitYaw += CONFIG.FIXED_CAM_ORBIT_SPEED * delta;
      manualYaw = orbitYaw;
    }

    const yaw = manualYaw + orientationYaw * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.03;

    let pitch: number;
    if (isMobile) {
      // Mobile: manualPitch is the full pitch (direct control)
      pitch = THREE.MathUtils.clamp(
        manualPitch + orientationPitch * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.01,
        CONFIG.FIXED_CAM_PITCH_MIN,
        CONFIG.FIXED_CAM_PITCH_MAX,
      );
    } else {
      // Desktop: pitch = zoom-linked base + manual offset
      const zoomBias = getZoomPitchBias(currentRadius);
      pitch = THREE.MathUtils.clamp(
        zoomBias + manualPitch,
        CONFIG.FIXED_CAM_PITCH_MIN,
        CONFIG.FIXED_CAM_PITCH_MAX,
      );
    }

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
