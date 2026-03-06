import { describe, it, expect, vi } from 'vitest';

vi.mock('three', () => ({
  Group: vi.fn(() => {
    const children: any[] = [];
    return {
      children,
      rotation: { y: 0, x: 0, z: 0 },
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      add: vi.fn((child: any) => { children.push(child); }),
      traverse: vi.fn(),
    };
  }),
  BoxGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  CylinderGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  MeshStandardMaterial: vi.fn(() => ({
    emissiveIntensity: 0.15,
    dispose: vi.fn(),
    transparent: false,
  })),
  Mesh: vi.fn(function(this: any, geo: any, mat: any) {
    this.geometry = geo || { dispose: vi.fn() };
    this.material = mat || { emissiveIntensity: 0.15, dispose: vi.fn() };
    this.position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1 };
  }),
  PointLight: vi.fn(function(this: any) { this.position = { set: vi.fn() }; }),
  Color: vi.fn(() => ({
    r: 0.2, g: 0, b: 0.2,
    clone: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
  })),
}));

import { StructureRegistry } from '../../../src/structures/registry';
import '../../../src/structures/generators/architecture';

const color = {
  r: 1, g: 0, b: 1,
  clone: vi.fn().mockReturnThis(),
  multiplyScalar: vi.fn().mockReturnThis(),
} as any;

describe('Architecture Generator', () => {
  it('registers itself in StructureRegistry', () => {
    expect(StructureRegistry.get('architecture')).toBeDefined();
  });

  it('returns bounding radius > 0', () => {
    const gen = StructureRegistry.get('architecture')!;
    const result = gen(42, 5, color);
    expect(result.boundingRadius).toBeGreaterThan(0);
  });

  it('is deterministic for same seed (sub-variant consistency)', () => {
    const gen = StructureRegistry.get('architecture')!;
    const r1 = gen(42, 5, color);
    const r2 = gen(42, 5, color);
    expect(r1.boundingRadius).toBe(r2.boundingRadius);
    expect(r1.group.children.length).toBe(r2.group.children.length);
  });

  it('different seeds produce different child counts (sub-variant differs)', () => {
    const gen = StructureRegistry.get('architecture')!;
    // Test a broad range of seeds to ensure at least two distinct sub-variants are hit
    const counts = Array.from({ length: 10 }, (_, i) => gen(i * 7, 5, color).group.children.length);
    expect(new Set(counts).size).toBeGreaterThan(1);
  });

  it('update() does not rotate group (only light effects animate)', () => {
    const gen = StructureRegistry.get('architecture')!;
    const result = gen(42, 5, color);
    const initialRotationY = result.group.rotation.y;
    result.update(1.0, 0.016);
    result.update(2.0, 0.016);
    // group.rotation.y must not change — architecture does NOT rotate
    expect(result.group.rotation.y).toBe(initialRotationY);
  });

  it('update() does not throw', () => {
    const gen = StructureRegistry.get('architecture')!;
    const result = gen(42, 5, color);
    expect(() => result.update(1.0, 0.016)).not.toThrow();
  });

  it('dispose() does not throw', () => {
    const gen = StructureRegistry.get('architecture')!;
    const result = gen(42, 5, color);
    expect(() => result.dispose()).not.toThrow();
  });
});
