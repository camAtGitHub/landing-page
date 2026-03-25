import * as THREE from 'three';
import { CameraController } from './state-machine';
import { TerrainContext } from '../scene/terrain';
import { CONFIG } from '../config';

interface StreakEffect {
  group: THREE.Group;
  lines: THREE.Line[];
  startTime: number;
  duration: number;
  direction: THREE.Vector3;
}

function createStreakLines(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  direction: THREE.Vector3,
  lineCount: number,
): StreakEffect {
  const group = new THREE.Group();
  const lines: THREE.Line[] = [];

  const streakColor = new THREE.Color(0x00ffc8);
  const material = new THREE.LineBasicMaterial({
    color: streakColor,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Generate streak lines around the camera's field of view
  for (let i = 0; i < lineCount; i++) {
    // Random angle around the camera's forward axis
    const theta = Math.random() * Math.PI * 2;
    // Bias radius toward edges (peripheral streaks look best)
    const radius = 1.5 + Math.random() * 4.5;
    const length = 3 + Math.random() * 8;

    // Position relative to camera, offset to side/above/below
    const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, direction).normalize();

    const offsetX = Math.cos(theta) * radius;
    const offsetY = Math.sin(theta) * radius;

    const startOffset = right.clone().multiplyScalar(offsetX).add(up.clone().multiplyScalar(offsetY));

    // The line extends backward from the streak start point
    const startPt = camera.position.clone().add(startOffset).add(direction.clone().multiplyScalar(2 + Math.random() * 5));
    const endPt = startPt.clone().sub(direction.clone().multiplyScalar(length));

    const geometry = new THREE.BufferGeometry().setFromPoints([startPt, endPt]);
    const line = new THREE.Line(geometry, material.clone());
    lines.push(line);
    group.add(line);
  }

  scene.add(group);

  return {
    group,
    lines,
    startTime: performance.now(),
    duration: CONFIG.FREE_CAM_BLINK_STREAK_DURATION_MS,
    direction: direction.clone(),
  };
}

function updateStreakEffect(effect: StreakEffect): boolean {
  const elapsed = performance.now() - effect.startTime;
  const t = Math.min(1, elapsed / effect.duration);

  // Fade in fast, hold, then fade out
  let opacity: number;
  if (t < 0.15) {
    opacity = t / 0.15; // Quick ramp up
  } else if (t < 0.5) {
    opacity = 1.0; // Hold
  } else {
    opacity = 1.0 - (t - 0.5) / 0.5; // Fade out
  }

  // Stretch lines backward over time for "rushing forward" feel
  const stretch = t * 2.0;

  for (const line of effect.lines) {
    const mat = line.material as THREE.LineBasicMaterial;
    mat.opacity = opacity * 0.6;

    const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    // Move end point (index 1) further back along the direction
    arr[3] -= effect.direction.x * stretch * 0.3;
    arr[4] -= effect.direction.y * stretch * 0.3;
    arr[5] -= effect.direction.z * stretch * 0.3;
    posAttr.needsUpdate = true;
  }

  return t >= 1;
}

function disposeStreakEffect(effect: StreakEffect, scene: THREE.Scene): void {
  for (const line of effect.lines) {
    line.geometry.dispose();
    (line.material as THREE.LineBasicMaterial).dispose();
  }
  scene.remove(effect.group);
}

export function createFreeCamController(terrain: TerrainContext, scene?: THREE.Scene): CameraController {
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

  let activeStreak: StreakEffect | null = null;

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

    // Launch streak effect if scene is available
    if (scene && camera) {
      // Clean up any lingering streak
      if (activeStreak) {
        disposeStreakEffect(activeStreak, scene);
        activeStreak = null;
      }
      activeStreak = createStreakLines(
        scene,
        camera,
        forward,
        CONFIG.FREE_CAM_BLINK_STREAK_LINE_COUNT,
      );
    }
  };

  const activate = (cam: THREE.PerspectiveCamera): void => {
    camera = cam;
    cam.rotation.order = 'YXZ';

    yaw = cam.rotation.y;
    pitch = Math.max(CONFIG.FREE_CAM_PITCH_MIN, Math.min(CONFIG.FREE_CAM_PITCH_MAX, cam.rotation.x));
    lastMouseX = -1;
    lastMouseY = -1;
    blinking = false;

    const terrainY = terrain.getHeightAt(cam.position.x, cam.position.z);
    targetHeight = terrainY + CONFIG.FREE_CAM_HEIGHT_ABOVE_TERRAIN;
    currentHeight = Math.max(cam.position.y, targetHeight);
    cam.position.y = currentHeight;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
  };

  const deactivate = (): void => {
    camera = null;
    blinking = false;

    // Clean up any active streak
    if (activeStreak && scene) {
      disposeStreakEffect(activeStreak, scene);
      activeStreak = null;
    }

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousedown', onMouseDown);
  };

  const update = (cam: THREE.PerspectiveCamera, delta: number, _elapsed: number): void => {
    // Update streak effect
    if (activeStreak && scene) {
      const done = updateStreakEffect(activeStreak);
      if (done) {
        disposeStreakEffect(activeStreak, scene);
        activeStreak = null;
      }
    }

    if (blinking) {
      const now = performance.now();
      const t = Math.min(1, (now - blinkStartTime) / CONFIG.FREE_CAM_BLINK_DURATION_MS);
      // Ease-out for a "burst forward then decelerate" feel
      const eased = 1 - Math.pow(1 - t, 3);
      cam.position.x = blinkStartPos.x + (blinkTargetPos.x - blinkStartPos.x) * eased;
      cam.position.z = blinkStartPos.z + (blinkTargetPos.z - blinkStartPos.z) * eased;
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
