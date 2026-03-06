import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const crystalGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();
  const prismCount = rng.int(3, 8);
  let maxRadius = 0;
  let maxHeight = 0;

  const materials: THREE.MeshStandardMaterial[] = [];

  for (let i = 0; i < prismCount; i++) {
    const height = rng.range(2, 8) * scale;
    const radius = rng.range(0.2, 0.6) * scale;
    const segments = rng.int(4, 7);
    const tiltX = rng.range(-0.3, 0.3);
    const tiltZ = rng.range(-0.3, 0.3);
    const offsetDist = rng.range(0, 1.5) * scale;
    const offsetAngle = rng.range(0, Math.PI * 2);

    const geo = new THREE.CylinderGeometry(radius * 0.3, radius, height, segments);
    const mat = createGlowMaterial(color, {
      emissiveIntensity: 0.4 + rng.range(0, 0.3),
      opacity: 0.7 + rng.range(0, 0.2),
    });
    materials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      Math.cos(offsetAngle) * offsetDist,
      height / 2,
      Math.sin(offsetAngle) * offsetDist,
    );
    mesh.rotation.x = tiltX;
    mesh.rotation.z = tiltZ;
    group.add(mesh);

    const r = offsetDist + radius;
    if (r > maxRadius) maxRadius = r;
    if (height > maxHeight) maxHeight = height;
  }

  // Light at the top of tallest prism
  const light = createStructureLight(color, priority);
  light.position.set(0, maxHeight, 0);
  group.add(light);

  const boundingRadius = Math.max(maxRadius, 1);

  const update = (elapsed: number, _delta: number): void => {
    group.rotation.y = elapsed * 0.05;
    let childIdx = 0;
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.4 + Math.sin(elapsed * (0.8 + childIdx * 0.2)) * 0.3;
        childIdx++;
      }
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('crystal', crystalGenerator);
