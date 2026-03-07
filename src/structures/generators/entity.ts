import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const entityGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const bloomRadius = rng.range(1.1, 1.8) * scale;
  const podCount = rng.int(6, 9);

  const stemColor = new THREE.Color(0x45f7ff);
  const podColor = color.clone();
  const coreColor = new THREE.Color(0xfff1b0);

  const baseCore = new THREE.Mesh(
    new THREE.SphereGeometry(bloomRadius * 0.34, 16, 12),
    createGlowMaterial(color.clone().multiplyScalar(0.95), {
      emissiveIntensity: 1,
      opacity: 0.58,
      roughness: 0.2,
      metalness: 0.35,
    }),
  );
  (baseCore.material as THREE.MeshStandardMaterial).depthWrite = false;
  baseCore.position.y = bloomRadius * 0.28;
  group.add(baseCore);

  const basePetalCount = rng.int(14, 20);
  const petals: THREE.Mesh[] = [];
  for (let i = 0; i < basePetalCount; i++) {
    const angle = (i / basePetalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * scale, 0.13 * scale, bloomRadius * 1.05, 6),
      createGlowMaterial(color.clone(), {
        emissiveIntensity: 0.95,
        opacity: 0.75,
        roughness: 0.4,
        metalness: 0.35,
      }),
    );
    (petal.material as THREE.MeshStandardMaterial).depthWrite = false;
    petal.position.set(
      Math.cos(angle) * bloomRadius * 0.82,
      bloomRadius * 0.33,
      Math.sin(angle) * bloomRadius * 0.82,
    );
    petal.rotation.z = Math.PI * 0.5;
    petal.rotation.y = angle;
    group.add(petal);
    petals.push(petal);
  }

  const stems: THREE.Mesh[] = [];
  const pods: THREE.Mesh[] = [];
  const podCores: THREE.Mesh[] = [];
  const stemData: Array<{ angle: number; length: number; sway: number; phase: number }> = [];

  for (let i = 0; i < podCount; i++) {
    const angle = (i / podCount) * Math.PI * 2 + rng.range(-0.24, 0.24);
    const stemLength = rng.range(3.5, 6.1) * scale;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 * scale, 0.08 * scale, stemLength, 7),
      createGlowMaterial(stemColor, {
        emissiveIntensity: 0.7,
        opacity: 0.85,
        roughness: 0.35,
        metalness: 0.55,
      }),
    );
    (stem.material as THREE.MeshStandardMaterial).depthWrite = false;

    const radial = stemLength * 0.2;
    stem.position.set(
      Math.cos(angle) * radial,
      bloomRadius * 0.4 + stemLength * 0.5,
      Math.sin(angle) * radial,
    );
    stem.rotation.z = rng.range(-0.22, 0.22);
    stem.rotation.x = rng.range(-0.12, 0.12);
    group.add(stem);
    stems.push(stem);

    const podRadius = rng.range(0.6, 1.1) * scale;
    const pod = new THREE.Mesh(
      new THREE.SphereGeometry(podRadius, 16, 12),
      createGlowMaterial(podColor.clone(), {
        emissiveIntensity: 1.1,
        opacity: 0.72,
        roughness: 0.2,
        metalness: 0.2,
      }),
    );
    (pod.material as THREE.MeshStandardMaterial).depthWrite = false;
    pod.position.set(
      Math.cos(angle) * (radial + stemLength * 0.14),
      bloomRadius * 0.4 + stemLength,
      Math.sin(angle) * (radial + stemLength * 0.14),
    );
    group.add(pod);
    pods.push(pod);

    const podCore = new THREE.Mesh(
      new THREE.SphereGeometry(podRadius * 0.42, 10, 8),
      createGlowMaterial(coreColor, {
        emissiveIntensity: 1.4,
        opacity: 0.78,
        roughness: 0.1,
        metalness: 0.1,
      }),
    );
    (podCore.material as THREE.MeshStandardMaterial).depthWrite = false;
    podCore.position.set(pod.position.x, pod.position.y, pod.position.z);
    group.add(podCore);
    podCores.push(podCore);

    stemData.push({
      angle,
      length: stemLength,
      sway: rng.range(0.06, 0.18),
      phase: rng.range(0, Math.PI * 2),
    });
  }

  const filamentCount = rng.int(7, 12);
  const filaments: THREE.Line[] = [];
  for (let i = 0; i < filamentCount; i++) {
    const points = [
      new THREE.Vector3(0, bloomRadius * 0.45, 0),
      new THREE.Vector3(rng.range(-0.8, 0.8) * scale, rng.range(1.2, 2.6) * scale, rng.range(-0.8, 0.8) * scale),
      new THREE.Vector3(rng.range(-1.6, 1.6) * scale, rng.range(3, 5.8) * scale, rng.range(-1.6, 1.6) * scale),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: stemColor,
        transparent: true,
        opacity: 0.35,
      }),
    );
    group.add(line);
    filaments.push(line);
  }

  const light = createStructureLight(color.clone(), priority, {
    intensity: priority / 6 + 0.32,
    distance: 22 * scale,
  });
  light.position.y = bloomRadius * 1.8;
  group.add(light);

  const baseY = rng.range(0.2, 0.6) * scale;
  group.position.y = baseY;
  const boundingRadius = Math.max(scale * 4.5, 1);

  const update = (elapsed: number, _delta: number): void => {
    group.position.y = baseY + Math.sin(elapsed * 0.4) * (0.11 * scale);
    baseCore.scale.y = 1 + Math.sin(elapsed * 1.6) * 0.06;

    pods.forEach((pod, index) => {
      const stem = stems[index];
      const data = stemData[index];
      const sway = Math.sin(elapsed * 0.9 + data.phase) * data.sway;
      stem.rotation.z = sway;

      const radial = data.length * 0.34;
      const y = bloomRadius * 0.4 + data.length + Math.sin(elapsed * 1.1 + data.phase) * (0.2 * scale);
      pod.position.set(Math.cos(data.angle + sway) * radial, y, Math.sin(data.angle + sway) * radial);
      const podScale = 1 + Math.sin(elapsed * 1.7 + index) * 0.04;
      pod.scale.x = podScale;
      pod.scale.y = podScale;
      pod.scale.z = podScale;

      const podMat = pod.material as THREE.MeshStandardMaterial;
      podMat.emissiveIntensity = 0.95 + Math.sin(elapsed * 2 + index) * 0.28;

      const core = podCores[index];
      core.position.set(pod.position.x, pod.position.y, pod.position.z);
      const coreScale = 0.95 + Math.sin(elapsed * 2.6 + index * 1.1) * 0.08;
      core.scale.x = coreScale;
      core.scale.y = coreScale;
      core.scale.z = coreScale;
    });

    filaments.forEach((filament, index) => {
      const mat = filament.material as THREE.LineBasicMaterial;
      mat.opacity = 0.2 + (Math.sin(elapsed * 1.8 + index * 0.5) + 1) * 0.13;
    });

    petals.forEach((petal, index) => {
      petal.rotation.x = Math.sin(elapsed * 0.8 + index * 0.35) * 0.05;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('entity', entityGenerator);
