import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const geometricGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const orbRadius = rng.range(1.6, 2.4) * scale;
  const cageRadius = orbRadius * rng.range(1.35, 1.55);

  const coreColor = color.clone();
  const vineColor = new THREE.Color(0x43fff0);
  const sparkColor = new THREE.Color(0xb9fff7);

  const coreMat = createGlowMaterial(coreColor, {
    emissiveIntensity: 1.05,
    opacity: 0.52,
    roughness: 0.18,
    metalness: 0.25,
  });
  coreMat.depthWrite = false;
  const core = new THREE.Mesh(new THREE.SphereGeometry(orbRadius, 24, 18), coreMat);
  group.add(core);

  const shellMat = createGlowMaterial(coreColor.clone().multiplyScalar(0.85), {
    emissiveIntensity: 0.8,
    opacity: 0.25,
    roughness: 0.2,
    metalness: 0.2,
  });
  shellMat.depthWrite = false;
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(orbRadius * 0.78, 2), shellMat);
  group.add(shell);

  const cageCount = rng.int(7, 11);
  const cages: THREE.Mesh[] = [];
  for (let i = 0; i < cageCount; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(cageRadius * rng.range(0.88, 1.05), 0.035 * scale, 10, 56),
      createGlowMaterial(vineColor, {
        emissiveIntensity: 0.9,
        opacity: 0.88,
        roughness: 0.3,
        metalness: 0.55,
      }),
    );
    (ring.material as THREE.MeshStandardMaterial).depthWrite = false;
    ring.rotation.x = rng.range(0, Math.PI);
    ring.rotation.y = rng.range(0, Math.PI);
    ring.rotation.z = rng.range(0, Math.PI);
    group.add(ring);
    cages.push(ring);
  }

  const sparkCount = rng.int(18, 28);
  const sparks: THREE.Mesh[] = [];
  const sparkData: Array<{ radius: number; speed: number; phase: number; vertical: number }> = [];

  for (let i = 0; i < sparkCount; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 * scale, 6, 6),
      createGlowMaterial(sparkColor, {
        emissiveIntensity: 1.1,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.2,
      }),
    );
    (spark.material as THREE.MeshStandardMaterial).depthWrite = false;
    group.add(spark);
    sparks.push(spark);
    sparkData.push({
      radius: rng.range(orbRadius * 0.2, orbRadius * 0.95),
      speed: rng.range(0.4, 1.35),
      phase: rng.range(0, Math.PI * 2),
      vertical: rng.range(0.4, 1),
    });
  }

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(cageRadius * 0.76, 0.065 * scale, 10, 44),
    createGlowMaterial(vineColor.clone().multiplyScalar(0.8), {
      emissiveIntensity: 0.65,
      opacity: 0.6,
      roughness: 0.4,
      metalness: 0.65,
    }),
  );
  (baseRing.material as THREE.MeshStandardMaterial).depthWrite = false;
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = -cageRadius * 0.95;
  group.add(baseRing);

  group.position.y = cageRadius * 1.15;

  const light = createStructureLight(coreColor, priority, {
    intensity: priority / 7 + 0.28,
    distance: cageRadius * 9,
  });
  group.add(light);

  const boundingRadius = Math.max(cageRadius * 1.7, 1);

  const update = (elapsed: number, _delta: number): void => {
    core.rotation.y = elapsed * 0.12;
    shell.rotation.y = -elapsed * 0.2;
    shell.rotation.x = elapsed * 0.1;

    cages.forEach((ring, index) => {
      ring.rotation.y += Math.sin(elapsed * (0.35 + index * 0.03)) * 0.002;
      ring.rotation.z += Math.cos(elapsed * (0.22 + index * 0.02)) * 0.002;
    });

    sparks.forEach((spark, index) => {
      const data = sparkData[index];
      const angle = elapsed * data.speed + data.phase;
      spark.position.set(
        Math.cos(angle) * data.radius,
        Math.sin(angle * data.vertical) * (data.radius * 0.7),
        Math.sin(angle * 1.3) * data.radius,
      );
      const mat = spark.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.75 + Math.sin(elapsed * 2 + index) * 0.28;
    });

    baseRing.rotation.z = elapsed * 0.08;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('geometric', geometricGenerator);
