import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * Mulberry32 seeded PRNG. Deterministic for a given seed.
 * Call methods in consistent order for reproducible results.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1 - Number.EPSILON));
  }

  pick<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array');
    return array[this.int(0, array.length - 1)];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

export function createGlowMaterial(
  color: THREE.Color,
  options?: {
    emissiveIntensity?: number;
    opacity?: number;
    roughness?: number;
    metalness?: number;
  },
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: options?.emissiveIntensity ?? 0.5,
    transparent: true,
    opacity: options?.opacity ?? 0.85,
    roughness: options?.roughness ?? 0.3,
    metalness: options?.metalness ?? 0.7,
  });
}

export function createStructureLight(
  color: THREE.Color,
  priority: number,
  options?: {
    intensity?: number;
    distance?: number;
  },
): THREE.PointLight {
  const intensity = options?.intensity ?? priority / 10;
  const distance = options?.distance ?? 15 + priority * 2;
  const light = new THREE.PointLight(color, intensity, distance);
  return light;
}

export function priorityScale(priority: number): number {
  return CONFIG.STRUCTURE_BASE_SCALE + priority * CONFIG.STRUCTURE_PRIORITY_SCALE_FACTOR;
}

export function disposeGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    } else if (child instanceof THREE.Line) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}
