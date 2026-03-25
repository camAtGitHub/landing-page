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

const architectureGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const trunkHeight = rng.range(7.5, 12) * scale;
  const trunkRadius = rng.range(0.5, 0.85) * scale;
  const trunkColor = color.clone().multiplyScalar(0.28);
  const helixColor = shiftHue(color, rng.range(0.12, 0.22));
  const canopyColor = shiftHue(color, rng.range(-0.08, 0.05));
  const coreGlow = adjustBrightness(color, 1.8);

  // === TRUNK — segmented with gradient luminescence ===
  const trunkSegments = rng.int(10, 16);
  for (let s = 0; s < trunkSegments; s++) {
    const t = s / trunkSegments;
    const segH = trunkHeight / trunkSegments;
    const topR = trunkRadius * (0.55 + (1 - t) * 0.45);
    const botR = trunkRadius * (0.6 + (1 - t) * 0.55);
    const geo = new THREE.CylinderGeometry(topR, botR, segH * 1.05, 12);
    const segColor = trunkColor.clone().lerp(color, t * 0.35);
    const mat = createGlowMaterial(segColor, {
      emissiveIntensity: 0.15 + t * 0.4,
      opacity: 0.92,
      roughness: 0.5 - t * 0.15,
      metalness: 0.2 + t * 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = t * trunkHeight + segH / 2;
    group.add(mesh);
  }

  // === ENERGY HELIXES — spiraling luminous strands ===
  const helixCount = rng.int(2, 4);
  const helixSegments: THREE.Mesh[] = [];
  const helixAnimData: Array<{ phase: number; speed: number; direction: number }> = [];

  for (let h = 0; h < helixCount; h++) {
    const direction = h % 2 === 0 ? 1 : -1;
    const phase = rng.range(0, Math.PI * 2);
    const segmentCount = rng.int(35, 55);
    const helixR = trunkRadius * rng.range(1.0, 1.4);
    const hColor = h % 2 === 0 ? helixColor : coreGlow;

    for (let s = 0; s < segmentCount; s++) {
      const t = s / Math.max(segmentCount - 1, 1);
      const angle = direction * t * Math.PI * rng.range(6, 9) + phase;
      const size = 0.04 * scale * (0.6 + (1 - Math.abs(t - 0.5) * 2) * 0.6);

      const segGeo = new THREE.SphereGeometry(size, 6, 5);
      const segMat = createAdditiveGlowMaterial(hColor, {
        emissiveIntensity: 1.2 + Math.sin(t * Math.PI) * 0.6,
        opacity: 0.5 + Math.sin(t * Math.PI) * 0.2,
      });
      const segment = new THREE.Mesh(segGeo, segMat);
      segment.position.set(
        Math.cos(angle) * helixR,
        t * trunkHeight,
        Math.sin(angle) * helixR,
      );
      group.add(segment);
      helixSegments.push(segment);
      helixAnimData.push({
        phase: phase + s * 0.05,
        speed: rng.range(0.3, 0.6),
        direction,
      });
    }
  }

  // === CANOPY — rich organic clusters ===
  const canopyClusterCount = rng.int(5, 9);
  const canopyLeaves: { mesh: THREE.Mesh; basePos: THREE.Vector3; phase: number; amplitude: number }[] = [];

  for (let c = 0; c < canopyClusterCount; c++) {
    const clusterAngle = (c / canopyClusterCount) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const clusterHeight = trunkHeight * rng.range(0.72, 0.98);
    const branchLen = rng.range(1.5, 3.2) * scale;

    // Branch arm with gradient
    const branchSegs = rng.int(4, 7);
    for (let bs = 0; bs < branchSegs; bs++) {
      const bt = bs / branchSegs;
      const bSize = 0.05 * scale * (1 - bt * 0.5);
      const bGeo = new THREE.SphereGeometry(bSize, 6, 5);
      const bColor = trunkColor.clone().lerp(canopyColor, bt * 0.6);
      const bMat = createGlowMaterial(bColor, {
        emissiveIntensity: 0.2 + bt * 0.4,
        opacity: 0.8,
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      // Curve outward and slightly up
      bMesh.position.set(
        Math.cos(clusterAngle) * branchLen * bt,
        clusterHeight + bt * 0.5 * scale,
        Math.sin(clusterAngle) * branchLen * bt,
      );
      group.add(bMesh);
    }

    // Leaf cluster at branch tip — varied shapes
    const leafCount = rng.int(6, 14);
    for (let l = 0; l < leafCount; l++) {
      const isLargeLeaf = l < 3;
      const leafSize = rng.range(
        isLargeLeaf ? 0.25 : 0.12,
        isLargeLeaf ? 0.55 : 0.3,
      ) * scale;

      // Use icosahedrons for organic look
      const leafGeo = new THREE.IcosahedronGeometry(leafSize, isLargeLeaf ? 1 : 0);
      const lColor = rng.chance(0.6) ? canopyColor.clone() : color.clone();
      const leafMat = createGlowMaterial(lColor, {
        emissiveIntensity: rng.range(0.6, 1.3),
        opacity: rng.range(0.4, 0.7),
        roughness: 0.12,
        metalness: 0.25,
      });
      leafMat.depthWrite = false;
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const lx = Math.cos(clusterAngle) * branchLen + rng.range(-0.5, 0.5) * scale;
      const ly = clusterHeight + rng.range(-0.2, 0.9) * scale;
      const lz = Math.sin(clusterAngle) * branchLen + rng.range(-0.5, 0.5) * scale;
      leaf.position.set(lx, ly, lz);
      leaf.rotation.set(rng.range(0, Math.PI), rng.range(0, Math.PI), 0);
      group.add(leaf);

      canopyLeaves.push({
        mesh: leaf,
        basePos: leaf.position.clone(),
        phase: rng.range(0, Math.PI * 2),
        amplitude: rng.range(0.01, 0.06) * scale,
      });
    }

    // Cluster glow aura
    if (rng.chance(0.6)) {
      const auraGeo = new THREE.SphereGeometry(0.8 * scale, 10, 8);
      const auraMat = createAdditiveGlowMaterial(canopyColor, {
        emissiveIntensity: 0.4,
        opacity: 0.06,
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.position.set(
        Math.cos(clusterAngle) * branchLen,
        clusterHeight + 0.3 * scale,
        Math.sin(clusterAngle) * branchLen,
      );
      group.add(aura);
    }
  }

  // === ROOT SYSTEM — spreading organic roots ===
  const rootCount = rng.int(8, 14);
  for (let r = 0; r < rootCount; r++) {
    const rootAngle = (r / rootCount) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rootLen = rng.range(2.0, 4.0) * scale;
    const rootSegs = rng.int(6, 10);

    for (let rs = 0; rs < rootSegs; rs++) {
      const rt = rs / rootSegs;
      const rootSize = 0.06 * scale * (1 - rt * 0.65);
      const rootGeo = new THREE.SphereGeometry(rootSize, 6, 5);
      const rootMat = createGlowMaterial(trunkColor, {
        emissiveIntensity: 0.1 + (1 - rt) * 0.15,
        opacity: 0.75,
      });
      const rootMesh = new THREE.Mesh(rootGeo, rootMat);
      rootMesh.position.set(
        Math.cos(rootAngle) * rt * rootLen,
        -rt * rootLen * 0.18,
        Math.sin(rootAngle) * rt * rootLen,
      );
      group.add(rootMesh);
    }

    // Root tip glow
    if (rng.chance(0.5)) {
      const tipGeo = new THREE.SphereGeometry(0.08 * scale, 6, 5);
      const tipMat = createAdditiveGlowMaterial(helixColor, {
        emissiveIntensity: 0.8,
        opacity: 0.25,
      });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(
        Math.cos(rootAngle) * rootLen,
        -rootLen * 0.18,
        Math.sin(rootAngle) * rootLen,
      );
      group.add(tip);
    }
  }

  // === Ground glow ring ===
  const groundRingGeo = new THREE.TorusGeometry(trunkRadius * 3, 0.06 * scale, 8, 40);
  const groundRingMat = createAdditiveGlowMaterial(helixColor, {
    emissiveIntensity: 0.6,
    opacity: 0.18,
  });
  const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
  groundRing.rotation.x = Math.PI / 2;
  groundRing.position.y = 0.03;
  group.add(groundRing);

  // === Floating energy particles (Points) ===
  const moteCount = rng.int(35, 60);
  const motePositions = new Float32Array(moteCount * 3);
  const moteSpeeds = new Float32Array(moteCount);
  const motePhases = new Float32Array(moteCount);

  for (let i = 0; i < moteCount; i++) {
    const i3 = i * 3;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0, trunkRadius * 5);
    motePositions[i3] = Math.cos(angle) * dist;
    motePositions[i3 + 1] = rng.range(0, trunkHeight * 1.3);
    motePositions[i3 + 2] = Math.sin(angle) * dist;
    moteSpeeds[i] = rng.range(0.2, 0.7);
    motePhases[i] = rng.range(0, Math.PI * 2);
  }

  const moteGeo = new THREE.BufferGeometry();
  const motePosAttr = new THREE.BufferAttribute(motePositions, 3);
  moteGeo.setAttribute('position', motePosAttr);
  const moteMat = new THREE.PointsMaterial({
    color: coreGlow,
    size: 0.12 * scale,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  // === Lights ===
  const mainLight = createStructureLight(color.clone(), priority, {
    intensity: priority / 5 + 0.45,
    distance: 28 * scale,
  });
  mainLight.position.y = trunkHeight + 1 * scale;
  group.add(mainLight);

  const helixLight = new THREE.PointLight(helixColor, priority / 8, trunkRadius * 8);
  helixLight.position.y = trunkHeight * 0.5;
  group.add(helixLight);

  const groundLight = new THREE.PointLight(canopyColor, priority / 14, trunkRadius * 5);
  groundLight.position.y = 0.5;
  group.add(groundLight);

  const boundingRadius = Math.max(scale * 4, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Helix energy pulse — wave traveling up
    helixSegments.forEach((segment, index) => {
      const data = helixAnimData[index];
      const mat = segment.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.9 + Math.sin(elapsed * 1.8 + data.phase) * 0.4;
      mat.opacity = 0.4 + Math.sin(elapsed * 1.2 + data.phase) * 0.15;
    });

    // Canopy leaf breathing
    canopyLeaves.forEach(({ mesh, basePos, phase, amplitude }) => {
      mesh.position.y = basePos.y + Math.sin(elapsed * 0.7 + phase) * amplitude;
      mesh.position.x = basePos.x + Math.sin(elapsed * 0.4 + phase * 1.5) * amplitude * 0.3;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(elapsed * 1.0 + phase) * 0.35;
    });

    // Ground ring rotation
    groundRing.rotation.z = elapsed * 0.04;

    // Mote particles
    const posArr = motePosAttr.array as Float32Array;
    for (let i = 0; i < moteCount; i++) {
      const i3 = i * 3;
      posArr[i3] += Math.sin(elapsed * moteSpeeds[i] + motePhases[i]) * 0.005;
      posArr[i3 + 1] += moteSpeeds[i] * 0.005;
      posArr[i3 + 2] += Math.cos(elapsed * moteSpeeds[i] * 0.8 + motePhases[i]) * 0.005;

      if (posArr[i3 + 1] > trunkHeight * 1.5) {
        posArr[i3 + 1] = 0.1;
      }
    }
    motePosAttr.needsUpdate = true;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('architecture', architectureGenerator);
