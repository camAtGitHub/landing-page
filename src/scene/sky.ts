import * as THREE from 'three';
import { CONFIG } from '../config';

export interface SkyContext {
  stars: THREE.Points;
  starPositions: THREE.BufferAttribute;
  starSpeeds: Float32Array;
  starMaterial: THREE.PointsMaterial;
  nebulae: THREE.Mesh[];
  fadeNebulae: (t: number) => void;
}

export function createSky(scene: THREE.Scene): SkyContext {
  // === Starfield ===
  const starCount = CONFIG.STAR_COUNT;
  const positions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSpeeds = new Float32Array(starCount);

  const spread = CONFIG.STAR_SPREAD;
  const depth = CONFIG.STAR_DEPTH;

  // Star tint palette — subtle color variation for depth
  const starTints = [
    { r: 1.0, g: 1.0, b: 1.0 },   // white
    { r: 0.8, g: 0.9, b: 1.0 },   // cool blue
    { r: 1.0, g: 0.95, b: 0.85 }, // warm
    { r: 0.7, g: 0.8, b: 1.0 },   // deeper blue
    { r: 0.9, g: 0.75, b: 1.0 },  // lavender
  ];

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * spread * 2;
    positions[i3 + 1] = (Math.random() - 0.5) * depth + 100;
    positions[i3 + 2] = (Math.random() - 0.5) * spread * 2;
    starSpeeds[i] = 0.5 + Math.random() * 1.5;

    // Tinted stars for visual richness
    const tint = starTints[i % starTints.length];
    const brightness = 0.6 + Math.random() * 0.4;
    starColors[i3] = tint.r * brightness;
    starColors[i3 + 1] = tint.g * brightness;
    starColors[i3 + 2] = tint.b * brightness;
  }

  const starGeometry = new THREE.BufferGeometry();
  const starPositionAttr = new THREE.BufferAttribute(positions, 3);
  starGeometry.setAttribute('position', starPositionAttr);
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 1.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    vertexColors: true,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // === Nebula Layers — richer, deeper, more varied ===
  const nebulaConfigs = [
    // Upper atmosphere — purple/magenta haze
    { y: -40, color: 0xaa00ff, opacity: 0.035, scale: 320, rotX: 0.08, rotZ: 0.04 },
    { y: -60, color: 0xff00cc, opacity: 0.04, scale: 300, rotX: 0.1, rotZ: 0.05 },
    // Mid layers — teal/cyan glow
    { y: -90, color: 0x00ffc8, opacity: 0.05, scale: 280, rotX: -0.08, rotZ: 0.12 },
    { y: -110, color: 0x0088ff, opacity: 0.04, scale: 300, rotX: 0.04, rotZ: -0.08 },
    // Deep atmosphere — indigo/violet
    { y: -130, color: 0x6600cc, opacity: 0.06, scale: 340, rotX: 0.06, rotZ: -0.1 },
    { y: -155, color: 0x2200aa, opacity: 0.05, scale: 360, rotX: -0.05, rotZ: 0.08 },
    // Near terrain — green/teal ground glow
    { y: -178, color: 0x00ff66, opacity: 0.035, scale: 350, rotX: 0.09, rotZ: -0.06 },
    // Warm accent layer
    { y: -70, color: 0xff4400, opacity: 0.025, scale: 290, rotX: -0.12, rotZ: 0.04 },
  ];

  const nebulae: THREE.Mesh[] = [];
  const nebulaOriginalOpacities: number[] = [];
  let nebulaeRemoved = false;

  for (const cfg of nebulaConfigs) {
    const geo = new THREE.PlaneGeometry(cfg.scale, cfg.scale);
    const mat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.position.y = cfg.y;
    plane.rotation.x = cfg.rotX;
    plane.rotation.z = cfg.rotZ;
    scene.add(plane);
    nebulae.push(plane);
    nebulaOriginalOpacities.push(cfg.opacity);
  }

  const fadeNebulae = (t: number): void => {
    if (nebulaeRemoved) return;

    const clampedT = THREE.MathUtils.clamp(t, 0, 1);
    const opacityScale = 1 - clampedT;

    for (let i = 0; i < nebulae.length; i++) {
      const material = nebulae[i].material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = nebulaOriginalOpacities[i] * opacityScale;
      }
    }

    if (clampedT >= 1) {
      for (const nebula of nebulae) {
        scene.remove(nebula);
      }
      nebulaeRemoved = true;
    }
  };

  return {
    stars,
    starPositions: starPositionAttr,
    starSpeeds,
    starMaterial,
    nebulae,
    fadeNebulae,
  };
}
