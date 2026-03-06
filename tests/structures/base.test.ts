import { describe, it, expect, vi } from 'vitest';
import { SeededRNG, priorityScale, disposeGroup } from '../../src/structures/base';
import { CONFIG } from '../../src/config';
import * as THREE from 'three';

// Mock THREE
vi.mock('three', () => ({
  MeshStandardMaterial: vi.fn(() => ({
    color: {},
    emissive: {},
    emissiveIntensity: 0.5,
    transparent: false,
    opacity: 1,
    roughness: 0.5,
    metalness: 0,
    dispose: vi.fn(),
  })),
  PointLight: vi.fn(() => ({
    position: { set: vi.fn() },
    intensity: 1,
    distance: 10,
  })),
  Color: vi.fn((hex: number) => ({ r: 1, g: 0, b: 0, hex })),
  Group: vi.fn(() => ({
    children: [],
    traverse: vi.fn(),
  })),
  Mesh: class Mesh {
    geometry = { dispose: vi.fn() };
    material = { dispose: vi.fn() };
  },
  Line: class Line {
    geometry = { dispose: vi.fn() };
    material = { dispose: vi.fn() };
  },
}));

describe('SeededRNG', () => {
  it('produces the same sequence for the same seed', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    for (let i = 0; i < 20; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(99);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = new SeededRNG(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range() returns values within [min, max)', () => {
    const rng = new SeededRNG(123);
    for (let i = 0; i < 50; i++) {
      const v = rng.range(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it('int() returns integers in [min, max] inclusive', () => {
    const rng = new SeededRNG(456);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(1, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('int(5, 5) returns 5', () => {
    const rng = new SeededRNG(1);
    expect(rng.int(5, 5)).toBe(5);
  });

  it('pick() returns an element from the array', () => {
    const rng = new SeededRNG(789);
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('pick() throws on empty array', () => {
    const rng = new SeededRNG(1);
    expect(() => rng.pick([])).toThrow();
  });

  it('chance() returns boolean with correct probability distribution', () => {
    const rng = new SeededRNG(999);
    let trueCount = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      if (rng.chance(0.5)) trueCount++;
    }
    expect(trueCount / n).toBeGreaterThan(0.4);
    expect(trueCount / n).toBeLessThan(0.6);
  });

  it('seed 0 produces valid numbers', () => {
    const rng = new SeededRNG(0);
    expect(() => rng.next()).not.toThrow();
    const v = rng.next();
    expect(isNaN(v)).toBe(false);
  });
});

describe('priorityScale', () => {
  it('returns STRUCTURE_BASE_SCALE + priority * STRUCTURE_PRIORITY_SCALE_FACTOR', () => {
    expect(priorityScale(10)).toBeCloseTo(
      CONFIG.STRUCTURE_BASE_SCALE + 10 * CONFIG.STRUCTURE_PRIORITY_SCALE_FACTOR,
    );
    expect(priorityScale(1)).toBeCloseTo(
      CONFIG.STRUCTURE_BASE_SCALE + 1 * CONFIG.STRUCTURE_PRIORITY_SCALE_FACTOR,
    );
  });
});

describe('disposeGroup', () => {
  it('calls dispose on geometry and material of nested meshes', () => {
    const geo = { dispose: vi.fn() };
    const mat = { dispose: vi.fn() };
    const mesh = new THREE.Mesh() as any;
    mesh.geometry = geo;
    mesh.material = mat;

    const group = {
      traverse: (fn: (child: any) => void) => {
        fn(mesh);
      },
    } as any;

    disposeGroup(group);
    expect(geo.dispose).toHaveBeenCalled();
    expect(mat.dispose).toHaveBeenCalled();
  });

  it('handles group with no children without error', () => {
    const group = {
      traverse: (_fn: (child: any) => void) => {},
    } as any;
    expect(() => disposeGroup(group)).not.toThrow();
  });
});

describe('StructureRegistry', () => {
  it('register and get a generator', async () => {
    const { StructureRegistry } = await import('../../src/structures/registry');
    const gen = vi.fn();
    StructureRegistry.register('test-type', gen as any);
    expect(StructureRegistry.get('test-type')).toBe(gen);
  });

  it('get returns undefined for unknown type', async () => {
    const { StructureRegistry } = await import('../../src/structures/registry');
    expect(StructureRegistry.get('nonexistent-xyz')).toBeUndefined();
  });

  it('getTypes returns registered type names', async () => {
    const { StructureRegistry } = await import('../../src/structures/registry');
    StructureRegistry.register('test-type-abc', vi.fn() as any);
    const types = StructureRegistry.getTypes();
    expect(types).toContain('test-type-abc');
  });
});
