import { describe, it, expect, vi } from 'vitest';

// Mock THREE before importing generator
vi.mock('three', () => ({
  Group: vi.fn(() => {
    const children: any[] = [];
    return {
      children,
      rotation: { y: 0, x: 0, z: 0 },
      position: { set: vi.fn() },
      add: vi.fn((child: any) => { children.push(child); }),
      traverse: vi.fn(),
    };
  }),
  CylinderGeometry: vi.fn(() => ({ dispose: vi.fn() })),
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
  PointLight: vi.fn(function(this: any) {
    this.position = { set: vi.fn() };
    this.intensity = 1;
  }),
  Color: vi.fn(() => ({
    r: 1, g: 0, b: 1,
    clone: vi.fn().mockReturnThis(),
    offsetHSL: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
  })),
}));

// Static imports — same module instances used by the generator
import { StructureRegistry } from '../../../src/structures/registry';
import '../../../src/structures/generators/crystal';

const color = { r: 1, g: 0, b: 1 } as any;

describe('Crystal Generator', () => {
  it('registers itself in StructureRegistry', () => {
    expect(StructureRegistry.get('crystal')).toBeDefined();
  });

  it('returns bounding radius > 0', () => {
    const gen = StructureRegistry.get('crystal')!;
    const result = gen(42, 5, color);
    expect(result.boundingRadius).toBeGreaterThan(0);
  });

  it('produces same bounding radius for same seed (deterministic)', () => {
    const gen = StructureRegistry.get('crystal')!;
    const r1 = gen(42, 5, color);
    const r2 = gen(42, 5, color);
    expect(r1.boundingRadius).toBe(r2.boundingRadius);
  });

  it('update() does not throw', () => {
    const gen = StructureRegistry.get('crystal')!;
    const result = gen(42, 5, color);
    expect(() => result.update(1.0, 0.016)).not.toThrow();
  });

  it('dispose() does not throw', () => {
    const gen = StructureRegistry.get('crystal')!;
    const result = gen(42, 5, color);
    expect(() => result.dispose()).not.toThrow();
  });
});
