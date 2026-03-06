import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const vortexGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const baseRadius = rng.range(0.8, 1.8) * scale;
  const columnHeight = rng.range(5, 12) * scale;
  const spiralTwist = rng.range(0.3, 0.8);
  const spiralRadius = rng.range(0.3, 1.0) * scale;
  const ringCount = rng.int(8, 15);

  // Base pool
  const poolGeo = new THREE.RingGeometry(0.5, baseRadius, 32);
  const poolMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  group.add(pool);

  // Outer glow ring
  const glowGeo = new THREE.RingGeometry(baseRadius, baseRadius * 1.5, 32);
  const glowMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  group.add(glow);

  // Column rings (stacked torus)
  const columnRings: THREE.Mesh[] = [];
  for (let i = 0; i < ringCount; i++) {
    const t = i / (ringCount - 1);
    const ringRadius = baseRadius * (1 - t * 0.5);
    const tubeRadius = Math.max(0.04, rng.range(0.05, 0.12) * scale * (1 - t * 0.3));
    const geo = new THREE.TorusGeometry(ringRadius, tubeRadius, 8, 16);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7 + rng.range(0, 0.3),
      transparent: true,
      opacity: 0.5 + rng.range(0, 0.2),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(
      Math.sin(i * spiralTwist) * spiralRadius,
      (i / ringCount) * columnHeight,
      Math.cos(i * spiralTwist) * spiralRadius,
    );
    group.add(ring);
    columnRings.push(ring);
  }

  // Orbiting ribbons
  const ribbonCount = rng.int(2, 4);
  const orbitRibbons: { mesh: THREE.Mesh; speed: number; height: number }[] = [];
  for (let r = 0; r < ribbonCount; r++) {
    const ribbonRadius = baseRadius * rng.range(1.5, 2.5);
    const geo = new THREE.TorusGeometry(ribbonRadius, 0.03 * scale, 8, 64);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    mat.side = THREE.DoubleSide;
    const ribbon = new THREE.Mesh(geo, mat);
    const height = rng.range(1, columnHeight * 0.8);
    ribbon.position.y = height;
    ribbon.rotation.x = rng.range(-0.5, 0.5);
    ribbon.rotation.z = rng.range(-0.5, 0.5);
    group.add(ribbon);
    orbitRibbons.push({ mesh: ribbon, speed: 0.3 + rng.range(0, 0.4), height });
  }

  const light = createStructureLight(color, priority, { intensity: priority / 8, distance: 20 + priority * 3 });
  light.position.set(0, columnHeight * 0.5, 0);
  group.add(light);

  const boundingRadius = Math.max(baseRadius * 2.5, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Rotate column
    group.rotation.y = elapsed * 0.2;

    // Orbit ribbons
    orbitRibbons.forEach(({ mesh, speed }) => {
      mesh.rotation.y = elapsed * speed;
    });

    // Wave pulse through column rings
    columnRings.forEach((ring, i) => {
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(elapsed * 1.5 - i * 0.3) * 0.3;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('vortex', vortexGenerator);
