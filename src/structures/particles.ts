import * as THREE from 'three';
import { StructureInstance } from '../types';
import { CONFIG } from '../config';

export interface StructureParticles {
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

export function createStructureParticles(
  instances: StructureInstance[],
  scene: THREE.Scene,
): StructureParticles {
  const emitters: {
    points: THREE.Points;
    posAttr: THREE.BufferAttribute;
    speeds: Float32Array;
    offsets: Float32Array;
    maxY: number;
    worldX: number;
    worldZ: number;
    worldY: number;
    boundR: number;
  }[] = [];

  const neonColors = CONFIG.NEON_COLORS;

  instances.forEach((instance, idx) => {
    const count = CONFIG.STRUCTURE_PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    const wp = instance.worldPosition;
    const boundR = instance.boundingRadius * 1.5;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * boundR;
      positions[i3] = wp.x + Math.cos(angle) * dist;
      positions[i3 + 1] = wp.y + Math.random() * boundR;
      positions[i3 + 2] = wp.z + Math.sin(angle) * dist;
      speeds[i] = 0.5 + Math.random() * 1.0;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', posAttr);

    const colorHex = neonColors[idx % neonColors.length];
    const color = new THREE.Color(colorHex);

    const material = new THREE.PointsMaterial({
      color,
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    emitters.push({
      points,
      posAttr,
      speeds,
      offsets,
      maxY: wp.y + boundR * 2,
      worldX: wp.x,
      worldZ: wp.z,
      worldY: wp.y,
      boundR,
    });
  });

  const update = (elapsed: number, _delta: number): void => {
    emitters.forEach((emitter) => {
      const posArr = emitter.posAttr.array as Float32Array;
      const count = CONFIG.STRUCTURE_PARTICLE_COUNT;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const speed = emitter.speeds[i];
        const offset = emitter.offsets[i];

        posArr[i3 + 1] += speed * 0.02;
        posArr[i3] += Math.sin(elapsed * speed + offset) * 0.01;
        posArr[i3 + 2] += Math.cos(elapsed * speed * 0.8 + offset) * 0.01;

        if (posArr[i3 + 1] > emitter.maxY) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * emitter.boundR;
          posArr[i3] = emitter.worldX + Math.cos(angle) * dist;
          posArr[i3 + 1] = emitter.worldY;
          posArr[i3 + 2] = emitter.worldZ + Math.sin(angle) * dist;
        }
      }
      emitter.posAttr.needsUpdate = true;
    });
  };

  const dispose = (): void => {
    emitters.forEach((e) => {
      e.points.geometry.dispose();
      (e.points.material as THREE.Material).dispose();
      scene.remove(e.points);
    });
  };

  return { update, dispose };
}
