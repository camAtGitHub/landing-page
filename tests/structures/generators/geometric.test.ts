import { describe, it, expect, vi } from 'vitest';

vi.mock('three', () => ({
  Group: vi.fn(() => {
    const children: any[] = [];
    return {
      children,
      rotation: { y: 0, x: 0, z: 0 },
      position: { set: vi.fn(), x: 0, y: 0, z: 0, copy: vi.fn() },
      add: vi.fn((child: any) => { children.push(child); }),
      traverse: vi.fn(),
    };
  }),
  IcosahedronGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  OctahedronGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  DodecahedronGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  TorusGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  SphereGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  MeshStandardMaterial: vi.fn(() => ({
    emissiveIntensity: 0.5,
    dispose: vi.fn(),
    transparent: true,
  })),
  Mesh: vi.fn(function(this: any, geo: any, mat: any) {
    this.geometry = geo || { dispose: vi.fn() };
    this.material = mat || { dispose: vi.fn() };
    this.position = { set: vi.fn(), x: 0, y: 0, z: 0, copy: vi.fn() };
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
import '../../../src/structures/generators/geometric';

const color = { r: 1, g: 0, b: 1, clone: vi.fn().mockReturnThis(), multiplyScalar: vi.fn().mockReturnThis() } as any;

describe('Geometric Generator', () => {
  it('registers itself in StructureRegistry', () => {
    expect(StructureRegistry.get('geometric')).toBeDefined();
  });

  it('returns bounding radius > 0', () => {
    const gen = StructureRegistry.get('geometric')!;
    const result = gen(42, 5, color);
    expect(result.boundingRadius).toBeGreaterThan(0);
  });

  it('structure floats (local Y >= 0)', () => {
    const gen = StructureRegistry.get('geometric')!;
    const result = gen(42, 5, color);
    expect(result.group.position.y ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic for same seed', () => {
    const gen = StructureRegistry.get('geometric')!;
    const r1 = gen(42, 5, color);
    const r2 = gen(42, 5, color);
    expect(r1.boundingRadius).toBe(r2.boundingRadius);
    expect(r1.group.children.length).toBe(r2.group.children.length);
  });

  it('produces different child counts for different seeds', () => {
    const gen = StructureRegistry.get('geometric')!;
    // Test a broad range of seeds to ensure RNG variation produces differing outputs
    const counts = Array.from({ length: 10 }, (_, i) => gen(i * 13, 5, color).group.children.length);
    expect(new Set(counts).size).toBeGreaterThan(1);
  });

  it('update() does not throw', () => {
    const gen = StructureRegistry.get('geometric')!;
    const result = gen(42, 5, color);
    expect(() => result.update(1.0, 0.016)).not.toThrow();
  });

  it('dispose() does not throw', () => {
    const gen = StructureRegistry.get('geometric')!;
    const result = gen(42, 5, color);
    expect(() => result.dispose()).not.toThrow();
  });
});
