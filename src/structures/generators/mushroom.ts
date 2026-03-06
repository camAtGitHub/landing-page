import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const mushroomGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const largeMushCount = rng.int(1, 3);
  const smallMushCount = rng.int(2, 5);
  let maxHeight = 0;
  let maxRadius = 0;

  // Helper to create a mushroom
  const addMushroom = (isLarge: boolean, baseX: number, baseZ: number): void => {
    const stemH = isLarge ? rng.range(3, 7) * scale : rng.range(0.5, 2) * scale;
    const stemRadTop = isLarge ? rng.range(0.3, 0.5) * scale : rng.range(0.1, 0.2) * scale;
    const stemRadBot = stemRadTop * 1.3;
    const capR = isLarge ? rng.range(1, 2.5) * scale : rng.range(0.3, 0.8) * scale;
    const tilt = rng.range(-0.1, 0.1);

    // Stem
    const stemGeo = new THREE.CylinderGeometry(stemRadTop, stemRadBot, stemH, 8);
    const stemMat = createGlowMaterial(color, { emissiveIntensity: 0.2, opacity: 0.95 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(baseX, stemH / 2, baseZ);
    stem.rotation.z = tilt;
    group.add(stem);

    // Cap (partial sphere - dome)
    const capGeo = new THREE.SphereGeometry(capR, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const capMat = createGlowMaterial(color, {
      emissiveIntensity: rng.range(0.6, 0.9),
      opacity: 0.7,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(baseX, stemH, baseZ);
    group.add(cap);

    // Gill underside ring
    const gillGeo = new THREE.RingGeometry(capR * 0.3, capR * 0.95, 24);
    const gillMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const gills = new THREE.Mesh(gillGeo, gillMat);
    gills.position.set(baseX, stemH - 0.05, baseZ);
    gills.rotation.x = Math.PI / 2;
    group.add(gills);

    // Spore dots above cap
    if (isLarge) {
      const sporeCount = rng.int(5, 10);
      for (let s = 0; s < sporeCount; s++) {
        const sporeGeo = new THREE.SphereGeometry(rng.range(0.05, 0.1), 4, 4);
        const sporeMat = createGlowMaterial(color, { emissiveIntensity: 0.9, opacity: 0.7 });
        const spore = new THREE.Mesh(sporeGeo, sporeMat);
        const angle = rng.range(0, Math.PI * 2);
        const dist = rng.range(0, capR);
        spore.position.set(
          baseX + Math.cos(angle) * dist,
          stemH + capR + rng.range(0, capR * 0.8),
          baseZ + Math.sin(angle) * dist,
        );
        group.add(spore);
      }
    }

    if (stemH + capR > maxHeight) maxHeight = stemH + capR;
    const r = Math.sqrt(baseX * baseX + baseZ * baseZ) + capR;
    if (r > maxRadius) maxRadius = r;
  };

  // Large mushrooms at center
  for (let i = 0; i < largeMushCount; i++) {
    const angle = (i / largeMushCount) * Math.PI * 2;
    const dist = rng.range(0, 1.5) * scale;
    addMushroom(true, Math.cos(angle) * dist, Math.sin(angle) * dist);
  }

  // Small mushrooms clustered at base of large ones
  for (let i = 0; i < smallMushCount; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0.5, 2) * scale;
    addMushroom(false, Math.cos(angle) * dist, Math.sin(angle) * dist);
  }

  const light = createStructureLight(color, priority);
  light.position.set(0, maxHeight * 0.7, 0);
  group.add(light);

  const boundingRadius = Math.max(maxRadius, 1);

  // Track original Y positions for oscillation baseline
  const meshOriginalY: { mesh: THREE.Mesh; y: number }[] = [];
  group.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      meshOriginalY.push({ mesh: child, y: child.position.y });
    }
  });

  const update = (elapsed: number, _delta: number): void => {
    meshOriginalY.forEach(({ mesh }, i) => {
      mesh.position.y = meshOriginalY[i].y + Math.sin(elapsed * 0.5 + i * 0.3) * 0.05;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('mushroom', mushroomGenerator);
