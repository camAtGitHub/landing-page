import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const architectureGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const trunkCount = rng.int(1, 2);
  const trunkHeight = rng.range(7.5, 13.5) * scale;
  const trunkSegments: THREE.Mesh[] = [];
  const ribbonSegments: THREE.Mesh[] = [];
  const canopyNodes: THREE.Mesh[] = [];

  const darkBark = color.clone().multiplyScalar(0.14);

  for (let t = 0; t < trunkCount; t++) {
    const trunkPhase = t * Math.PI + rng.range(-0.35, 0.35);
    const trunkOffset = trunkCount === 1 ? 0 : rng.range(0.5, 0.9) * scale;
    const segmentCount = rng.int(12, 18);

    for (let s = 0; s < segmentCount; s++) {
      const progress = s / Math.max(segmentCount - 1, 1);
      const spiral = progress * Math.PI * rng.range(2.3, 3.6) + trunkPhase;
      const radius = trunkOffset + Math.sin(progress * Math.PI) * rng.range(0.12, 0.3) * scale;
      const segmentHeight = trunkHeight / segmentCount;

      const trunkSegment = new THREE.Mesh(
        new THREE.CylinderGeometry(
          (0.35 - progress * 0.2) * scale,
          (0.44 - progress * 0.22) * scale,
          segmentHeight,
          7,
        ),
        new THREE.MeshStandardMaterial({
          color: darkBark,
          emissive: color,
          emissiveIntensity: 0.08,
          transparent: true,
          opacity: 0.92,
          roughness: 0.45,
          metalness: 0.45,
        }),
      );

      trunkSegment.position.set(
        Math.cos(spiral) * radius,
        0.2 * scale + progress * trunkHeight,
        Math.sin(spiral) * radius,
      );
      trunkSegment.rotation.z = Math.sin(spiral) * 0.28;
      trunkSegment.rotation.x = Math.cos(spiral) * 0.28;
      group.add(trunkSegment);
      trunkSegments.push(trunkSegment);

      if (s % 2 === 0) {
        const ribbonSegment = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, segmentHeight * 1.2, 5),
          createGlowMaterial(color, { emissiveIntensity: 0.95, opacity: 0.7, roughness: 0.25, metalness: 0.65 }),
        );
        (ribbonSegment.material as THREE.MeshStandardMaterial).depthWrite = false;
        ribbonSegment.position.set(
          Math.cos(spiral + 0.95) * (radius + 0.28 * scale),
          trunkSegment.position.y,
          Math.sin(spiral + 0.95) * (radius + 0.28 * scale),
        );
        ribbonSegment.rotation.y = spiral;
        group.add(ribbonSegment);
        ribbonSegments.push(ribbonSegment);
      }
    }

    const canopyHeight = trunkHeight + rng.range(0.6, 1.6) * scale;
    const canopyLayers = rng.int(3, 5);
    for (let layer = 0; layer < canopyLayers; layer++) {
      const layerRadius = rng.range(0.8, 2.1) * scale;
      const shardCount = rng.int(6, 10);
      for (let shard = 0; shard < shardCount; shard++) {
        const angle = (shard / shardCount) * Math.PI * 2 + rng.range(-0.2, 0.2);
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(0.24 * scale, 0.08 * scale, 0.5 * scale),
          createGlowMaterial(color, { emissiveIntensity: 1.05, opacity: 0.82, roughness: 0.35, metalness: 0.55 }),
        );
        (canopy.material as THREE.MeshStandardMaterial).depthWrite = false;
        canopy.position.set(
          Math.cos(angle) * layerRadius,
          canopyHeight + layer * 0.38 * scale + Math.sin(angle * 2) * 0.16 * scale,
          Math.sin(angle) * layerRadius,
        );
        canopy.rotation.y = angle;
        canopy.rotation.x = rng.range(-0.2, 0.2);
        group.add(canopy);
        canopyNodes.push(canopy);
      }
    }
  }

  const baseRoots = rng.int(5, 9);
  for (let i = 0; i < baseRoots; i++) {
    const angle = (i / baseRoots) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * scale, 0.12 * scale, 1.2 * scale, 6),
      createGlowMaterial(color, { emissiveIntensity: 0.42, opacity: 0.68, roughness: 0.6, metalness: 0.2 }),
    );
    root.position.set(Math.cos(angle) * 1.25 * scale, 0.5 * scale, Math.sin(angle) * 1.25 * scale);
    root.rotation.x = Math.sin(angle) * 0.65;
    root.rotation.z = Math.cos(angle) * 0.65;
    group.add(root);
  }

  const light = createStructureLight(color, priority, { intensity: priority / 8 + 0.24, distance: 24 + priority * 2 });
  light.position.set(0, trunkHeight * 0.8, 0);
  group.add(light);

  const boundingRadius = Math.max(3.1 * scale, 1.2);

  const update = (elapsed: number, _delta: number): void => {
    trunkSegments.forEach((segment, index) => {
      const mat = segment.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.06 + (Math.sin(elapsed * 0.9 + index * 0.13) + 1) * 0.03;
    });

    ribbonSegments.forEach((ribbon, index) => {
      ribbon.rotation.y += 0.004 + index * 0.00005;
      const wave = Math.sin(elapsed * 1.4 + index * 0.2) * 0.08;
      ribbon.scale.x = 1 + wave;
      ribbon.scale.z = 1 - wave;
    });

    canopyNodes.forEach((node, index) => {
      const pulse = 1 + Math.sin(elapsed * 2 + index * 0.35) * 0.12;
      node.scale.x = pulse;
      node.scale.y = 1 + Math.sin(elapsed * 1.5 + index * 0.1) * 0.1;
      node.scale.z = pulse;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('architecture', architectureGenerator);
