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

const vortexGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const baseRadius = rng.range(0.9, 2.0) * scale;
  const columnHeight = rng.range(6, 14) * scale;
  const spiralTwist = rng.range(0.35, 0.85);
  const spiralRadius = rng.range(0.3, 1.0) * scale;
  const ringCount = rng.int(10, 20);

  const accentColor = shiftHue(color, rng.range(0.1, 0.2));
  const coreGlow = adjustBrightness(color, 1.8);
  const outerGlow = shiftHue(color, rng.range(-0.15, -0.08));

  // === Base pool — layered rings for depth ===
  const poolGeo = new THREE.RingGeometry(0.3, baseRadius, 40);
  const poolMat = createAdditiveGlowMaterial(color, {
    emissiveIntensity: 1.0,
    opacity: 0.35,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  group.add(pool);

  // Outer glow ring
  const outerPoolGeo = new THREE.RingGeometry(baseRadius, baseRadius * 1.8, 40);
  const outerPoolMat = createAdditiveGlowMaterial(outerGlow, {
    emissiveIntensity: 0.5,
    opacity: 0.15,
  });
  const outerPool = new THREE.Mesh(outerPoolGeo, outerPoolMat);
  outerPool.rotation.x = -Math.PI / 2;
  group.add(outerPool);

  // Inner bright core
  const coreDiskGeo = new THREE.CircleGeometry(0.4 * scale, 24);
  const coreDiskMat = createAdditiveGlowMaterial(coreGlow, {
    emissiveIntensity: 2.0,
    opacity: 0.3,
  });
  const coreDisk = new THREE.Mesh(coreDiskGeo, coreDiskMat);
  coreDisk.rotation.x = -Math.PI / 2;
  coreDisk.position.y = 0.02;
  group.add(coreDisk);

  // === Column rings (stacked torus) with gradient ===
  const columnRings: THREE.Mesh[] = [];
  for (let i = 0; i < ringCount; i++) {
    const t = i / (ringCount - 1);
    const ringRadius = baseRadius * (1 - t * 0.6);
    const tubeRadius = Math.max(0.03, rng.range(0.04, 0.1) * scale * (1 - t * 0.4));
    const geo = new THREE.TorusGeometry(ringRadius, tubeRadius, 10, 24);
    const ringColor = color.clone().lerp(accentColor, t);
    const mat = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringColor,
      emissiveIntensity: 0.7 + rng.range(0, 0.4),
      transparent: true,
      opacity: 0.4 + (1 - t) * 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(
      Math.sin(i * spiralTwist) * spiralRadius,
      (i / ringCount) * columnHeight,
      Math.cos(i * spiralTwist) * spiralRadius,
    );
    // Vary ring tilt for organic spiral
    ring.rotation.x = rng.range(-0.15, 0.15);
    ring.rotation.z = rng.range(-0.15, 0.15);
    group.add(ring);
    columnRings.push(ring);
  }

  // === Central energy column — vertical beam ===
  const beamSegCount = rng.int(8, 14);
  for (let b = 0; b < beamSegCount; b++) {
    const t = b / beamSegCount;
    const beamGeo = new THREE.CylinderGeometry(
      0.06 * scale * (1 - t * 0.5),
      0.08 * scale * (1 - t * 0.4),
      columnHeight / beamSegCount * 1.1,
      8,
    );
    const beamColor = coreGlow.clone().lerp(accentColor, t * 0.5);
    const beamMat = createAdditiveGlowMaterial(beamColor, {
      emissiveIntensity: 1.5 + (1 - t) * 0.8,
      opacity: 0.2 + (1 - t) * 0.15,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = t * columnHeight + (columnHeight / beamSegCount) / 2;
    group.add(beam);
  }

  // === Orbiting ribbons ===
  const ribbonCount = rng.int(3, 5);
  const orbitRibbons: { mesh: THREE.Mesh; speed: number; height: number; tiltSpeed: number }[] = [];
  for (let r = 0; r < ribbonCount; r++) {
    const ribbonRadius = baseRadius * rng.range(1.3, 2.8);
    const ribbonTube = rng.range(0.02, 0.05) * scale;
    const geo = new THREE.TorusGeometry(ribbonRadius, ribbonTube, 8, 48);
    const rColor = rng.chance(0.5) ? accentColor : color;
    const mat = createAdditiveGlowMaterial(rColor.clone(), {
      emissiveIntensity: 0.8,
      opacity: 0.3,
    });
    const ribbon = new THREE.Mesh(geo, mat);
    const height = rng.range(1, columnHeight * 0.85);
    ribbon.position.y = height;
    ribbon.rotation.x = rng.range(-0.6, 0.6);
    ribbon.rotation.z = rng.range(-0.6, 0.6);
    group.add(ribbon);
    orbitRibbons.push({
      mesh: ribbon,
      speed: 0.25 + rng.range(0, 0.5),
      height,
      tiltSpeed: rng.range(0.05, 0.15),
    });
  }

  // === Ascending particle stream (Points) ===
  const particleCount = rng.int(50, 90);
  const particlePos = new Float32Array(particleCount * 3);
  const particleSpeeds = new Float32Array(particleCount);
  const particlePhases = new Float32Array(particleCount);
  const particleRadii = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0.1, baseRadius * 2);
    particlePos[i3] = Math.cos(angle) * dist;
    particlePos[i3 + 1] = rng.range(0, columnHeight);
    particlePos[i3 + 2] = Math.sin(angle) * dist;
    particleSpeeds[i] = rng.range(0.5, 2.0);
    particlePhases[i] = rng.range(0, Math.PI * 2);
    particleRadii[i] = dist;
  }

  const particleGeo = new THREE.BufferGeometry();
  const particlePosAttr = new THREE.BufferAttribute(particlePos, 3);
  particleGeo.setAttribute('position', particlePosAttr);
  const particleMat = new THREE.PointsMaterial({
    color: coreGlow,
    size: 0.15 * scale,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  // === Top crown / cap ===
  const crownGeo = new THREE.SphereGeometry(baseRadius * 0.4, 12, 10);
  const crownMat = createAdditiveGlowMaterial(accentColor, {
    emissiveIntensity: 1.5,
    opacity: 0.2,
  });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.y = columnHeight;
  group.add(crown);

  // === Lights ===
  const mainLight = createStructureLight(color, priority, {
    intensity: priority / 6 + 0.4,
    distance: 25 + priority * 3,
  });
  mainLight.position.set(0, columnHeight * 0.5, 0);
  group.add(mainLight);

  const topLight = new THREE.PointLight(accentColor, priority / 10, baseRadius * 6);
  topLight.position.set(0, columnHeight, 0);
  group.add(topLight);

  const baseLight = new THREE.PointLight(color, priority / 12, baseRadius * 4);
  baseLight.position.y = 0.5;
  group.add(baseLight);

  const boundingRadius = Math.max(baseRadius * 3, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Slow rotation of entire vortex
    group.rotation.y = elapsed * 0.15;

    // Orbit ribbons
    orbitRibbons.forEach(({ mesh, speed, tiltSpeed }) => {
      mesh.rotation.y = elapsed * speed;
      mesh.rotation.x += Math.sin(elapsed * tiltSpeed) * 0.001;
    });

    // Wave pulse through column rings
    columnRings.forEach((ring, i) => {
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(elapsed * 2.0 - i * 0.4) * 0.4;
      const wavePulse = 1 + Math.sin(elapsed * 1.5 - i * 0.3) * 0.05;
      ring.scale.setScalar(wavePulse);
    });

    // Core disk pulse
    (coreDisk.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.5 + Math.sin(elapsed * 2.5) * 0.5;

    // Crown glow
    const crownPulse = 1 + Math.sin(elapsed * 1.0) * 0.12;
    crown.scale.setScalar(crownPulse);

    // Ascending spiral particles
    const posArr = particlePosAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const speed = particleSpeeds[i];
      const phase = particlePhases[i];
      const radius = particleRadii[i];

      // Spiral upward
      posArr[i3 + 1] += speed * 0.015;
      const spiralAngle = elapsed * speed * 0.5 + phase;
      // Tighten spiral as it rises
      const heightFrac = posArr[i3 + 1] / columnHeight;
      const currentR = radius * Math.max(0.1, 1 - heightFrac * 0.7);
      posArr[i3] = Math.cos(spiralAngle) * currentR;
      posArr[i3 + 2] = Math.sin(spiralAngle) * currentR;

      // Reset at top
      if (posArr[i3 + 1] > columnHeight * 1.2) {
        posArr[i3 + 1] = 0;
      }
    }
    particlePosAttr.needsUpdate = true;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('vortex', vortexGenerator);
