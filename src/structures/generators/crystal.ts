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

const crystalGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const accent = shiftHue(color, rng.range(0.08, 0.18));
  const innerGlow = adjustBrightness(color, 1.6);

  const prismCount = rng.int(5, 12);
  let maxRadius = 0;
  let maxHeight = 0;
  const crystals: { mesh: THREE.Mesh; baseY: number; phase: number; speed: number }[] = [];

  // --- Main crystal prisms ---
  for (let i = 0; i < prismCount; i++) {
    const isLarge = i < 3;
    const height = rng.range(isLarge ? 4 : 1.5, isLarge ? 10 : 5) * scale;
    const radiusBot = rng.range(isLarge ? 0.35 : 0.12, isLarge ? 0.75 : 0.35) * scale;
    const radiusTop = radiusBot * rng.range(0.15, 0.45);
    const segments = rng.int(5, 8);
    const tiltX = rng.range(-0.25, 0.25);
    const tiltZ = rng.range(-0.25, 0.25);
    const offsetDist = rng.range(0, isLarge ? 1.2 : 2.5) * scale;
    const offsetAngle = rng.range(0, Math.PI * 2);

    const geo = new THREE.CylinderGeometry(radiusTop, radiusBot, height, segments);

    // Alternate between base color and accent for visual richness
    const matColor = rng.chance(0.5) ? color.clone() : accent.clone();
    const mat = createGlowMaterial(matColor, {
      emissiveIntensity: rng.range(0.6, 1.2),
      opacity: rng.range(0.5, 0.78),
      roughness: rng.range(0.08, 0.2),
      metalness: rng.range(0.4, 0.8),
    });
    mat.depthWrite = false;

    const mesh = new THREE.Mesh(geo, mat);
    const px = Math.cos(offsetAngle) * offsetDist;
    const pz = Math.sin(offsetAngle) * offsetDist;
    mesh.position.set(px, height / 2, pz);
    mesh.rotation.x = tiltX;
    mesh.rotation.z = tiltZ;
    group.add(mesh);

    crystals.push({
      mesh,
      baseY: height / 2,
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.6, 1.4),
    });

    const r = offsetDist + radiusBot;
    if (r > maxRadius) maxRadius = r;
    if (height > maxHeight) maxHeight = height;
  }

  // --- Inner core glow orb ---
  const coreRadius = rng.range(0.6, 1.2) * scale;
  const coreGeo = new THREE.SphereGeometry(coreRadius, 16, 12);
  const coreMat = createAdditiveGlowMaterial(innerGlow, {
    emissiveIntensity: 2.0,
    opacity: 0.3,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, maxHeight * 0.4, 0);
  group.add(core);

  // --- Outer aura halo ---
  const auraGeo = new THREE.SphereGeometry(coreRadius * 2.5, 14, 10);
  const auraMat = createAdditiveGlowMaterial(color, {
    emissiveIntensity: 0.6,
    opacity: 0.1,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.position.copy(core.position);
  group.add(aura);

  // --- Base ground glow ring ---
  const baseRingGeo = new THREE.TorusGeometry(maxRadius * 1.2, 0.08 * scale, 8, 32);
  const baseRingMat = createAdditiveGlowMaterial(accent, {
    emissiveIntensity: 0.8,
    opacity: 0.25,
  });
  const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.05;
  group.add(baseRing);

  // --- Floating energy motes (Points) ---
  const moteCount = rng.int(30, 60);
  const motePositions = new Float32Array(moteCount * 3);
  const moteSpeeds = new Float32Array(moteCount);
  const motePhases = new Float32Array(moteCount);
  const moteDrifts = new Float32Array(moteCount);

  for (let i = 0; i < moteCount; i++) {
    const i3 = i * 3;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0.2, maxRadius * 2);
    motePositions[i3] = Math.cos(angle) * dist;
    motePositions[i3 + 1] = rng.range(0.5, maxHeight * 1.3);
    motePositions[i3 + 2] = Math.sin(angle) * dist;
    moteSpeeds[i] = rng.range(0.3, 1.0);
    motePhases[i] = rng.range(0, Math.PI * 2);
    moteDrifts[i] = rng.range(0.3, 1.2);
  }

  const moteGeo = new THREE.BufferGeometry();
  const motePosAttr = new THREE.BufferAttribute(motePositions, 3);
  moteGeo.setAttribute('position', motePosAttr);

  const moteMat = new THREE.PointsMaterial({
    color: innerGlow,
    size: 0.15 * scale,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  // --- Lights ---
  const mainLight = createStructureLight(color, priority, {
    intensity: priority / 6 + 0.4,
    distance: 20 + priority * 3,
  });
  mainLight.position.set(0, maxHeight * 0.7, 0);
  group.add(mainLight);

  const accentLight = new THREE.PointLight(accent, priority / 12, maxRadius * 4);
  accentLight.position.set(0, maxHeight * 0.3, 0);
  group.add(accentLight);

  const boundingRadius = Math.max(maxRadius * 1.5, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Slow group rotation
    group.rotation.y = elapsed * 0.03;

    // Pulsing crystal emissive
    crystals.forEach(({ mesh, phase, speed }) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(elapsed * speed + phase) * 0.4;
    });

    // Core breathing
    const coreBreath = 1 + Math.sin(elapsed * 1.2) * 0.15;
    core.scale.setScalar(coreBreath);
    (core.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.5 + Math.sin(elapsed * 1.8) * 0.5;

    // Aura pulse
    const auraPulse = 1 + Math.sin(elapsed * 0.8) * 0.1;
    aura.scale.setScalar(auraPulse);

    // Mote animation
    const posArr = motePosAttr.array as Float32Array;
    for (let i = 0; i < moteCount; i++) {
      const i3 = i * 3;
      posArr[i3] += Math.sin(elapsed * moteSpeeds[i] + motePhases[i]) * 0.008 * moteDrifts[i];
      posArr[i3 + 1] += moteSpeeds[i] * 0.008;
      posArr[i3 + 2] += Math.cos(elapsed * moteSpeeds[i] * 0.7 + motePhases[i]) * 0.008 * moteDrifts[i];

      // Reset motes that float too high
      if (posArr[i3 + 1] > maxHeight * 1.5) {
        const angle = motePhases[i];
        const dist = moteDrifts[i] * maxRadius;
        posArr[i3] = Math.cos(angle) * dist;
        posArr[i3 + 1] = 0.2;
        posArr[i3 + 2] = Math.sin(angle) * dist;
      }
    }
    motePosAttr.needsUpdate = true;

    // Base ring rotation
    baseRing.rotation.z = elapsed * 0.05;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('crystal', crystalGenerator);
