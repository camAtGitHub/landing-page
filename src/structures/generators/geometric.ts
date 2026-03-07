import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const geometricGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const orbRadius = rng.range(1.8, 3.4) * scale;

  const coreColor = color.clone().multiplyScalar(1.2);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(orbRadius * 0.66, 20, 14),
    createGlowMaterial(coreColor, { emissiveIntensity: 1.2, opacity: 0.9 }),
  );
  (core.material as THREE.MeshStandardMaterial).depthWrite = false;
  group.add(core);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(orbRadius, 22, 16),
    createGlowMaterial(color, { emissiveIntensity: 0.5, opacity: 0.2, roughness: 0.05, metalness: 0.95 }),
  );
  (shell.material as THREE.MeshStandardMaterial).depthWrite = false;
  group.add(shell);

  const latticeRings: THREE.Mesh[] = [];
  const ringCount = rng.int(8, 14);
  for (let i = 0; i < ringCount; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(orbRadius * rng.range(0.72, 0.95), 0.035 * scale, 8, 48),
      createGlowMaterial(color, { emissiveIntensity: 0.95, opacity: 0.72 }),
    );
    (ring.material as THREE.MeshStandardMaterial).depthWrite = false;
    ring.rotation.x = rng.range(0, Math.PI);
    ring.rotation.y = rng.range(0, Math.PI);
    ring.rotation.z = rng.range(0, Math.PI);
    group.add(ring);
    latticeRings.push(ring);
  }

  const rootSegments: THREE.Mesh[] = [];
  const rootStrands = rng.int(4, 7);
  for (let strand = 0; strand < rootStrands; strand++) {
    const strandAngle = (strand / rootStrands) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const segCount = rng.int(4, 7);
    for (let s = 0; s < segCount; s++) {
      const t = s / Math.max(segCount - 1, 1);
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * scale * (1 - t * 0.5), 0.11 * scale * (1 - t * 0.4), 0.35 * scale, 6),
        createGlowMaterial(color, { emissiveIntensity: 0.35, opacity: 0.76, roughness: 0.6, metalness: 0.25 }),
      );
      const radial = orbRadius * (0.55 + t * 0.9);
      segment.position.set(
        Math.cos(strandAngle + t * 0.5) * radial,
        -orbRadius * 0.9 - t * 0.3 * scale,
        Math.sin(strandAngle + t * 0.5) * radial,
      );
      segment.rotation.x = rng.range(-0.2, 0.2);
      segment.rotation.y = strandAngle + Math.PI / 2;
      segment.rotation.z = rng.range(-0.2, 0.2);
      group.add(segment);
      rootSegments.push(segment);
    }
  }

  const sparkMeshes: THREE.Mesh[] = [];
  const sparkBase: { radius: number; speed: number; offset: number; height: number }[] = [];
  const sparkCount = rng.int(10, 18);
  for (let i = 0; i < sparkCount; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 * scale, 6, 6),
      createGlowMaterial(color, { emissiveIntensity: 1.3, opacity: 0.95 }),
    );
    (spark.material as THREE.MeshStandardMaterial).depthWrite = false;
    group.add(spark);
    sparkMeshes.push(spark);
    sparkBase.push({
      radius: orbRadius * rng.range(0.65, 1.25),
      speed: rng.range(0.5, 1.3),
      offset: rng.range(0, Math.PI * 2),
      height: rng.range(-orbRadius * 0.6, orbRadius * 0.6),
    });
  }

  group.position.y = rng.range(2.4, 4.2) * scale;
  const light = createStructureLight(color, priority, { intensity: priority / 8 + 0.25, distance: 22 + priority * 2 });
  group.add(light);

  const boundingRadius = orbRadius * 1.9;

  const update = (elapsed: number, _delta: number): void => {
    const corePulse = 1 + Math.sin(elapsed * 1.6) * 0.06;
    core.scale.x = corePulse;
    core.scale.y = corePulse;
    core.scale.z = corePulse;

    const shellPulse = 1 + Math.sin(elapsed * 0.8 + seed) * 0.03;
    shell.scale.x = shellPulse;
    shell.scale.y = shellPulse;
    shell.scale.z = shellPulse;

    latticeRings.forEach((ring, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      ring.rotation.x += 0.0025 * direction;
      ring.rotation.y += 0.0018 * (index + 1) * 0.2;
      ring.rotation.z += 0.0012 * direction;
    });

    rootSegments.forEach((segment, index) => {
      segment.rotation.z = Math.sin(elapsed * 0.9 + index * 0.25) * 0.12;
    });

    sparkMeshes.forEach((spark, index) => {
      const data = sparkBase[index];
      const angle = elapsed * data.speed + data.offset;
      spark.position.set(
        Math.cos(angle) * data.radius,
        data.height + Math.sin(elapsed * 1.4 + data.offset) * 0.25,
        Math.sin(angle) * data.radius,
      );
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('geometric', geometricGenerator);
