import * as THREE from 'three';
import { CONFIG } from '../config';

export interface SkyContext {
  stars: THREE.Points;
  starPositions: THREE.BufferAttribute;
  starSpeeds: Float32Array;
  starMaterial: THREE.PointsMaterial;
  nebulae: THREE.Mesh[];
}

export function createSky(scene: THREE.Scene): SkyContext {
  // === Starfield ===
  const starCount = CONFIG.STAR_COUNT;
  const positions = new Float32Array(starCount * 3);
  const starSpeeds = new Float32Array(starCount);

  const spread = CONFIG.STAR_SPREAD;
  const depth = CONFIG.STAR_DEPTH;

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * spread * 2;
    positions[i3 + 1] = (Math.random() - 0.5) * depth + 100; // mostly above camera
    positions[i3 + 2] = (Math.random() - 0.5) * spread * 2;
    starSpeeds[i] = 0.5 + Math.random() * 1.5;
  }

  const starGeometry = new THREE.BufferGeometry();
  const starPositionAttr = new THREE.BufferAttribute(positions, 3);
  starGeometry.setAttribute('position', starPositionAttr);

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // === Nebula Layers ===
  const nebulaConfigs = [
    { y: -50, color: 0xff00cc, opacity: 0.04, scale: 300, rotX: 0.1, rotZ: 0.05 },
    { y: -90, color: 0x00ffc8, opacity: 0.05, scale: 280, rotX: -0.08, rotZ: 0.12 },
    { y: -120, color: 0x8800cc, opacity: 0.06, scale: 320, rotX: 0.06, rotZ: -0.1 },
    { y: -150, color: 0x0044ff, opacity: 0.04, scale: 260, rotX: -0.05, rotZ: 0.08 },
    { y: -175, color: 0x00ff88, opacity: 0.03, scale: 340, rotX: 0.09, rotZ: -0.06 },
    { y: -65, color: 0xff6600, opacity: 0.03, scale: 290, rotX: -0.12, rotZ: 0.04 },
  ];

  const nebulae: THREE.Mesh[] = [];

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
  }

  return {
    stars,
    starPositions: starPositionAttr,
    starSpeeds,
    starMaterial,
    nebulae,
  };
}
