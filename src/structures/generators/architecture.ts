import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const architectureGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const trunkHeight = rng.range(6.8, 10.5) * scale;
  const trunkRadius = rng.range(0.5, 0.85) * scale;
  const trunkColor = color.clone().multiplyScalar(0.25);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, trunkHeight, 10, 22),
    new THREE.MeshStandardMaterial({
      color: trunkColor,
      emissive: trunkColor,
      emissiveIntensity: 0.2,
      roughness: 0.55,
      metalness: 0.22,
    }),
  );
  trunk.position.y = trunkHeight * 0.5;
  group.add(trunk);

  const helixCount = rng.int(2, 3);
  const helixSegments: THREE.Mesh[] = [];
  const helixData: Array<{ direction: number; speed: number; phase: number }> = [];

  for (let h = 0; h < helixCount; h++) {
    const direction = h % 2 === 0 ? 1 : -1;
    const phase = rng.range(0, Math.PI * 2);
    const segmentCount = rng.int(24, 34);
    const helixRadius = trunkRadius * rng.range(0.95, 1.3);

    for (let s = 0; s < segmentCount; s++) {
      const t = s / Math.max(segmentCount - 1, 1);
      const angle = direction * t * Math.PI * rng.range(5.5, 7.5) + phase;
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkRadius * 0.035, trunkRadius * 0.05, trunkHeight / segmentCount, 6),
        createGlowMaterial(new THREE.Color(0x62fff2), {
          emissiveIntensity: 1,
          opacity: 0.92,
          roughness: 0.28,
          metalness: 0.5,
        }),
      );
      (segment.material as THREE.MeshStandardMaterial).depthWrite = false;
      segment.position.set(
        Math.cos(angle) * helixRadius,
        t * trunkHeight,
        Math.sin(angle) * helixRadius,
      );
      segment.rotation.z = Math.PI / 2;
      group.add(segment);
      helixSegments.push(segment);
      helixData.push({ direction, speed: rng.range(0.2, 0.45), phase: phase + s * 0.07 });
    }
  }

  const canopyClusterCount = rng.int(4, 7);
  const leaves: THREE.Mesh[] = [];
  for (let c = 0; c < canopyClusterCount; c++) {
    const clusterAngle = (c / canopyClusterCount) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const clusterHeight = trunkHeight * rng.range(0.7, 0.95);
    const branchLen = rng.range(1.4, 2.6) * scale;

    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.06, trunkRadius * 0.12, branchLen, 8),
      new THREE.MeshStandardMaterial({
        color: trunkColor,
        emissive: color,
        emissiveIntensity: 0.2,
        roughness: 0.5,
        metalness: 0.2,
      }),
    );
    branch.position.set(
      Math.cos(clusterAngle) * branchLen * 0.4,
      clusterHeight,
      Math.sin(clusterAngle) * branchLen * 0.4,
    );
    branch.rotation.z = Math.PI / 2;
    branch.rotation.y = clusterAngle;
    group.add(branch);

    const leafCount = rng.int(5, 8);
    for (let l = 0; l < leafCount; l++) {
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(
          rng.range(0.2, 0.48) * scale,
          rng.range(0.16, 0.28) * scale,
          rng.range(0.35, 0.62) * scale,
        ),
        createGlowMaterial(color.clone(), {
          emissiveIntensity: 0.85,
          opacity: 0.75,
          roughness: 0.35,
          metalness: 0.2,
        }),
      );
      (leaf.material as THREE.MeshStandardMaterial).depthWrite = false;
      leaf.position.set(
        Math.cos(clusterAngle) * branchLen + rng.range(-0.35, 0.35) * scale,
        clusterHeight + rng.range(-0.2, 0.6) * scale,
        Math.sin(clusterAngle) * branchLen + rng.range(-0.35, 0.35) * scale,
      );
      group.add(leaf);
      leaves.push(leaf);
    }
  }

  const rootCount = rng.int(7, 10);
  for (let r = 0; r < rootCount; r++) {
    const rootAngle = (r / rootCount) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rootLen = rng.range(1.7, 3.2) * scale;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.045, trunkRadius * 0.09, rootLen, 7),
      new THREE.MeshStandardMaterial({
        color: trunkColor,
        emissive: color,
        emissiveIntensity: 0.14,
        roughness: 0.6,
        metalness: 0.2,
      }),
    );
    root.position.set(
      Math.cos(rootAngle) * rootLen * 0.5,
      rootLen * 0.08,
      Math.sin(rootAngle) * rootLen * 0.5,
    );
    root.rotation.z = Math.PI / 2;
    root.rotation.y = rootAngle;
    group.add(root);
  }

  const light = createStructureLight(color.clone(), priority, {
    intensity: priority / 7 + 0.35,
    distance: 24 * scale,
  });
  light.position.y = trunkHeight + 0.8 * scale;
  group.add(light);

  const boundingRadius = Math.max(scale * 3.2, 1);

  const update = (elapsed: number, _delta: number): void => {
    helixSegments.forEach((segment, index) => {
      const data = helixData[index];
      segment.rotation.y = Math.sin(elapsed * data.speed + data.phase) * (0.5 * data.direction);
      const mat = segment.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(elapsed * 1.5 + data.phase) * 0.22;
    });

    leaves.forEach((leaf, index) => {
      leaf.position.y += Math.sin(elapsed * 0.8 + index * 0.3) * 0.0008;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('architecture', architectureGenerator);
