import * as THREE from 'three';
import {
  SeededRNG,
  createGlowMaterial,
  createAdditiveGlowMaterial,
  createStructureLight,
  priorityScale,
  shiftHue,
  adjustBrightness,
  disposeGroup,
} from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const mushroomGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const capAccent = shiftHue(color, rng.range(0.06, 0.14));
  const gillColor = shiftHue(color, rng.range(-0.15, -0.08));
  const coreGlow = adjustBrightness(color, 1.8);
  const stemTint = color.clone().multiplyScalar(0.35);

  const largeMushCount = rng.int(2, 4);
  const smallMushCount = rng.int(4, 8);
  let maxHeight = 0;
  let maxRadius = 0;

  const capMeshes: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
  const gillRings: { mesh: THREE.Mesh; phase: number }[] = [];

  const addMushroom = (isLarge: boolean, baseX: number, baseZ: number): void => {
    const stemH = isLarge ? rng.range(3.5, 8) * scale : rng.range(0.8, 2.5) * scale;
    const stemRadTop = isLarge ? rng.range(0.25, 0.45) * scale : rng.range(0.08, 0.18) * scale;
    const stemRadBot = stemRadTop * rng.range(1.25, 1.5);
    const capR = isLarge ? rng.range(1.2, 2.8) * scale : rng.range(0.35, 0.9) * scale;
    const tilt = rng.range(-0.08, 0.08);

    // === Stem with gradient glow ===
    const stemSegCount = isLarge ? 3 : 1;
    for (let ss = 0; ss < stemSegCount; ss++) {
      const t = ss / Math.max(stemSegCount - 1, 1);
      const segH = stemH / stemSegCount;
      const topR = stemRadTop + (stemRadBot - stemRadTop) * (1 - (t + 1 / stemSegCount));
      const botR = stemRadTop + (stemRadBot - stemRadTop) * (1 - t);
      const geo = new THREE.CylinderGeometry(topR, botR, segH * 1.05, 10);
      const segColor = stemTint.clone().lerp(color, t * 0.3);
      const mat = createGlowMaterial(segColor, {
        emissiveIntensity: 0.15 + t * 0.35,
        opacity: 0.92,
        roughness: 0.5 - t * 0.15,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(baseX, t * stemH + segH / 2, baseZ);
      mesh.rotation.z = tilt;
      group.add(mesh);
    }

    // === Luminous veins on stem ===
    if (isLarge) {
      const veinCount = rng.int(3, 6);
      for (let v = 0; v < veinCount; v++) {
        const vAngle = (v / veinCount) * Math.PI * 2;
        const veinGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, stemH * 0.85, 4);
        const veinMat = createAdditiveGlowMaterial(coreGlow, {
          emissiveIntensity: 1.0,
          opacity: 0.3,
        });
        const vein = new THREE.Mesh(veinGeo, veinMat);
        vein.position.set(
          baseX + Math.cos(vAngle) * stemRadBot * 0.9,
          stemH * 0.45,
          baseZ + Math.sin(vAngle) * stemRadBot * 0.9,
        );
        group.add(vein);
      }
    }

    // === Cap (dome) with rich translucent layers ===
    const capGeo = new THREE.SphereGeometry(capR, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const capColor = rng.chance(0.5) ? color.clone() : capAccent.clone();
    const capMat = createGlowMaterial(capColor, {
      emissiveIntensity: rng.range(0.7, 1.2),
      opacity: 0.65,
      roughness: 0.12,
      metalness: 0.2,
    });
    capMat.depthWrite = false;
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(baseX, stemH, baseZ);
    group.add(cap);

    capMeshes.push({
      mesh: cap,
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.8, 1.6),
    });

    // Inner cap glow layer
    if (isLarge) {
      const innerCapGeo = new THREE.SphereGeometry(capR * 0.7, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const innerCapMat = createAdditiveGlowMaterial(coreGlow, {
        emissiveIntensity: 1.5,
        opacity: 0.2,
      });
      const innerCap = new THREE.Mesh(innerCapGeo, innerCapMat);
      innerCap.position.set(baseX, stemH + capR * 0.05, baseZ);
      group.add(innerCap);
    }

    // Cap edge glow rim
    const rimGeo = new THREE.TorusGeometry(capR * 0.95, 0.04 * scale, 8, 32);
    const rimMat = createAdditiveGlowMaterial(capAccent, {
      emissiveIntensity: 1.2,
      opacity: 0.4,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(baseX, stemH - capR * 0.08, baseZ);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // === Gill underside — radial lines + ring ===
    const gillGeo = new THREE.RingGeometry(capR * 0.2, capR * 0.92, 32);
    const gillMat = new THREE.MeshStandardMaterial({
      color: gillColor,
      emissive: gillColor,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const gills = new THREE.Mesh(gillGeo, gillMat);
    gills.position.set(baseX, stemH - 0.05, baseZ);
    gills.rotation.x = Math.PI / 2;
    group.add(gills);

    gillRings.push({
      mesh: gills,
      phase: rng.range(0, Math.PI * 2),
    });

    // Radial gill lines
    if (isLarge) {
      const gillLineCount = rng.int(10, 18);
      for (let g = 0; g < gillLineCount; g++) {
        const gillAngle = (g / gillLineCount) * Math.PI * 2;
        const gillLen = capR * rng.range(0.5, 0.9);
        const lineGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, gillLen, 4);
        const lineMat = createAdditiveGlowMaterial(gillColor, {
          emissiveIntensity: 0.8,
          opacity: 0.25,
        });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(
          baseX + Math.cos(gillAngle) * gillLen * 0.4,
          stemH - capR * 0.15,
          baseZ + Math.sin(gillAngle) * gillLen * 0.4,
        );
        line.rotation.z = Math.PI / 2;
        line.rotation.y = gillAngle;
        group.add(line);
      }
    }

    if (stemH + capR > maxHeight) maxHeight = stemH + capR;
    const r = Math.sqrt(baseX * baseX + baseZ * baseZ) + capR;
    if (r > maxRadius) maxRadius = r;
  };

  // Large mushrooms arranged centrally
  for (let i = 0; i < largeMushCount; i++) {
    const angle = (i / largeMushCount) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const dist = rng.range(0, 1.8) * scale;
    addMushroom(true, Math.cos(angle) * dist, Math.sin(angle) * dist);
  }

  // Small mushrooms clustered around bases
  for (let i = 0; i < smallMushCount; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0.5, 2.8) * scale;
    addMushroom(false, Math.cos(angle) * dist, Math.sin(angle) * dist);
  }

  // === Ground glow pool ===
  const poolGeo = new THREE.RingGeometry(0.3, maxRadius * 1.1, 32);
  const poolMat = createAdditiveGlowMaterial(gillColor, {
    emissiveIntensity: 0.5,
    opacity: 0.12,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.02;
  group.add(pool);

  // === Spore cloud (Points) ===
  const sporeCount = rng.int(35, 65);
  const sporePos = new Float32Array(sporeCount * 3);
  const sporeSpeeds = new Float32Array(sporeCount);
  const sporePhases = new Float32Array(sporeCount);

  for (let i = 0; i < sporeCount; i++) {
    const i3 = i * 3;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0, maxRadius * 1.8);
    sporePos[i3] = Math.cos(angle) * dist;
    sporePos[i3 + 1] = rng.range(0.3, maxHeight * 1.4);
    sporePos[i3 + 2] = Math.sin(angle) * dist;
    sporeSpeeds[i] = rng.range(0.15, 0.65);
    sporePhases[i] = rng.range(0, Math.PI * 2);
  }

  const sporeGeo = new THREE.BufferGeometry();
  const sporePosAttr = new THREE.BufferAttribute(sporePos, 3);
  sporeGeo.setAttribute('position', sporePosAttr);
  const sporeMat = new THREE.PointsMaterial({
    color: coreGlow,
    size: 0.1 * scale,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const spores = new THREE.Points(sporeGeo, sporeMat);
  group.add(spores);

  // === Lights ===
  const light = createStructureLight(color, priority, {
    intensity: priority / 5 + 0.4,
    distance: 22 + priority * 3,
  });
  light.position.set(0, maxHeight * 0.6, 0);
  group.add(light);

  const gillLight = new THREE.PointLight(gillColor, priority / 10, maxRadius * 3);
  gillLight.position.set(0, maxHeight * 0.35, 0);
  group.add(gillLight);

  const boundingRadius = Math.max(maxRadius * 1.3, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Cap breathing
    capMeshes.forEach(({ mesh, phase, speed }) => {
      const breath = 1 + Math.sin(elapsed * speed + phase) * 0.04;
      mesh.scale.set(breath, 1 + Math.sin(elapsed * speed * 1.2 + phase) * 0.06, breath);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.7 + Math.sin(elapsed * speed * 1.5 + phase) * 0.35;
    });

    // Gill glow pulse
    gillRings.forEach(({ mesh, phase }) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(elapsed * 1.2 + phase) * 0.25;
    });

    // Spore drift
    const posArr = sporePosAttr.array as Float32Array;
    for (let i = 0; i < sporeCount; i++) {
      const i3 = i * 3;
      posArr[i3] += Math.sin(elapsed * sporeSpeeds[i] + sporePhases[i]) * 0.004;
      posArr[i3 + 1] += sporeSpeeds[i] * 0.005;
      posArr[i3 + 2] += Math.cos(elapsed * sporeSpeeds[i] * 0.8 + sporePhases[i]) * 0.004;

      if (posArr[i3 + 1] > maxHeight * 1.8) {
        const angle = sporePhases[i];
        posArr[i3] = Math.cos(angle) * maxRadius * 0.5;
        posArr[i3 + 1] = maxHeight * 0.3;
        posArr[i3 + 2] = Math.sin(angle) * maxRadius * 0.5;
      }
    }
    sporePosAttr.needsUpdate = true;

    // Ground pool pulse
    (pool.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.35 + Math.sin(elapsed * 0.6) * 0.15;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('mushroom', mushroomGenerator);
