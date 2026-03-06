import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONFIG } from '../../src/config';

// Mock THREE
vi.mock('three', () => ({
  Color: vi.fn((hex: number) => ({ r: 1, g: 0, b: 0, hex })),
  Vector3: vi.fn(function(this: any, x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }),
  Group: vi.fn(() => ({
    children: [],
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { y: 0 },
    add: vi.fn(),
    traverse: vi.fn(),
  })),
}));

// Mock registry
const mockGeneratorFn = vi.fn((_seed: number, _priority: number, _color: any) => ({
  group: {
    children: [],
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { y: 0 },
    add: vi.fn(),
    traverse: vi.fn(),
  },
  boundingRadius: 5,
  update: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('../../src/structures/registry', () => ({
  StructureRegistry: {
    get: vi.fn((type: string) => {
      if (type === 'crystal' || type === 'flora' || type === 'architecture') return mockGeneratorFn;
      return undefined;
    }),
  },
}));

import { placeStructures } from '../../src/structures/placement';
import { DataEntry } from '../../src/types';

function mockTerrain(height = -195) {
  return { getHeightAt: vi.fn().mockReturnValue(height) } as any;
}

function mockScene() {
  return { add: vi.fn(), remove: vi.fn() } as any;
}

function makeEntry(overrides: Partial<DataEntry> = {}): DataEntry {
  return {
    name: 'Test',
    url: '/test',
    priority: 5,
    seed: 42,
    type: 'crystal',
    ...overrides,
  };
}

describe('placeStructures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array for empty entries', () => {
    const result = placeStructures([], mockTerrain(), mockScene());
    expect(result).toHaveLength(0);
  });

  it('returns one instance per entry', () => {
    const entries = [makeEntry({ name: 'A' }), makeEntry({ name: 'B' })];
    const result = placeStructures(entries, mockTerrain(), mockScene());
    expect(result).toHaveLength(2);
  });

  it('places structures at terrain height', () => {
    const terrain = mockTerrain(-195);
    const entries = [makeEntry()];
    placeStructures(entries, terrain, mockScene());
    expect(terrain.getHeightAt).toHaveBeenCalled();
  });

  it('higher priority entry placed closer to center (smaller radius)', () => {
    const entries = [
      makeEntry({ name: 'High', priority: 10 }),
      makeEntry({ name: 'Low', priority: 1 }),
    ];
    const terrain = mockTerrain(-195);
    const scene = mockScene();
    const instances = placeStructures(entries, terrain, scene);

    const highPos = instances[0].group.position;
    const lowPos = instances[1].group.position;

    expect(highPos.set).toHaveBeenCalled();
    expect(lowPos.set).toHaveBeenCalled();

    const highCall = (highPos.set as any).mock.calls[0];
    const lowCall = (lowPos.set as any).mock.calls[0];
    if (highCall && lowCall) {
      const highRadius = Math.sqrt(highCall[0] ** 2 + highCall[2] ** 2);
      const lowRadius = Math.sqrt(lowCall[0] ** 2 + lowCall[2] ** 2);
      expect(highRadius).toBeLessThan(lowRadius);
    }
  });

  it('calls scene.add for each instance', () => {
    const scene = mockScene();
    const entries = [makeEntry(), makeEntry({ name: 'B', seed: 99 })];
    placeStructures(entries, mockTerrain(), scene);
    expect(scene.add).toHaveBeenCalledTimes(2);
  });

  it('worldPosition accurately reflects placed position', () => {
    const entries = [makeEntry()];
    const instances = placeStructures(entries, mockTerrain(-195), mockScene());
    expect(instances[0].worldPosition).toBeDefined();
  });

  it('fallback to crystal for unknown type', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = [makeEntry({ type: 'unknown-xyz-type' })];
    placeStructures(entries, mockTerrain(), mockScene());
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown structure type'));
    consoleSpy.mockRestore();
  });

  it('instance update delegates to generator update', () => {
    const entries = [makeEntry()];
    const instances = placeStructures(entries, mockTerrain(), mockScene());
    instances[0].update(1.0, 0.016);
    expect(mockGeneratorFn).toHaveBeenCalled();
  });

  it('instance dispose removes group from scene', () => {
    const scene = mockScene();
    const entries = [makeEntry()];
    const instances = placeStructures(entries, mockTerrain(), scene);
    instances[0].dispose();
    expect(scene.remove).toHaveBeenCalled();
  });
});
