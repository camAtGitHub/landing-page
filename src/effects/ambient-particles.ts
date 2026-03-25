import * as THREE from 'three';
import { CONFIG } from '../config';

export interface AmbientParticles {
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

export function createAmbientParticles(scene: THREE.Scene): AmbientParticles {
  const count = CONFIG.AMBIENT_DUST_COUNT;
  const spread = CONFIG.AMBIENT_DUST_SPREAD;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  const offsets = new Float32Array(count);
  const driftAmplitudes = new Float32Array(count);

  const neonColors = CONFIG.NEON_COLORS;
  const minY = CONFIG.TERRAIN_Y_OFFSET;
  const maxY = CONFIG.TERRAIN_Y_OFFSET + 40;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * spread * 2;
    positions[i3 + 1] = minY + Math.random() * (maxY - minY);
    positions[i3 + 2] = (Math.random() - 0.5) * spread * 2;

    const hex = neonColors[i % neonColors.length];
    const r = ((hex >> 16) & 0xff) / 255;
    const g = ((hex >> 8) & 0xff) / 255;
    const b = (hex & 0xff) / 255;
    // Slightly brighten colors for additive blending
    colors[i3] = Math.min(1, r * 1.2);
    colors[i3 + 1] = Math.min(1, g * 1.2);
    colors[i3 + 2] = Math.min(1, b * 1.2);

    // Varied sizes for depth — smaller particles appear further away
    sizes[i] = 0.15 + Math.random() * 0.4;

    speeds[i] = 0.3 + Math.random() * 1.2;
    offsets[i] = Math.random() * Math.PI * 2;
    driftAmplitudes[i] = 0.003 + Math.random() * 0.008;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // === Secondary layer: fine dust for atmosphere ===
  const fineCount = Math.floor(count * 0.5);
  const finePositions = new Float32Array(fineCount * 3);
  const fineSpeeds = new Float32Array(fineCount);
  const fineOffsets = new Float32Array(fineCount);

  for (let i = 0; i < fineCount; i++) {
    const i3 = i * 3;
    finePositions[i3] = (Math.random() - 0.5) * spread * 2.5;
    finePositions[i3 + 1] = minY + Math.random() * (maxY - minY);
    finePositions[i3 + 2] = (Math.random() - 0.5) * spread * 2.5;
    fineSpeeds[i] = 0.15 + Math.random() * 0.5;
    fineOffsets[i] = Math.random() * Math.PI * 2;
  }

  const fineGeo = new THREE.BufferGeometry();
  const finePosAttr = new THREE.BufferAttribute(finePositions, 3);
  fineGeo.setAttribute('position', finePosAttr);

  const fineMat = new THREE.PointsMaterial({
    color: 0x6644aa,
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const finePoints = new THREE.Points(fineGeo, fineMat);
  scene.add(finePoints);

  const update = (elapsed: number, _delta: number): void => {
    // Main particles — organic wandering motion
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const offset = offsets[i];
      const speed = speeds[i];
      const drift = driftAmplitudes[i];

      positions[i3] += Math.sin(elapsed * speed + offset) * drift;
      positions[i3 + 1] += Math.cos(elapsed * speed * 0.7 + offset * 1.3) * drift * 0.5;
      positions[i3 + 2] += Math.sin(elapsed * speed * 0.8 + offset * 0.7) * drift;

      // Gentle upward drift
      positions[i3 + 1] += speed * 0.001;

      if (positions[i3 + 1] > maxY) positions[i3 + 1] = minY;
      if (positions[i3 + 1] < minY) positions[i3 + 1] = maxY;
    }
    posAttr.needsUpdate = true;

    // Fine particles — slower, subtler
    for (let i = 0; i < fineCount; i++) {
      const i3 = i * 3;
      const offset = fineOffsets[i];
      const speed = fineSpeeds[i];

      finePositions[i3] += Math.sin(elapsed * speed + offset) * 0.002;
      finePositions[i3 + 1] += Math.cos(elapsed * speed * 0.5 + offset) * 0.001;
      finePositions[i3 + 2] += Math.cos(elapsed * speed * 0.6 + offset * 1.2) * 0.002;

      if (finePositions[i3 + 1] > maxY) finePositions[i3 + 1] = minY;
      if (finePositions[i3 + 1] < minY) finePositions[i3 + 1] = maxY;
    }
    finePosAttr.needsUpdate = true;

    // Subtle global opacity pulse for main layer
    material.opacity = 0.45 + Math.sin(elapsed * 0.3) * 0.1;
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    scene.remove(points);
    fineGeo.dispose();
    fineMat.dispose();
    scene.remove(finePoints);
  };

  return { update, dispose };
}
