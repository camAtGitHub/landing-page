import { describe, it, expect, vi } from 'vitest';

vi.mock('three', () => ({
  Group: vi.fn(() => {
    const children: any[] = [];
    return {
      children,
      rotation: { y: 0, x: 0, z: 0 },
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      scale: { y: 1 },
      add: vi.fn((child: any) => { children.push(child); }),
      traverse: vi.fn(),
    };
  }),
  SphereGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  CylinderGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  BoxGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  TorusGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  BufferGeometry: vi.fn(() => ({
    dispose: vi.fn(),
    setFromPoints: vi.fn().mockReturnThis(),
  })),
  LineBasicMaterial: vi.fn(() => ({
    dispose: vi.fn(),
    transparent: true,
  })),
  Line: vi.fn(function(this: any, geo: any, mat: any) {
    this.geometry = geo || { dispose: vi.fn() };
    this.material = mat || { dispose: vi.fn() };
    this.position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
  }),
  MeshStandardMaterial: vi.fn(() => ({
    emissiveIntensity: 0.5,
    dispose: vi.fn(),
    transparent: true,
  })),
  Mesh: vi.fn(function(this: any, geo: any, mat: any) {
    this.geometry = geo || { dispose: vi.fn() };
    this.material = mat || { dispose: vi.fn() };
    this.position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1 };
  }),
  PointLight: vi.fn(function(this: any) { this.position = { set: vi.fn() }; }),
  Color: vi.fn(() => ({
    r: 1, g: 0, b: 1,
    clone: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
  })),
  Vector3: vi.fn(function(this: any, x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
    this.copy = vi.fn().mockReturnThis();
    this.clone = vi.fn().mockReturnThis();
    this.set = vi.fn().mockReturnThis();
  }),
}));

import { StructureRegistry } from '../../../src/structures/registry';
import '../../../src/structures/generators/entity';

const color = { r: 1, g: 0, b: 1, clone: vi.fn().mockReturnThis(), multiplyScalar: vi.fn().mockReturnThis() } as any;

describe('Entity Generator', () => {
  it('registers itself in StructureRegistry', () => {
    expect(StructureRegistry.get('entity')).toBeDefined();
  });

  it('returns bounding radius > 0', () => {
    const gen = StructureRegistry.get('entity')!;
    const result = gen(42, 5, color);
    expect(result.boundingRadius).toBeGreaterThan(0);
  });

  it('is deterministic for same seed', () => {
    const gen = StructureRegistry.get('entity')!;
    const r1 = gen(42, 5, color);
    const r2 = gen(42, 5, color);
    expect(r1.boundingRadius).toBe(r2.boundingRadius);
    expect(r1.group.children.length).toBe(r2.group.children.length);
  });

  it('group has children indicating tendrils (5-12 tendrils × 6-10 segments)', () => {
    const gen = StructureRegistry.get('entity')!;
    const result = gen(42, 5, color);
    // Minimum: 1 dome + 1 core + 3 veins + 5*6 tendrils + 1 light = 36
    expect(result.group.children.length).toBeGreaterThanOrEqual(36);
  });

  it('update() does not throw', () => {
    const gen = StructureRegistry.get('entity')!;
    const result = gen(42, 5, color);
    expect(() => result.update(1.0, 0.016)).not.toThrow();
  });

  it('dispose() does not throw', () => {
    const gen = StructureRegistry.get('entity')!;
    const result = gen(42, 5, color);
    expect(() => result.dispose()).not.toThrow();
  });
});
