import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const entityGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const stemColor = color.clone().multiplyScalar(0.35);
  const capColor = color.clone();
  const gillColor = new THREE.Color(0xff77f5);

  const stemCount = rng.int(3, 5);
  const caps: THREE.Mesh[] = [];
  const capGlowRings: THREE.Mesh[] = [];

  for (let i = 0; i < stemCount; i++) {
    const angle = (i / stemCount) * Math.PI * 2 + rng.range(-0.35, 0.35);
    const radius = rng.range(0.2, 1.2) * scale;
    const stemHeight = rng.range(3.4, 7.2) * scale;
    const stemTopRadius = rng.range(0.12, 0.24) * scale;
    const stemBottomRadius = stemTopRadius * rng.range(1.45, 1.95);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(stemTopRadius, stemBottomRadius, stemHeight, 10, 14),
      new THREE.MeshStandardMaterial({
        color: stemColor,
        emissive: color,
        emissiveIntensity: 0.35,
        roughness: 0.55,
        metalness: 0.2,
      }),
    );
    stem.position.set(
      Math.cos(angle) * radius,
      stemHeight * 0.5,
      Math.sin(angle) * radius,
    );
    stem.rotation.z = rng.range(-0.15, 0.15);
    stem.rotation.x = rng.range(-0.12, 0.12);
    group.add(stem);

    const capRadius = rng.range(1.2, 2.3) * scale;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(capRadius, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
      createGlowMaterial(capColor.clone(), {
        emissiveIntensity: 1,
        opacity: 0.84,
        roughness: 0.24,
        metalness: 0.15,
      }),
    );
    (cap.material as THREE.MeshStandardMaterial).depthWrite = false;
    cap.position.set(stem.position.x, stemHeight, stem.position.z);
    group.add(cap);
    caps.push(cap);

    const gillCount = rng.int(12, 20);
    for (let g = 0; g < gillCount; g++) {
      const gillAngle = (g / gillCount) * Math.PI * 2;
      const gillLength = capRadius * rng.range(0.55, 0.95);
      const gill = new THREE.Mesh(
        new THREE.BoxGeometry(0.03 * scale, 0.03 * scale, gillLength),
        createGlowMaterial(gillColor, {
          emissiveIntensity: 1.15,
          opacity: 0.8,
          roughness: 0.2,
          metalness: 0.25,
        }),
      );
      (gill.material as THREE.MeshStandardMaterial).depthWrite = false;
      gill.position.set(
        cap.position.x + Math.cos(gillAngle) * (gillLength * 0.3),
        cap.position.y - capRadius * 0.65,
        cap.position.z + Math.sin(gillAngle) * (gillLength * 0.3),
      );
      gill.rotation.y = gillAngle;
      gill.rotation.x = Math.PI * 0.5;
      group.add(gill);
    }

    const capRing = new THREE.Mesh(
      new THREE.TorusGeometry(capRadius * 0.92, 0.05 * scale, 10, 38),
      createGlowMaterial(gillColor.clone().multiplyScalar(1.1), {
        emissiveIntensity: 1.25,
        opacity: 0.78,
        roughness: 0.22,
        metalness: 0.2,
      }),
    );
    (capRing.material as THREE.MeshStandardMaterial).depthWrite = false;
    capRing.position.set(cap.position.x, cap.position.y - capRadius * 0.72, cap.position.z);
    capRing.rotation.x = Math.PI * 0.5;
    group.add(capRing);
    capGlowRings.push(capRing);
  }

  const sporeCount = rng.int(20, 34);
  const sporeData: Array<{ base: THREE.Vector3; drift: number; phase: number }> = [];
  const spores: THREE.Mesh[] = [];
  for (let i = 0; i < sporeCount; i++) {
    const spore = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 * scale, 6, 6),
      createGlowMaterial(new THREE.Color(0xffddff), {
        emissiveIntensity: 1.05,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.1,
      }),
    );
    (spore.material as THREE.MeshStandardMaterial).depthWrite = false;
    const base = new THREE.Vector3(
      rng.range(-2.5, 2.5) * scale,
      rng.range(0.8, 8.5) * scale,
      rng.range(-2.5, 2.5) * scale,
    );
    spore.position.set(base.x, base.y, base.z);
    group.add(spore);
    spores.push(spore);
    sporeData.push({
      base,
      drift: rng.range(0.08, 0.3) * scale,
      phase: rng.range(0, Math.PI * 2),
    });
  }

  const light = createStructureLight(capColor, priority, {
    intensity: priority / 7 + 0.35,
    distance: 20 * scale,
  });
  light.position.set(0, 5.5 * scale, 0);
  group.add(light);

  const boundingRadius = Math.max(5.5 * scale, 1);

  const update = (elapsed: number, _delta: number): void => {
    caps.forEach((cap, index) => {
      const breath = 1 + Math.sin(elapsed * 1.2 + index * 0.7) * 0.04;
      cap.scale.x = breath;
      cap.scale.y = 1 + Math.sin(elapsed * 1.4 + index * 0.9) * 0.06;
      cap.scale.z = breath;

      const capMat = cap.material as THREE.MeshStandardMaterial;
      capMat.emissiveIntensity = 0.85 + Math.sin(elapsed * 2 + index) * 0.2;
    });

    capGlowRings.forEach((ring, index) => {
      ring.rotation.z = elapsed * 0.18 + index * 0.8;
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.9 + Math.sin(elapsed * 2.5 + index * 0.4) * 0.3;
    });

    spores.forEach((spore, index) => {
      const data = sporeData[index];
      spore.position.x = data.base.x + Math.sin(elapsed * 0.9 + data.phase) * data.drift;
      spore.position.y = data.base.y + Math.cos(elapsed * 0.7 + data.phase) * data.drift;
      spore.position.z = data.base.z + Math.sin(elapsed * 1.1 + data.phase) * data.drift;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('entity', entityGenerator);
