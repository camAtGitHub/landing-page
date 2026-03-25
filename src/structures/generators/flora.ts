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

const floraGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const leafColor = shiftHue(color, rng.range(0.05, 0.15));
  const vineColor = shiftHue(color, rng.range(-0.1, -0.05));
  const coreGlow = adjustBrightness(color, 1.8);

  const isTree = rng.next() > 0.35; // bias toward tree variant

  let maxHeight = 0;
  let boundingRadius = 0;

  const animatedLeaves: { mesh: THREE.Mesh; basePos: THREE.Vector3; phase: number; amplitude: number }[] = [];
  const glowOrbs: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];

  if (isTree) {
    // === TWISTED BIOLUMINESCENT TREE ===
    const trunkHeight = rng.range(5, 11) * scale;
    const helixTwist = rng.range(0.5, 1.0);
    const helixRadius = rng.range(0.3, 0.7) * scale;
    const segmentCount = rng.int(10, 18);
    maxHeight = trunkHeight;

    // Double-helix trunk with gradient glow
    for (let trunk = 0; trunk < 2; trunk++) {
      for (let s = 0; s < segmentCount; s++) {
        const t = s / segmentCount;
        const segHeight = trunkHeight / segmentCount;
        const taperTop = 0.12 * scale * (1 - t * 0.5);
        const taperBot = 0.16 * scale * (1 - t * 0.4);

        const geo = new THREE.CylinderGeometry(taperTop, taperBot, segHeight * 1.1, 8);

        // Gradient: darker at base, brighter at top
        const segColor = color.clone().lerp(coreGlow, t * 0.6);
        const mat = createGlowMaterial(segColor, {
          emissiveIntensity: 0.3 + t * 0.7,
          opacity: 0.85,
          roughness: 0.4 - t * 0.2,
          metalness: 0.2 + t * 0.3,
        });

        const mesh = new THREE.Mesh(geo, mat);
        const angle = s * helixTwist + trunk * Math.PI;
        mesh.position.set(
          Math.cos(angle) * helixRadius,
          s * segHeight + segHeight / 2,
          Math.sin(angle) * helixRadius,
        );
        // Slight rotation to follow helix curve
        mesh.rotation.y = angle;
        group.add(mesh);
      }
    }

    // Spiraling energy vine wrapped around trunk
    const vineSegments = rng.int(30, 50);
    for (let v = 0; v < vineSegments; v++) {
      const t = v / vineSegments;
      const vineAngle = t * Math.PI * rng.range(6, 10);
      const vineR = helixRadius * rng.range(1.2, 1.6);
      const vineGeo = new THREE.SphereGeometry(0.04 * scale * (1 + t * 0.5), 5, 4);
      const vineMat = createAdditiveGlowMaterial(vineColor, {
        emissiveIntensity: 0.8 + t * 0.6,
        opacity: 0.4 + t * 0.2,
      });
      const vine = new THREE.Mesh(vineGeo, vineMat);
      vine.position.set(
        Math.cos(vineAngle) * vineR,
        t * trunkHeight,
        Math.sin(vineAngle) * vineR,
      );
      group.add(vine);
    }

    // Rich leaf canopy — layered icosahedrons with glow
    const foliageCount = rng.int(12, 25);
    for (let f = 0; f < foliageCount; f++) {
      const isOuter = f > foliageCount * 0.6;
      const leafSize = rng.range(isOuter ? 0.15 : 0.25, isOuter ? 0.35 : 0.65) * scale;
      const geo = new THREE.IcosahedronGeometry(leafSize, isOuter ? 0 : 1);
      const lColor = rng.chance(0.6) ? leafColor.clone() : color.clone();
      const mat = createGlowMaterial(lColor, {
        emissiveIntensity: rng.range(0.7, 1.4),
        opacity: rng.range(0.45, 0.75),
        roughness: 0.15,
        metalness: 0.3,
      });
      mat.depthWrite = false;

      const mesh = new THREE.Mesh(geo, mat);
      const spreadX = rng.range(-2.2, 2.2) * scale;
      const spreadZ = rng.range(-2.2, 2.2) * scale;
      const py = trunkHeight + rng.range(-0.5, 2.5) * scale;
      mesh.position.set(spreadX, py, spreadZ);
      mesh.rotation.set(rng.range(0, Math.PI), rng.range(0, Math.PI), 0);
      group.add(mesh);

      animatedLeaves.push({
        mesh,
        basePos: mesh.position.clone(),
        phase: rng.range(0, Math.PI * 2),
        amplitude: rng.range(0.02, 0.08) * scale,
      });
    }

    // Canopy glow aura
    const canopyAuraGeo = new THREE.SphereGeometry(2.2 * scale, 12, 10);
    const canopyAuraMat = createAdditiveGlowMaterial(leafColor, {
      emissiveIntensity: 0.5,
      opacity: 0.08,
    });
    const canopyAura = new THREE.Mesh(canopyAuraGeo, canopyAuraMat);
    canopyAura.position.set(0, trunkHeight + 0.5 * scale, 0);
    group.add(canopyAura);

    boundingRadius = (helixRadius + 2.5) * scale;

  } else {
    // === BIOLUMINESCENT BULB STALKS ===
    const stalkCount = rng.int(4, 8);
    for (let s = 0; s < stalkCount; s++) {
      const height = rng.range(3, 8) * scale;
      const endX = rng.range(-2.5, 2.5) * scale;
      const endZ = rng.range(-2.5, 2.5) * scale;
      const bulbRadius = rng.range(0.4, 0.9) * scale;
      maxHeight = Math.max(maxHeight, height + bulbRadius);

      // Curved stalk segments with gradient
      const segCount = rng.int(6, 10);
      for (let seg = 0; seg < segCount; seg++) {
        const t = seg / segCount;
        const thickness = 0.06 * scale * (1 - t * 0.4);
        const geo = new THREE.CylinderGeometry(thickness, thickness * 1.3, height / segCount, 6);
        const segColor = color.clone().lerp(leafColor, t * 0.5);
        const mat = createGlowMaterial(segColor, {
          emissiveIntensity: 0.25 + t * 0.5,
          opacity: 0.85,
        });

        const mesh = new THREE.Mesh(geo, mat);
        const bx = endX * t * t;
        const bz = endZ * t * t;
        mesh.position.set(bx, t * height + height / segCount / 2, bz);
        // Tilt segments to follow curve
        if (seg > 0) {
          const prevT = (seg - 1) / segCount;
          const dx = endX * t * t - endX * prevT * prevT;
          const dz = endZ * t * t - endZ * prevT * prevT;
          mesh.rotation.z = Math.atan2(dx, height / segCount) * 0.3;
          mesh.rotation.x = Math.atan2(dz, height / segCount) * 0.3;
        }
        group.add(mesh);
      }

      // Glowing bulb at tip — layered spheres for depth
      const bulbGeo = new THREE.SphereGeometry(bulbRadius, 20, 12);
      const bulbColor = rng.chance(0.5) ? leafColor : color;
      const bulbMat = createGlowMaterial(bulbColor.clone(), {
        emissiveIntensity: 1.2,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.2,
      });
      bulbMat.depthWrite = false;
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(endX, height, endZ);
      group.add(bulb);

      glowOrbs.push({
        mesh: bulb,
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.8, 1.8),
      });

      // Inner core glow
      const innerGeo = new THREE.SphereGeometry(bulbRadius * 0.5, 10, 8);
      const innerMat = createAdditiveGlowMaterial(coreGlow, {
        emissiveIntensity: 2.0,
        opacity: 0.35,
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.copy(bulb.position);
      group.add(inner);

      // Outer halo
      const haloGeo = new THREE.SphereGeometry(bulbRadius * 1.6, 10, 8);
      const haloMat = createAdditiveGlowMaterial(bulbColor.clone(), {
        emissiveIntensity: 0.4,
        opacity: 0.08,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(bulb.position);
      group.add(halo);

      const r = Math.sqrt(endX * endX + endZ * endZ) + bulbRadius * 1.6;
      boundingRadius = Math.max(boundingRadius, r);
    }
  }

  // --- Floating spore particles (Points) ---
  const sporeCount = rng.int(25, 50);
  const sporePositions = new Float32Array(sporeCount * 3);
  const sporeSpeeds = new Float32Array(sporeCount);
  const sporePhases = new Float32Array(sporeCount);
  const spread = boundingRadius * 1.5;

  for (let i = 0; i < sporeCount; i++) {
    const i3 = i * 3;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0, spread);
    sporePositions[i3] = Math.cos(angle) * dist;
    sporePositions[i3 + 1] = rng.range(0, maxHeight * 1.2);
    sporePositions[i3 + 2] = Math.sin(angle) * dist;
    sporeSpeeds[i] = rng.range(0.2, 0.8);
    sporePhases[i] = rng.range(0, Math.PI * 2);
  }

  const sporeGeo = new THREE.BufferGeometry();
  const sporePosAttr = new THREE.BufferAttribute(sporePositions, 3);
  sporeGeo.setAttribute('position', sporePosAttr);
  const sporeMat = new THREE.PointsMaterial({
    color: coreGlow,
    size: 0.12 * scale,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const spores = new THREE.Points(sporeGeo, sporeMat);
  group.add(spores);

  // --- Lights ---
  const light = createStructureLight(color, priority, {
    intensity: priority / 6 + 0.3,
    distance: 22 + priority * 2,
  });
  light.position.set(0, maxHeight * 0.8, 0);
  group.add(light);

  const accentLight = new THREE.PointLight(leafColor, priority / 14, boundingRadius * 3);
  accentLight.position.set(0, maxHeight * 0.5, 0);
  group.add(accentLight);

  boundingRadius = Math.max(boundingRadius, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Gentle sway
    group.rotation.z = Math.sin(elapsed * 0.25) * 0.03;
    group.rotation.x = Math.cos(elapsed * 0.2) * 0.02;

    // Leaf breathing animation
    animatedLeaves.forEach(({ mesh, basePos, phase, amplitude }) => {
      mesh.position.y = basePos.y + Math.sin(elapsed * 0.8 + phase) * amplitude;
      mesh.position.x = basePos.x + Math.sin(elapsed * 0.5 + phase * 1.3) * amplitude * 0.3;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.7 + Math.sin(elapsed * 1.2 + phase) * 0.4;
    });

    // Bulb orb pulsing
    glowOrbs.forEach(({ mesh, phase, speed }) => {
      const pulse = 1 + Math.sin(elapsed * speed + phase) * 0.1;
      mesh.scale.setScalar(pulse);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.9 + Math.sin(elapsed * speed * 1.3 + phase) * 0.4;
    });

    // Spore particle drift
    const posArr = sporePosAttr.array as Float32Array;
    for (let i = 0; i < sporeCount; i++) {
      const i3 = i * 3;
      posArr[i3] += Math.sin(elapsed * sporeSpeeds[i] + sporePhases[i]) * 0.005;
      posArr[i3 + 1] += sporeSpeeds[i] * 0.006;
      posArr[i3 + 2] += Math.cos(elapsed * sporeSpeeds[i] * 0.7 + sporePhases[i]) * 0.005;

      if (posArr[i3 + 1] > maxHeight * 1.5) {
        posArr[i3 + 1] = 0.1;
      }
    }
    sporePosAttr.needsUpdate = true;
  };

  const dispose = (): void => {
    disposeGroup(group);
  };

  return { group, boundingRadius, update, dispose };
};

StructureRegistry.register('flora', floraGenerator);
