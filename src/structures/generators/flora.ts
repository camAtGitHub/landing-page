import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const floraGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();
  const isTree = rng.next() > 0.5;

  let maxHeight = 0;
  let boundingRadius = 0;

  if (isTree) {
    // Twisted tree variant
    const trunkHeight = rng.range(4, 9) * scale;
    const helixTwist = rng.range(0.4, 0.8);
    const helixRadius = rng.range(0.3, 0.8) * scale;
    const segmentCount = rng.int(5, 8);
    maxHeight = trunkHeight;

    for (let trunk = 0; trunk < 2; trunk++) {
      const trunkOffset = (trunk === 0 ? 1 : -1) * helixRadius * 0.4;
      for (let s = 0; s < segmentCount; s++) {
        const t = s / segmentCount;
        const segHeight = trunkHeight / segmentCount;
        const geo = new THREE.CylinderGeometry(
          0.15 * scale * (1 - t * 0.3),
          0.2 * scale,
          segHeight,
          6,
        );
        const mat = createGlowMaterial(color, { emissiveIntensity: 0.3 + t * 0.4, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = s * helixTwist + trunk * Math.PI;
        mesh.position.set(
          Math.cos(angle) * helixRadius + trunkOffset,
          s * segHeight + segHeight / 2,
          Math.sin(angle) * helixRadius,
        );
        group.add(mesh);
      }
    }

    // Foliage spheres at top
    const foliageCount = rng.int(5, 12);
    for (let f = 0; f < foliageCount; f++) {
      const geo = new THREE.IcosahedronGeometry(rng.range(0.2, 0.5) * scale, 0);
      const mat = createGlowMaterial(color, { emissiveIntensity: 0.8 + rng.range(0, 0.2), opacity: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        rng.range(-1.5, 1.5) * scale,
        trunkHeight + rng.range(0, 1.5) * scale,
        rng.range(-1.5, 1.5) * scale,
      );
      group.add(mesh);
    }
    boundingRadius = (helixRadius + 1.5) * scale;
  } else {
    // Bulb stalks variant
    const stalkCount = rng.int(3, 6);
    for (let s = 0; s < stalkCount; s++) {
      const height = rng.range(3, 7) * scale;
      const endX = rng.range(-2, 2) * scale;
      const endZ = rng.range(-2, 2) * scale;
      const bulbRadius = rng.range(0.4, 0.8) * scale;
      maxHeight = Math.max(maxHeight, height);

      const segCount = rng.int(4, 6);
      for (let seg = 0; seg < segCount; seg++) {
        const t = seg / segCount;
        const geo = new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, height / segCount, 5);
        const mat = createGlowMaterial(color, { emissiveIntensity: 0.3, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        // Quadratic bezier curve from base to bulb
        const bx = endX * t * t;
        const bz = endZ * t * t;
        mesh.position.set(bx, t * height + height / segCount / 2, bz);
        group.add(mesh);
      }

      // Bulb at tip
      const bulbGeo = new THREE.SphereGeometry(bulbRadius, 16, 8);
      const bulbMat = createGlowMaterial(color, { emissiveIntensity: 0.9, opacity: 0.6 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(endX, height, endZ);
      group.add(bulb);

      const r = Math.sqrt(endX * endX + endZ * endZ) + bulbRadius;
      boundingRadius = Math.max(boundingRadius, r);
    }
  }

  const light = createStructureLight(color, priority);
  light.position.set(0, maxHeight, 0);
  group.add(light);

  boundingRadius = Math.max(boundingRadius, 1);

  const update = (elapsed: number, _delta: number): void => {
    group.rotation.z = Math.sin(elapsed * 0.3) * 0.05;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('flora', floraGenerator);
