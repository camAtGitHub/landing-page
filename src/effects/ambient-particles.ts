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
  const speeds = new Float32Array(count);
  const offsets = new Float32Array(count);

  const neonColors = CONFIG.NEON_COLORS;
  const minY = CONFIG.TERRAIN_Y_OFFSET;
  const maxY = CONFIG.TERRAIN_Y_OFFSET + 30;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * spread * 2;
    positions[i3 + 1] = minY + Math.random() * (maxY - minY);
    positions[i3 + 2] = (Math.random() - 0.5) * spread * 2;

    const hex = neonColors[i % neonColors.length];
    const r = ((hex >> 16) & 0xff) / 255;
    const g = ((hex >> 8) & 0xff) / 255;
    const b = (hex & 0xff) / 255;
    colors[i3] = r;
    colors[i3 + 1] = g;
    colors[i3 + 2] = b;

    speeds[i] = 0.5 + Math.random() * 1.0;
    offsets[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    vertexColors: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const update = (elapsed: number, _delta: number): void => {
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const offset = offsets[i];
      const speed = speeds[i];
      positions[i3] += Math.sin(elapsed * speed + offset) * 0.005;
      positions[i3 + 1] += Math.cos(elapsed * speed * 0.7 + offset * 1.3) * 0.003;
      positions[i3 + 2] += Math.sin(elapsed * speed * 0.8 + offset * 0.7) * 0.004;

      if (positions[i3 + 1] > maxY) positions[i3 + 1] = minY;
      if (positions[i3 + 1] < minY) positions[i3 + 1] = maxY;
    }
    posAttr.needsUpdate = true;
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    scene.remove(points);
  };

  return { update, dispose };
}
