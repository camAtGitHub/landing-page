import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONFIG } from '../../src/config';

vi.mock('three', () => ({
  Vector3: vi.fn(function (this: any, x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
    this.set = vi.fn().mockReturnThis();
    this.copy = vi.fn().mockImplementation(function (this: any, v: any) { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
    this.normalize = vi.fn().mockReturnThis();
    this.clone = vi.fn().mockReturnThis();
  }),
}));

function mockCamera() {
  const pos = { x: 0, y: CONFIG.TERRAIN_Y_OFFSET + 5, z: 25, set: vi.fn().mockImplementation(function (_x: number, _y: number, _z: number) { pos.x = _x; pos.y = _y; pos.z = _z; }) };
  return {
    position: pos,
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
  } as any;
}

function mockTerrain(height = CONFIG.TERRAIN_Y_OFFSET) {
  return { getHeightAt: vi.fn().mockReturnValue(height) } as any;
}

describe('FreeCamController', () => {
  let camera: any;
  let terrain: any;

  beforeEach(() => {
    camera = mockCamera();
    terrain = mockTerrain();
    vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('performance', { now: vi.fn().mockReturnValue(1000) });
  });

  it('activate sets camera rotation order to YXZ', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(terrain);
    ctrl.activate(camera);
    expect(camera.rotation.order).toBe('YXZ');
  });

  it('deactivate removes event listeners', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(terrain);
    ctrl.activate(camera);
    ctrl.deactivate();
    expect(document.removeEventListener).toHaveBeenCalled();
  });

  it('update applies boundary pushback when outside boundary', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(terrain);
    ctrl.activate(camera);
    camera.position.x = 999;
    camera.position.z = 0;
    const beforeX = camera.position.x;
    ctrl.update(camera, 0.016, 1.0);
    // Pushback reduces x (gradual, not instant hard-clamp)
    expect(Math.abs(camera.position.x)).toBeLessThan(beforeX);
  });

  it('update sets camera Y near terrain height + offset', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(mockTerrain(-200));
    ctrl.activate(camera);
    // Run several frames to converge height lerp
    for (let i = 0; i < 20; i++) ctrl.update(camera, 1.0, i);
    expect(camera.position.y).toBeGreaterThanOrEqual(-200);
  });

  it('update does not throw', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(terrain);
    ctrl.activate(camera);
    expect(() => ctrl.update(camera, 0.016, 0.5)).not.toThrow();
  });
});
