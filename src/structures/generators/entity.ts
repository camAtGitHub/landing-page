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

const entityGenerator: StructureGenerator = (seed, priority, color) => {
  const rng = new SeededRNG(seed);
  const scale = priorityScale(priority);
  const group = new THREE.Group();

  const podColor = shiftHue(color, rng.range(0.02, 0.1));
  const tendrilColor = shiftHue(color, rng.range(-0.12, -0.05));
  const coreGlow = adjustBrightness(color, 2.0);
  const stemTint = color.clone().multiplyScalar(0.3);

  // === Central stem / trunk ===
  const stemHeight = rng.range(5, 9) * scale;
  const stemRadius = rng.range(0.2, 0.4) * scale;
  const stemSegments = rng.int(8, 14);

  for (let s = 0; s < stemSegments; s++) {
    const t = s / stemSegments;
    const segH = stemHeight / stemSegments;
    const topR = stemRadius * (0.6 + (1 - t) * 0.4);
    const botR = stemRadius * (0.7 + (1 - t) * 0.5);
    const geo = new THREE.CylinderGeometry(topR, botR, segH * 1.05, 8);
    const segColor = stemTint.clone().lerp(color, t * 0.4);
    const mat = createGlowMaterial(segColor, {
      emissiveIntensity: 0.2 + t * 0.5,
      opacity: 0.88,
      roughness: 0.45,
      metalness: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Slight sinusoidal offset for organic feel
    const sway = Math.sin(t * Math.PI * 2) * 0.15 * scale;
    mesh.position.set(sway, t * stemHeight + segH / 2, sway * 0.5);
    group.add(mesh);
  }

  // Energy veins up the stem
  const veinCount = rng.int(3, 5);
  for (let v = 0; v < veinCount; v++) {
    const vAngle = (v / veinCount) * Math.PI * 2;
    const veinSegs = rng.int(12, 20);
    for (let vs = 0; vs < veinSegs; vs++) {
      const t = vs / veinSegs;
      const veinGeo = new THREE.SphereGeometry(0.025 * scale * (1 + t * 0.5), 4, 4);
      const veinMat = createAdditiveGlowMaterial(coreGlow, {
        emissiveIntensity: 0.8 + t * 0.8,
        opacity: 0.3 + t * 0.15,
      });
      const vine = new THREE.Mesh(veinGeo, veinMat);
      const veinR = stemRadius * 0.85;
      const spiralAngle = vAngle + t * Math.PI * rng.range(3, 5);
      vine.position.set(
        Math.cos(spiralAngle) * veinR,
        t * stemHeight,
        Math.sin(spiralAngle) * veinR,
      );
      group.add(vine);
    }
  }

  // === Glowing bulb pods at top (like jellyfish bells / balloon pods) ===
  const podCount = rng.int(4, 7);
  const pods: { mesh: THREE.Mesh; innerMesh: THREE.Mesh; basePos: THREE.Vector3; phase: number; speed: number }[] = [];

  for (let p = 0; p < podCount; p++) {
    const angle = (p / podCount) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const podRadius = rng.range(0.6, 1.4) * scale;
    const podHeight = stemHeight + rng.range(0.5, 2.5) * scale;
    const armLen = rng.range(1.0, 2.5) * scale;
    const armX = Math.cos(angle) * armLen;
    const armZ = Math.sin(angle) * armLen;

    // Thin tendril arm connecting pod to stem
    const armSegs = rng.int(5, 8);
    for (let a = 0; a < armSegs; a++) {
      const at = a / armSegs;
      const armGeo = new THREE.SphereGeometry(0.03 * scale * (1 - at * 0.3), 5, 4);
      const armMat = createGlowMaterial(tendrilColor, {
        emissiveIntensity: 0.4 + at * 0.4,
        opacity: 0.7,
      });
      armMat.depthWrite = false;
      const arm = new THREE.Mesh(armGeo, armMat);
      // Bezier curve from stem top to pod position
      const cx = armX * at * at;
      const cz = armZ * at * at;
      const cy = stemHeight + (podHeight - stemHeight) * at + Math.sin(at * Math.PI) * 0.5 * scale;
      arm.position.set(cx, cy, cz);
      group.add(arm);
    }

    // Pod outer shell — translucent sphere
    const podGeo = new THREE.SphereGeometry(podRadius, 20, 14);
    const pColor = rng.chance(0.5) ? podColor.clone() : color.clone();
    const podMat = createGlowMaterial(pColor, {
      emissiveIntensity: rng.range(0.8, 1.4),
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.15,
    });
    podMat.depthWrite = false;
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.position.set(armX, podHeight, armZ);
    group.add(pod);

    // Pod inner core — bright additive
    const innerGeo = new THREE.SphereGeometry(podRadius * 0.45, 12, 10);
    const innerMat = createAdditiveGlowMaterial(coreGlow, {
      emissiveIntensity: 2.2,
      opacity: 0.35,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.copy(pod.position);
    group.add(inner);

    // Pod outer halo
    const haloGeo = new THREE.SphereGeometry(podRadius * 1.5, 10, 8);
    const haloMat = createAdditiveGlowMaterial(pColor, {
      emissiveIntensity: 0.35,
      opacity: 0.06,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(pod.position);
    group.add(halo);

    pods.push({
      mesh: pod,
      innerMesh: inner,
      basePos: pod.position.clone(),
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.6, 1.4),
    });
  }

  // === Hanging tendrils below pods ===
  const tendrilCount = rng.int(6, 12);
  const tendrils: { segments: THREE.Mesh[]; baseAngle: number; baseHeight: number; phase: number }[] = [];

  for (let t = 0; t < tendrilCount; t++) {
    const tAngle = rng.range(0, Math.PI * 2);
    const tDist = rng.range(0.5, 2) * scale;
    const tHeight = stemHeight * rng.range(0.3, 0.8);
    const tLen = rng.range(1.5, 4) * scale;
    const segCount = rng.int(6, 12);
    const segments: THREE.Mesh[] = [];

    for (let s = 0; s < segCount; s++) {
      const st = s / segCount;
      const segGeo = new THREE.SphereGeometry(0.03 * scale * (1 - st * 0.5), 5, 4);
      const segMat = createAdditiveGlowMaterial(tendrilColor, {
        emissiveIntensity: 0.6 + (1 - st) * 0.5,
        opacity: 0.3 + (1 - st) * 0.2,
      });
      const seg = new THREE.Mesh(segGeo, segMat);
      seg.position.set(
        Math.cos(tAngle) * tDist + Math.sin(st * Math.PI) * 0.2 * scale,
        tHeight - st * tLen,
        Math.sin(tAngle) * tDist + Math.cos(st * Math.PI * 1.5) * 0.15 * scale,
      );
      group.add(seg);
      segments.push(seg);
    }

    tendrils.push({
      segments,
      baseAngle: tAngle,
      baseHeight: tHeight,
      phase: rng.range(0, Math.PI * 2),
    });
  }

  // === Root tendrils at base ===
  const rootCount = rng.int(5, 9);
  for (let r = 0; r < rootCount; r++) {
    const rAngle = (r / rootCount) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rootLen = rng.range(1.5, 3.5) * scale;
    const rootSegs = rng.int(5, 8);
    for (let rs = 0; rs < rootSegs; rs++) {
      const rt = rs / rootSegs;
      const rootGeo = new THREE.SphereGeometry(0.04 * scale * (1 - rt * 0.6), 5, 4);
      const rootMat = createGlowMaterial(stemTint, {
        emissiveIntensity: 0.15 + (1 - rt) * 0.2,
        opacity: 0.7,
      });
      const root = new THREE.Mesh(rootGeo, rootMat);
      root.position.set(
        Math.cos(rAngle) * rt * rootLen,
        -rt * rootLen * 0.2,
        Math.sin(rAngle) * rt * rootLen,
      );
      group.add(root);
    }
  }

  // === Floating spore particles (Points) ===
  const sporeCount = rng.int(40, 70);
  const sporePositions = new Float32Array(sporeCount * 3);
  const sporeSpeeds = new Float32Array(sporeCount);
  const sporePhases = new Float32Array(sporeCount);
  const sporeDrifts = new Float32Array(sporeCount);

  for (let i = 0; i < sporeCount; i++) {
    const i3 = i * 3;
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(0, 4) * scale;
    sporePositions[i3] = Math.cos(angle) * dist;
    sporePositions[i3 + 1] = rng.range(0, stemHeight * 1.5);
    sporePositions[i3 + 2] = Math.sin(angle) * dist;
    sporeSpeeds[i] = rng.range(0.2, 0.9);
    sporePhases[i] = rng.range(0, Math.PI * 2);
    sporeDrifts[i] = rng.range(0.3, 1.2);
  }

  const sporeGeo = new THREE.BufferGeometry();
  const sporePosAttr = new THREE.BufferAttribute(sporePositions, 3);
  sporeGeo.setAttribute('position', sporePosAttr);
  const sporeMat = new THREE.PointsMaterial({
    color: coreGlow,
    size: 0.1 * scale,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const spores = new THREE.Points(sporeGeo, sporeMat);
  group.add(spores);

  // === Lights ===
  const mainLight = createStructureLight(color, priority, {
    intensity: priority / 5 + 0.45,
    distance: 25 * scale,
  });
  mainLight.position.set(0, stemHeight + 1.5 * scale, 0);
  group.add(mainLight);

  const podLight = new THREE.PointLight(podColor, priority / 8, 15 * scale);
  podLight.position.set(0, stemHeight * 0.7, 0);
  group.add(podLight);

  const boundingRadius = Math.max(5.5 * scale, 1);

  const update = (elapsed: number, _delta: number): void => {
    // Pod breathing and bobbing
    pods.forEach(({ mesh, innerMesh, basePos, phase, speed }) => {
      const breath = 1 + Math.sin(elapsed * speed + phase) * 0.08;
      mesh.scale.setScalar(breath);

      // Gentle bob
      mesh.position.y = basePos.y + Math.sin(elapsed * speed * 0.7 + phase) * 0.15 * scale;
      mesh.position.x = basePos.x + Math.sin(elapsed * speed * 0.4 + phase * 1.3) * 0.08 * scale;

      const podMat = mesh.material as THREE.MeshStandardMaterial;
      podMat.emissiveIntensity = 0.8 + Math.sin(elapsed * speed * 1.5 + phase) * 0.4;

      // Inner core synced
      innerMesh.position.copy(mesh.position);
      innerMesh.scale.setScalar(breath * 0.8);
      const innerMat = innerMesh.material as THREE.MeshStandardMaterial;
      innerMat.emissiveIntensity = 1.8 + Math.sin(elapsed * speed * 2 + phase) * 0.6;
    });

    // Tendril sway
    tendrils.forEach(({ segments, phase }) => {
      segments.forEach((seg, i) => {
        const swayAmount = (i / segments.length) * 0.12 * scale;
        seg.position.x += Math.sin(elapsed * 0.8 + phase + i * 0.3) * swayAmount * 0.01;
        seg.position.z += Math.cos(elapsed * 0.6 + phase + i * 0.4) * swayAmount * 0.01;
      });
    });

    // Spore drift
    const posArr = sporePosAttr.array as Float32Array;
    for (let i = 0; i < sporeCount; i++) {
      const i3 = i * 3;
      posArr[i3] += Math.sin(elapsed * sporeSpeeds[i] + sporePhases[i]) * 0.006 * sporeDrifts[i];
      posArr[i3 + 1] += sporeSpeeds[i] * 0.004;
      posArr[i3 + 2] += Math.cos(elapsed * sporeSpeeds[i] * 0.7 + sporePhases[i]) * 0.006 * sporeDrifts[i];

      if (posArr[i3 + 1] > stemHeight * 2) {
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

StructureRegistry.register('entity', entityGenerator);
