import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const entityGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const bodyRadius = rng.range(1.5, 3.0) * scale;

  // Dome body (top hemisphere)
  const domeGeo = new THREE.SphereGeometry(bodyRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const domeMat = createGlowMaterial(color, {
    emissiveIntensity: 0.5,
    opacity: 0.35 + rng.range(0, 0.15),
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  group.add(dome);

  // Inner core
  const coreGeo = new THREE.SphereGeometry(bodyRadius * 0.4, 16, 12);
  const coreColor = color.clone();
  const coreMat = createGlowMaterial(coreColor, { emissiveIntensity: 0.9, opacity: 0.8 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = bodyRadius * 0.15;
  group.add(core);

  // Membrane veins
  for (let v = 0; v < rng.int(3, 5); v++) {
    const points: THREE.Vector3[] = [];
    const startAngle = rng.range(0, Math.PI * 2);
    for (let s = 0; s < 3; s++) {
      const t = s / 2;
      const angle = startAngle + rng.range(-0.3, 0.3);
      const r = bodyRadius * (0.2 + t * 0.7);
      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        (1 - t) * bodyRadius * 0.8,
        Math.sin(angle) * r,
      ));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);
  }

  // Tendrils
  const tendrilCount = rng.int(5, 12);
  const tendrilSegments: THREE.Mesh[][] = [];

  for (let t = 0; t < tendrilCount; t++) {
    const tendrilAngle = (t / tendrilCount) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const attachRadius = bodyRadius * rng.range(0.5, 0.9);
    const tendrilLength = rng.range(3, 8) * scale;
    const segCount = rng.int(6, 10);
    const segments: THREE.Mesh[] = [];

    for (let s = 0; s < segCount; s++) {
      const tParam = s / segCount;
      const segHeight = tendrilLength / segCount;
      const segRadius = Math.max(0.02, (0.12 - tParam * 0.1) * scale);
      const geo = new THREE.CylinderGeometry(segRadius * 0.8, segRadius, segHeight, 5);
      const mat = createGlowMaterial(color, {
        emissiveIntensity: 0.4,
        opacity: Math.max(0.1, 0.7 - tParam * 0.5),
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Position along curved tendril path
      const curveFactor = 0.3;
      mesh.position.set(
        Math.cos(tendrilAngle) * (attachRadius + tParam * curveFactor * scale),
        -(s * segHeight + segHeight / 2),
        Math.sin(tendrilAngle) * (attachRadius + tParam * curveFactor * scale),
      );
      group.add(mesh);
      segments.push(mesh);
    }
    tendrilSegments.push(segments);
  }

  // Float well above ground
  const floatY = rng.range(4, 8) * scale;
  group.position.y = floatY;
  const baseY = floatY;

  const light = createStructureLight(color, priority, { intensity: priority / 8 + 0.2 });
  group.add(light);

  const boundingRadius = Math.max(bodyRadius + 1, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Gentle bobbing
    group.position.y = baseY + Math.sin(elapsed * 0.4) * 0.5;

    // Breathing dome
    dome.scale.y = 1 + Math.sin(elapsed * 0.6) * 0.05;

    // Tendril wave animation
    tendrilSegments.forEach((segments, ti) => {
      segments.forEach((seg, si) => {
        seg.rotation.x = Math.sin(elapsed * 0.5 + si * 0.3) * 0.03;
        seg.rotation.z = Math.cos(elapsed * 0.5 + ti * 0.4 + si * 0.2) * 0.03;
      });
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('entity', entityGenerator);
