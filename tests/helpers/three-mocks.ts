import { vi } from 'vitest';

export function mockVector3(x = 0, y = 0, z = 0) {
  return { x, y, z, set: vi.fn(), copy: vi.fn(), clone: vi.fn() };
}

export function mockGroup() {
  const children: any[] = [];
  return {
    children,
    position: mockVector3(),
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    scale: { x: 1, y: 1, z: 1 },
    add: vi.fn((child: any) => { children.push(child); }),
    remove: vi.fn(),
  };
}

export function mockCamera() {
  return {
    position: mockVector3(0, 300, 0),
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    aspect: 16 / 9,
    updateProjectionMatrix: vi.fn(),
    lookAt: vi.fn(),
  };
}

export function mockMesh() {
  return {
    geometry: { dispose: vi.fn() },
    material: { dispose: vi.fn(), emissiveIntensity: 0.5 },
    position: mockVector3(),
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}
