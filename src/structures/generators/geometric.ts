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

const geometricGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const orbRadius = rng.range(1.6, 2.5) * scale;
  const cageRadius = orbRadius * rng.range(1.35, 1.6);

  const coreColor = color.clone();
  const vineColor = shiftHue(color, rng.range(0.1, 0.2));
  const sparkColor = adjustBrightness(color, 1.8);
  const secondaryGlow = shiftHue(color, rng.range(-0.15, -0.08));

  // === Core orb — layered for depth ===
  // Inner bright core
  const innerCoreGeo = new THREE.SphereGeometry(orbRadius * 0.35, 16, 12);
  const innerCoreMat = createAdditiveGlowMaterial(sparkColor, {
    emissiveIntensity: 2.5,
    opacity: 0.4,
  });
  const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
  group.add(innerCore);

  // Main orb
  const coreMat = createGlowMaterial(coreColor, {
    emissiveIntensity: 1.1,
    opacity: 0.4,
    roughness: 0.12,
    metalness: 0.2,
  });
  coreMat.depthWrite = false;
  const core = new THREE.Mesh(new THREE.SphereGeometry(orbRadius, 28, 20), coreMat);
  group.add(core);

  // Outer aura shell
  const auraGeo = new THREE.SphereGeometry(orbRadius * 1.3, 16, 12);
  const auraMat = createAdditiveGlowMaterial(coreColor, {
    emissiveIntensity: 0.4,
    opacity: 0.06,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  group.add(aura);

  // Inner icosahedron wireframe feel
  const shellGeo = new THREE.IcosahedronGeometry(orbRadius * 0.75, 2);
  const shellMat = createGlowMaterial(coreColor.clone().multiplyScalar(0.85), {
    emissiveIntensity: 0.9,
    opacity: 0.2,
    roughness: 0.15,
    metalness: 0.25,
  });
  shellMat.depthWrite = false;
  const shell = new THREE.Mesh(shellGeo, shellMat);
  group.add(shell);

  // === Vine cage — torus rings at varying angles ===
  const cageCount = rng.int(8, 14);
  const cages: THREE.Mesh[] = [];
  for (let i = 0; i < cageCount; i++) {
    const cageR = cageRadius * rng.range(0.88, 1.08);
    const tubeDiameter = rng.range(0.025, 0.05) * scale;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(cageR, tubeDiameter, 10, 48),
      createGlowMaterial(vineColor, {
        emissiveIntensity: rng.range(0.7, 1.1),
        opacity: rng.range(0.6, 0.85),
        roughness: 0.25,
        metalness: 0.5,
      }),
    );
    (ring.material as THREE.MeshStandardMaterial).depthWrite = false;
    ring.rotation.x = rng.range(0, Math.PI);
    ring.rotation.y = rng.range(0, Math.PI);
    ring.rotation.z = rng.range(0, Math.PI);
    group.add(ring);
    cages.push(ring);
  }

  // === Energy arcs between cage rings ===
  const arcCount = rng.int(4, 8);
  const arcs: THREE.Mesh[] = [];
  for (let a = 0; a < arcCount; a++) {
    const arcAngle1 = rng.range(0, Math.PI * 2);
    const arcAngle2 = rng.range(0, Math.PI);
    const arcR = cageRadius * rng.range(0.7, 1.1);
    const arcGeo = new THREE.TorusGeometry(arcR, 0.015 * scale, 6, 32, Math.PI * rng.range(0.3, 0.7));
    const arcMat = createAdditiveGlowMaterial(sparkColor, {
      emissiveIntensity: 1.2,
      opacity: 0.3,
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.rotation.set(arcAngle1, arcAngle2, rng.range(0, Math.PI));
    group.add(arc);
    arcs.push(arc);
  }

  // === Orbiting sparks (Points) ===
  const sparkCount = rng.int(40, 70);
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkData: Array<{ radius: number; speed: number; phase: number; vertical: number; orbitTilt: number }> = [];

  for (let i = 0; i < sparkCount; i++) {
    const radius = rng.range(orbRadius * 0.15, orbRadius * 1.1);
    const speed = rng.range(0.3, 1.5);
    const phase = rng.range(0, Math.PI * 2);
    const vertical = rng.range(0.3, 1.0);
    const orbitTilt = rng.range(-0.5, 0.5);

    const angle = phase;
    const i3 = i * 3;
    sparkPositions[i3] = Math.cos(angle) * radius;
    sparkPositions[i3 + 1] = Math.sin(angle * vertical) * radius * 0.7;
    sparkPositions[i3 + 2] = Math.sin(angle * 1.3) * radius;

    sparkData.push({ radius, speed, phase, vertical, orbitTilt });
  }

  const sparkGeo = new THREE.BufferGeometry();
  const sparkPosAttr = new THREE.BufferAttribute(sparkPositions, 3);
  sparkGeo.setAttribute('position', sparkPosAttr);
  const sparkMat = new THREE.PointsMaterial({
    color: sparkColor,
    size: 0.12 * scale,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparks);

  // === Base ring ===
  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(cageRadius * 0.78, 0.055 * scale, 10, 40),
    createAdditiveGlowMaterial(vineColor.clone(), {
      emissiveIntensity: 0.7,
      opacity: 0.4,
    }),
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = -cageRadius * 0.95;
  group.add(baseRing);

  // Ground glow pool
  const groundGlowGeo = new THREE.RingGeometry(0.3, cageRadius * 0.9, 32);
  const groundGlowMat = createAdditiveGlowMaterial(secondaryGlow, {
    emissiveIntensity: 0.5,
    opacity: 0.1,
  });
  const groundGlow = new THREE.Mesh(groundGlowGeo, groundGlowMat);
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.y = -cageRadius * 0.95;
  group.add(groundGlow);

  // Lift whole structure up
  group.position.y = cageRadius * 1.15;

  // === Lights ===
  const mainLight = createStructureLight(coreColor, priority, {
    intensity: priority / 5 + 0.35,
    distance: cageRadius * 10,
  });
  group.add(mainLight);

  const accentLight = new THREE.PointLight(vineColor, priority / 10, cageRadius * 6);
  accentLight.position.y = -cageRadius * 0.5;
  group.add(accentLight);

  const boundingRadius = Math.max(cageRadius * 1.8, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Core rotation and pulse
    core.rotation.y = elapsed * 0.1;
    const corePulse = 1 + Math.sin(elapsed * 1.0) * 0.06;
    core.scale.setScalar(corePulse);
    (core.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.9 + Math.sin(elapsed * 1.5) * 0.3;

    // Inner core intense pulse
    const innerPulse = 1 + Math.sin(elapsed * 1.8) * 0.15;
    innerCore.scale.setScalar(innerPulse);
    (innerCore.material as THREE.MeshStandardMaterial).emissiveIntensity =
      2.0 + Math.sin(elapsed * 2.5) * 0.8;

    // Shell counter-rotation
    shell.rotation.y = -elapsed * 0.18;
    shell.rotation.x = elapsed * 0.08;

    // Aura breathing
    const auraPulse = 1 + Math.sin(elapsed * 0.7) * 0.08;
    aura.scale.setScalar(auraPulse);

    // Cage ring slow drift
    cages.forEach((ring, index) => {
      ring.rotation.y += Math.sin(elapsed * (0.3 + index * 0.025)) * 0.002;
      ring.rotation.z += Math.cos(elapsed * (0.2 + index * 0.02)) * 0.002;
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.7 + Math.sin(elapsed * 0.8 + index * 0.5) * 0.3;
    });

    // Arc pulse
    arcs.forEach((arc, index) => {
      const mat = arc.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(elapsed * 2.0 + index * 0.7) * 0.5;
      mat.opacity = 0.2 + Math.sin(elapsed * 1.5 + index * 0.5) * 0.1;
    });

    // Spark orbits
    const posArr = sparkPosAttr.array as Float32Array;
    for (let i = 0; i < sparkCount; i++) {
      const data = sparkData[i];
      const angle = elapsed * data.speed + data.phase;
      const i3 = i * 3;
      posArr[i3] = Math.cos(angle) * data.radius;
      posArr[i3 + 1] = Math.sin(angle * data.vertical + data.orbitTilt) * (data.radius * 0.7);
      posArr[i3 + 2] = Math.sin(angle * 1.3 + data.orbitTilt) * data.radius;
    }
    sparkPosAttr.needsUpdate = true;

    // Base ring rotation
    baseRing.rotation.z = elapsed * 0.06;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('geometric', geometricGenerator);
