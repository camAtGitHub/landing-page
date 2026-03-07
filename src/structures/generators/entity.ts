import * as THREE from 'three';
import { SeededRNG, createGlowMaterial, createStructureLight, priorityScale, disposeGroup } from '../base';
import { StructureRegistry } from '../registry';
import { StructureGenerator } from '../../types';

const entityGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const stemCount = rng.int(6, 10);
  const stemTopNodes: { x: number; y: number; z: number; phase: number; sway: number }[] = [];
  const stemSegments: THREE.Mesh[][] = [];
  const bulbs: THREE.Mesh[] = [];
  const bulbInnerCores: THREE.Mesh[] = [];
  const filaments: THREE.Line[] = [];

  const rosetteCount = rng.int(10, 16);
  for (let i = 0; i < rosetteCount; i++) {
    const petal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 * scale, 0.17 * scale, 0.45 * scale, 6),
      createGlowMaterial(color, { emissiveIntensity: 0.8, opacity: 0.78, roughness: 0.4, metalness: 0.45 }),
    );
    const angle = (i / rosetteCount) * Math.PI * 2;
    const radial = rng.range(0.45, 1.25) * scale;
    petal.position.set(Math.cos(angle) * radial, 0.18 * scale, Math.sin(angle) * radial);
    petal.rotation.y = angle;
    petal.rotation.z = Math.PI / 2.8;
    group.add(petal);
  }

  for (let i = 0; i < stemCount; i++) {
    const angle = (i / stemCount) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const baseRadius = rng.range(0.18, 0.55) * scale;
    const stemHeight = rng.range(4.8, 8.2) * scale;
    const segmentCount = rng.int(6, 10);
    const segments: THREE.Mesh[] = [];

    let x = Math.cos(angle) * baseRadius;
    let y = 0.35 * scale;
    let z = Math.sin(angle) * baseRadius;

    for (let s = 0; s < segmentCount; s++) {
      const t = s / Math.max(segmentCount - 1, 1);
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05 * scale * (1 - t * 0.4), 0.09 * scale * (1 - t * 0.25), stemHeight / segmentCount, 7),
        createGlowMaterial(color, { emissiveIntensity: 0.42, opacity: 0.66, roughness: 0.5, metalness: 0.25 }),
      );

      const curve = Math.sin(t * Math.PI * rng.range(0.8, 1.7) + angle * 1.6) * rng.range(0.08, 0.2) * scale;
      x += Math.cos(angle + 1.2) * curve;
      z += Math.sin(angle + 1.2) * curve;
      y += stemHeight / segmentCount;

      segment.position.set(x, y, z);
      segment.rotation.x = Math.sin(t * Math.PI) * 0.2;
      segment.rotation.z = Math.cos(t * Math.PI + angle) * 0.2;
      group.add(segment);
      segments.push(segment);
    }

    const bulbRadius = rng.range(0.45, 0.9) * scale;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(bulbRadius, 18, 14),
      createGlowMaterial(color, { emissiveIntensity: 1.05, opacity: 0.92, roughness: 0.2, metalness: 0.6 }),
    );
    (bulb.material as THREE.MeshStandardMaterial).depthWrite = false;
    bulb.position.set(x, y + bulbRadius * 0.6, z);
    group.add(bulb);
    bulbs.push(bulb);

    const innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(bulbRadius * 0.36, 12, 10),
      createGlowMaterial(color.clone().multiplyScalar(1.2), { emissiveIntensity: 1.4, opacity: 0.95 }),
    );
    (innerCore.material as THREE.MeshStandardMaterial).depthWrite = false;
    innerCore.position.set(x, y + bulbRadius * 0.64, z);
    group.add(innerCore);
    bulbInnerCores.push(innerCore);

    const filamentPoints = [
      new THREE.Vector3(x, y + bulbRadius * 0.35, z),
      new THREE.Vector3(
        x + Math.cos(angle + rng.range(-0.8, 0.8)) * rng.range(0.8, 1.4) * scale,
        y + bulbRadius * rng.range(1.1, 1.9),
        z + Math.sin(angle + rng.range(-0.8, 0.8)) * rng.range(0.8, 1.4) * scale,
      ),
      new THREE.Vector3(
        x + Math.cos(angle + rng.range(-1.1, 1.1)) * rng.range(1.0, 1.9) * scale,
        y + bulbRadius * rng.range(0.5, 1.4),
        z + Math.sin(angle + rng.range(-1.1, 1.1)) * rng.range(1.0, 1.9) * scale,
      ),
    ];
    const filament = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(filamentPoints),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }),
    );
    group.add(filament);
    filaments.push(filament);

    stemSegments.push(segments);
    stemTopNodes.push({ x, y: y + bulbRadius * 0.6, z, phase: rng.range(0, Math.PI * 2), sway: rng.range(0.08, 0.2) * scale });
  }

  const baseLift = rng.range(0.2, 0.8) * scale;
  group.position.y = baseLift;

  const light = createStructureLight(color, priority, { intensity: priority / 7 + 0.3, distance: 26 + priority * 2 });
  light.position.set(0, 4.5 * scale, 0);
  group.add(light);

  const boundingRadius = 3.4 * scale;

  const update = (elapsed: number, _delta: number): void => {
    group.position.y = baseLift + Math.sin(elapsed * 0.6) * 0.25;

    stemSegments.forEach((segments, stemIndex) => {
      const topNode = stemTopNodes[stemIndex];
      const sway = Math.sin(elapsed * 0.9 + topNode.phase) * topNode.sway;

      segments.forEach((segment, segmentIndex) => {
        const t = segmentIndex / Math.max(segments.length - 1, 1);
        segment.rotation.x = Math.sin(elapsed * 1.2 + stemIndex + t * 2) * 0.08;
        segment.rotation.z = Math.cos(elapsed * 1.1 + stemIndex * 0.5 + t * 3) * 0.09;
        segment.position.x += (Math.cos(stemIndex) * sway * t - (segment.position.x - topNode.x) * 0.03) * 0.2;
        segment.position.z += (Math.sin(stemIndex) * sway * t - (segment.position.z - topNode.z) * 0.03) * 0.2;
      });

      const bulb = bulbs[stemIndex];
      const core = bulbInnerCores[stemIndex];
      const bob = Math.sin(elapsed * 1.4 + topNode.phase) * 0.18;
      bulb.position.x = topNode.x + sway;
      bulb.position.z = topNode.z + sway * 0.7;
      bulb.position.y = topNode.y + bob;
      core.position.x = bulb.position.x;
      core.position.z = bulb.position.z;
      core.position.y = bulb.position.y + 0.05;

      const pulse = 1 + Math.sin(elapsed * 2 + topNode.phase) * 0.1;
      bulb.scale.x = pulse;
      bulb.scale.y = pulse;
      bulb.scale.z = pulse;
      core.scale.x = pulse * 0.9;
      core.scale.y = pulse * 0.9;
      core.scale.z = pulse * 0.9;
    });

    filaments.forEach((filament, index) => {
      filament.rotation.y = Math.sin(elapsed * 0.8 + index) * 0.2;
    });
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('entity', entityGenerator);
