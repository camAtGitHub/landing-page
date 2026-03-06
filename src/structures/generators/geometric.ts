import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const geometricGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const bodyRadius = rng.range(0.8, 1.8) * scale;
  const shapeType = rng.int(0, 2);

  // Central body - platonic solid
  let bodyGeo: THREE.BufferGeometry;
  switch (shapeType) {
    case 0: bodyGeo = new THREE.IcosahedronGeometry(bodyRadius, 0); break;
    case 1: bodyGeo = new THREE.OctahedronGeometry(bodyRadius, 0); break;
    default: bodyGeo = new THREE.DodecahedronGeometry(bodyRadius, 0); break;
  }
  const bodyMat = createGlowMaterial(color, { emissiveIntensity: 0.7 + rng.range(0, 0.3), opacity: 0.9 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Orbital rings
  const ringCount = rng.int(1, 3);
  const rings: THREE.Mesh[] = [];
  for (let r = 0; r < ringCount; r++) {
    const ringRadius = bodyRadius * rng.range(1.5, 2.5);
    const tubeRadius = rng.range(0.03, 0.08) * scale;
    const geo = new THREE.TorusGeometry(ringRadius, tubeRadius, 16, 64);
    const mat = createGlowMaterial(color, { emissiveIntensity: 0.6, opacity: 0.7 });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = rng.range(0, Math.PI);
    ring.rotation.z = rng.range(0, Math.PI);
    group.add(ring);
    rings.push(ring);
  }

  // Aura dots
  const dotCount = rng.int(10, 20);
  const dotPositions: THREE.Vector3[] = [];
  for (let d = 0; d < dotCount; d++) {
    const dotGeo = new THREE.SphereGeometry(rng.range(0.05, 0.1), 4, 4);
    const dotMat = createGlowMaterial(color, { emissiveIntensity: 0.8, opacity: 0.6 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    const angle1 = rng.range(0, Math.PI * 2);
    const angle2 = rng.range(0, Math.PI);
    const dist = bodyRadius * rng.range(1.0, 2.0);
    const pos = new THREE.Vector3(
      Math.sin(angle2) * Math.cos(angle1) * dist,
      Math.cos(angle2) * dist,
      Math.sin(angle2) * Math.sin(angle1) * dist,
    );
    dot.position.copy(pos);
    dotPositions.push(pos.clone());
    group.add(dot);
  }

  // Float above ground - local Y offset
  const floatHeight = rng.range(2, 5) * scale;
  group.position.y = floatHeight;

  const light = createStructureLight(color, priority, { intensity: priority / 9 + 0.1 });
  group.add(light);

  const boundingRadius = Math.max(bodyRadius * 2.5, 1);

  const auraStartIdx = 1 + ringCount; // body (0) + rings

  const update = (elapsed: number, _delta: number): void => {
    body.rotation.y = elapsed * 0.1;
    body.rotation.x = elapsed * 0.07;

    rings.forEach((ring, i) => {
      ring.rotation.y = elapsed * (0.2 + i * 0.15) * (i % 2 === 0 ? 1 : -1);
    });

    // Slowly orbit aura dots
    let di = 0;
    group.children.forEach((child, idx) => {
      if (idx >= auraStartIdx && child instanceof THREE.Mesh && dotPositions[di]) {
        const basePos = dotPositions[di];
        const angle = elapsed * 0.3 + di * 0.8;
        child.position.x = basePos.x * Math.cos(angle) - basePos.z * Math.sin(angle);
        child.position.z = basePos.x * Math.sin(angle) + basePos.z * Math.cos(angle);
        di++;
      }
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('geometric', geometricGenerator);
