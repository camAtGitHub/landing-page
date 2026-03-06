import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const architectureGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const totalHeight = rng.range(6, 15) * scale;
  const subVariant = rng.int(0, 2); // 0=stepped, 1=monolith, 2=spired

  // Dark body color (dark variant of the provided color)
  const darkColor = color.clone().multiplyScalar(0.2);

  const dataCascadeElements: THREE.Mesh[] = [];
  let maxRadius = 0;

  if (subVariant === 0) {
    // Stepped tower
    const stepCount = rng.int(3, 6);
    for (let s = 0; s < stepCount; s++) {
      const t = s / (stepCount - 1);
      const width = (2.5 - t * 1.8) * scale;
      const height = rng.range(1, 3) * scale;
      const geo = new THREE.BoxGeometry(width, height, width * rng.range(0.8, 1.2));
      const mat = new THREE.MeshStandardMaterial({
        color: darkColor,
        emissive: darkColor,
        emissiveIntensity: 0.15,
        roughness: 0.3,
        metalness: 0.8,
      });
      const block = new THREE.Mesh(geo, mat);
      block.position.y = s * (totalHeight / stepCount) + height / 2;
      group.add(block);
      if (width / 2 > maxRadius) maxRadius = width / 2;
    }
  } else if (subVariant === 1) {
    // Monolith slab
    const width = 2 * scale;
    const depth = 0.6 * scale;
    const geo = new THREE.BoxGeometry(width, totalHeight, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: darkColor,
      emissive: darkColor,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.8,
    });
    const slab = new THREE.Mesh(geo, mat);
    slab.position.y = totalHeight / 2;
    group.add(slab);
    maxRadius = Math.max(width, depth) / 2;

    // Protruding elements
    for (let p = 0; p < rng.int(2, 4); p++) {
      const proGeo = new THREE.BoxGeometry(0.4 * scale, rng.range(0.5, 2) * scale, 0.4 * scale);
      const proMat = new THREE.MeshStandardMaterial({
        color: darkColor, emissive: darkColor, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.8,
      });
      const pro = new THREE.Mesh(proGeo, proMat);
      pro.position.set(
        (rng.chance(0.5) ? 1 : -1) * (width / 2 + 0.2 * scale),
        rng.range(1, totalHeight - 1),
        0,
      );
      group.add(pro);
    }
  } else {
    // Spired cathedral
    const sides = rng.int(4, 6);
    const mainGeo = new THREE.CylinderGeometry(0.5 * scale, 1.2 * scale, totalHeight, sides);
    const mainMat = new THREE.MeshStandardMaterial({
      color: darkColor, emissive: darkColor, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.8,
    });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.position.y = totalHeight / 2;
    group.add(main);
    maxRadius = 1.2 * scale;

    // Flanking spires
    const spireCount = rng.int(2, 4);
    for (let sp = 0; sp < spireCount; sp++) {
      const spireH = totalHeight * rng.range(0.4, 0.7);
      const angle = (sp / spireCount) * Math.PI * 2;
      const dist = 1.5 * scale;
      const spireGeo = new THREE.CylinderGeometry(0.1 * scale, 0.4 * scale, spireH, 4);
      const spireMat = new THREE.MeshStandardMaterial({
        color: darkColor, emissive: darkColor, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.8,
      });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.set(Math.cos(angle) * dist, spireH / 2, Math.sin(angle) * dist);
      group.add(spire);
    }
  }

  // Foundation platform
  const foundGeo = new THREE.BoxGeometry(maxRadius * 2.5 + scale, 0.3 * scale, maxRadius * 2.5 + scale);
  const foundMat = new THREE.MeshStandardMaterial({
    color: darkColor, emissive: darkColor, emissiveIntensity: 0.1, roughness: 0.5, metalness: 0.6,
  });
  const foundation = new THREE.Mesh(foundGeo, foundMat);
  foundation.position.y = 0.15 * scale;
  group.add(foundation);

  // Glowing window panels
  const panelCount = rng.int(3, 8);
  for (let p = 0; p < panelCount; p++) {
    const panelGeo = new THREE.BoxGeometry(0.15 * scale, 0.1 * scale, 0.05);
    const panelMat = createGlowMaterial(color, { emissiveIntensity: 0.8, opacity: 0.95 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(
      rng.range(-maxRadius, maxRadius) * 0.8,
      rng.range(0.5, totalHeight * 0.9),
      maxRadius * rng.range(0.8, 1.0),
    );
    group.add(panel);
  }

  // Data cascade column
  const cascadeCount = rng.int(10, 20);
  for (let c = 0; c < cascadeCount; c++) {
    const cascGeo = new THREE.BoxGeometry(0.08 * scale, 0.06 * scale, 0.04);
    const cascMat = createGlowMaterial(color, { emissiveIntensity: 0.9, opacity: 0.8 });
    const casc = new THREE.Mesh(cascGeo, cascMat);
    casc.position.set(
      maxRadius * 1.0,
      (c / cascadeCount) * totalHeight,
      maxRadius * 0.5,
    );
    group.add(casc);
    dataCascadeElements.push(casc);
  }

  const light = createStructureLight(color, priority);
  light.position.set(0, totalHeight + 1, 0);
  group.add(light);

  const boundingRadius = Math.max(maxRadius + 1, 1);

  let cascadeOffset = 0;

  const update = (elapsed: number, _delta: number): void => {
    // Architecture does NOT rotate - only light effects animate
    const cycleSpeed = 3;
    cascadeOffset = (elapsed * cycleSpeed) % cascadeCount;
    dataCascadeElements.forEach((el, i) => {
      const mat = el.material as THREE.MeshStandardMaterial;
      const active = ((i + Math.floor(cascadeOffset)) % cascadeCount) < cascadeCount * 0.4;
      mat.emissiveIntensity = active ? 0.9 : 0.1;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('architecture', architectureGenerator);
