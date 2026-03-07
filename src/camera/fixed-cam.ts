import * as THREE from 'three';
import { CameraController } from './state-machine';
import { CONFIG } from '../config';
import { TerrainContext } from '../scene/terrain';

export function createFixedCamController(
  terrain: TerrainContext,
  domElement: HTMLElement,
): CameraController {
  const focalPoint = new THREE.Vector3(0, CONFIG.TERRAIN_Y_OFFSET + 5, 0);

  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  let orbitYaw = 0;
  let manualYaw = 0;
  let manualPitch = 0;
  let dragActive = false;
  let dragLastX = 0;
  let dragLastY = 0;
  let resumeOrbitTimer: ReturnType<typeof setTimeout> | null = null;
  let autoOrbitEnabled = true;

  let pinchActive = false;
  let pinchLastDist = 0;
  let currentRadius: number = CONFIG.FIXED_CAM_ORBIT_RADIUS;

  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let blinkActive = false;
  let blinkStartTime = 0;
  let blinkFromYaw = 0;
  let blinkToYaw = 0;
  let blinkFromPitch = 0;
  let blinkToPitch = 0;
  let blinkFromRadius: number = currentRadius;
  let blinkToRadius: number = currentRadius;

  const blinkLookAt = new THREE.Vector3().copy(focalPoint);

  const cancelResumeTimer = (): void => {
    if (!resumeOrbitTimer) return;
    clearTimeout(resumeOrbitTimer);
    resumeOrbitTimer = null;
  };

  const scheduleOrbitResume = (): void => {
    cancelResumeTimer();
    autoOrbitEnabled = false;
    resumeOrbitTimer = setTimeout(() => {
      orbitYaw = manualYaw;
      autoOrbitEnabled = true;
      resumeOrbitTimer = null;
    }, CONFIG.FIXED_CAM_RESUME_ORBIT_DELAY);
  };

  const toSpherical = (position: THREE.Vector3): { yaw: number; pitch: number; radius: number } => {
    const offset = position.clone().sub(focalPoint);
    const radius = Math.max(offset.length(), CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN);
    const yaw = Math.atan2(offset.x, offset.z);
    const pitch = Math.asin(THREE.MathUtils.clamp(offset.y / radius, -1, 1));
    return { yaw, pitch, radius };
  };

  const onMouseMove = (e: MouseEvent): void => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  const onDeviceOrientation = (e: DeviceOrientationEvent): void => {
    const gamma = e.gamma ?? 0;
    const beta = e.beta ?? 0;
    targetMouseX = THREE.MathUtils.clamp(gamma / 45, -1, 1);
    targetMouseY = THREE.MathUtils.clamp((beta - 45) / 45, -1, 1);
  };

  const handleDoubleTap = (clientX: number, clientY: number): void => {
    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const label = hit?.closest('.entry-label') as HTMLElement | null;
    if (!label) return;

    const worldX = Number(label.dataset.worldX);
    const worldY = Number(label.dataset.worldY);
    const worldZ = Number(label.dataset.worldZ);
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY) || !Number.isFinite(worldZ)) {
      return;
    }

    const lookPos = new THREE.Vector3(worldX, worldY + 1.5, worldZ);
    const outward = new THREE.Vector3(worldX - focalPoint.x, 0, worldZ - focalPoint.z);
    if (outward.lengthSq() < 1e-4) {
      outward.set(0, 0, 1);
    }
    outward.normalize();

    const desiredRadius = THREE.MathUtils.clamp(
      outward.length() * 0.5 + 18,
      CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN,
      CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX,
    );
    const targetX = lookPos.x + outward.x * desiredRadius;
    const targetZ = lookPos.z + outward.z * desiredRadius;
    const terrainY = terrain.getHeightAt(targetX, targetZ);
    const targetY = Math.max(
      lookPos.y + 3,
      terrainY + CONFIG.FIXED_CAM_MIN_CAMERA_CLEARANCE,
    );

    const spherical = toSpherical(new THREE.Vector3(targetX, targetY, targetZ));

    blinkLookAt.copy(lookPos);
    blinkFromYaw = manualYaw;
    blinkToYaw = spherical.yaw;
    blinkFromPitch = manualPitch;
    blinkToPitch = THREE.MathUtils.clamp(spherical.pitch, -0.4, 0.4);
    blinkFromRadius = currentRadius;
    blinkToRadius = THREE.MathUtils.clamp(spherical.radius, CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN, CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX);

    blinkStartTime = performance.now();
    blinkActive = true;
    autoOrbitEnabled = false;
    cancelResumeTimer();
  };

  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY,
    );
  };

  const onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      pinchActive = true;
      dragActive = false;
      pinchLastDist = getTouchDistance(e.touches);
      cancelResumeTimer();
      autoOrbitEnabled = false;
      return;
    }

    if (e.touches.length === 1) {
      dragActive = true;
      pinchActive = false;
      const touch = e.touches[0];
      dragLastX = touch.clientX;
      dragLastY = touch.clientY;
      cancelResumeTimer();
      autoOrbitEnabled = false;
    }
  };

  const onTouchMove = (e: TouchEvent): void => {
    if (pinchActive && e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const delta = pinchLastDist - dist;
      currentRadius += delta * CONFIG.FIXED_CAM_PINCH_SENSITIVITY;
      currentRadius = THREE.MathUtils.clamp(
        currentRadius,
        CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN,
        CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX,
      );
      pinchLastDist = dist;
      e.preventDefault();
      return;
    }

    if (!dragActive || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - dragLastX;
    const dy = touch.clientY - dragLastY;

    manualYaw += dx * CONFIG.FIXED_CAM_DRAG_SENSITIVITY;
    manualPitch -= dy * CONFIG.FIXED_CAM_DRAG_SENSITIVITY;
    manualPitch = THREE.MathUtils.clamp(manualPitch, -0.4, 0.4);

    dragLastX = touch.clientX;
    dragLastY = touch.clientY;
    e.preventDefault();
  };

  const onTouchEnd = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    if (touch) {
      const now = Date.now();
      const dx = Math.abs(touch.clientX - lastTapX);
      const dy = Math.abs(touch.clientY - lastTapY);
      if (
        now - lastTapTime <= CONFIG.FIXED_CAM_DOUBLE_TAP_MAX_MS &&
        dx <= CONFIG.FIXED_CAM_DOUBLE_TAP_MAX_PX &&
        dy <= CONFIG.FIXED_CAM_DOUBLE_TAP_MAX_PX
      ) {
        handleDoubleTap(touch.clientX, touch.clientY);
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    }

    if (e.touches.length < 2) {
      pinchActive = false;
    }

    if (e.touches.length === 1) {
      const remaining = e.touches[0];
      dragActive = true;
      dragLastX = remaining.clientX;
      dragLastY = remaining.clientY;
      autoOrbitEnabled = false;
      return;
    }

    if (e.touches.length === 0) {
      dragActive = false;
      scheduleOrbitResume();
    }
  };

  const activate = (camera: THREE.PerspectiveCamera): void => {
    camera.rotation.order = 'YXZ';

    const initial = toSpherical(camera.position);
    orbitYaw = initial.yaw;
    manualYaw = initial.yaw;
    manualPitch = THREE.MathUtils.clamp(initial.pitch, -0.4, 0.4);
    currentRadius = THREE.MathUtils.clamp(initial.radius, CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN, CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX);

    autoOrbitEnabled = true;
    dragActive = false;
    pinchActive = false;
    blinkActive = false;
    cancelResumeTimer();

    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('deviceorientation', onDeviceOrientation);
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    domElement.addEventListener('touchend', onTouchEnd, { passive: true });
    domElement.addEventListener('touchcancel', onTouchEnd, { passive: true });
  };

  const deactivate = (): void => {
    cancelResumeTimer();
    dragActive = false;
    pinchActive = false;
    blinkActive = false;
    document.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('deviceorientation', onDeviceOrientation);
    domElement.removeEventListener('touchstart', onTouchStart);
    domElement.removeEventListener('touchmove', onTouchMove);
    domElement.removeEventListener('touchend', onTouchEnd);
    domElement.removeEventListener('touchcancel', onTouchEnd);
  };

  const update = (camera: THREE.PerspectiveCamera, delta: number, _elapsed: number): void => {
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    if (blinkActive) {
      const t = Math.min(1, (performance.now() - blinkStartTime) / CONFIG.FIXED_CAM_BLINK_DURATION);
      const eased = t * (2 - t);
      manualYaw = blinkFromYaw + (blinkToYaw - blinkFromYaw) * eased;
      manualPitch = blinkFromPitch + (blinkToPitch - blinkFromPitch) * eased;
      currentRadius = blinkFromRadius + (blinkToRadius - blinkFromRadius) * eased;
      if (t >= 1) {
        blinkActive = false;
        scheduleOrbitResume();
      }
    } else if (autoOrbitEnabled && !dragActive && !pinchActive) {
      orbitYaw += CONFIG.FIXED_CAM_ORBIT_SPEED * delta;
      manualYaw = orbitYaw;
    }

    const pitch = manualPitch + mouseY * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.015;
    const yaw = manualYaw + mouseX * CONFIG.FIXED_CAM_PARALLAX_STRENGTH * 0.01;

    camera.position.x = focalPoint.x + currentRadius * Math.cos(pitch) * Math.sin(yaw);
    camera.position.y = focalPoint.y + currentRadius * Math.sin(pitch);
    camera.position.z = focalPoint.z + currentRadius * Math.cos(pitch) * Math.cos(yaw);

    const terrainY = terrain.getHeightAt(camera.position.x, camera.position.z);
    camera.position.y = Math.max(camera.position.y, terrainY + CONFIG.FIXED_CAM_MIN_CAMERA_CLEARANCE);

    camera.lookAt(blinkActive ? blinkLookAt : focalPoint);
  };

  return { activate, deactivate, update };
}
