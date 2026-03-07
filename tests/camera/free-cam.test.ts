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

function mockDocumentWithListeners() {
  const listeners: Record<string, (event: any) => void> = {};
  return {
    listeners,
    addEventListener: vi.fn((type: string, handler: (event: any) => void) => {
      listeners[type] = handler;
    }),
    removeEventListener: vi.fn(),
  };
}

describe('FreeCamController', () => {
  let camera: any;
  let terrain: any;
  let docMock: ReturnType<typeof mockDocumentWithListeners>;

  beforeEach(() => {
    camera = mockCamera();
    terrain = mockTerrain();
    docMock = mockDocumentWithListeners();
    vi.stubGlobal('document', docMock);
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

  it('ArrowLeft increases yaw and ArrowRight decreases yaw', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(terrain);
    ctrl.activate(camera);
    ctrl.update(camera, 0.016, 0);
    const startYaw = camera.rotation.y;
    const frameDelta = 0.5; // Larger than frame time to make yaw change clearly measurable.

    docMock.listeners.keydown({ key: 'ArrowLeft' });
    ctrl.update(camera, frameDelta, 0);
    docMock.listeners.keyup({ key: 'ArrowLeft' });
    const yawAfterLeft = camera.rotation.y;
    expect(yawAfterLeft).toBeCloseTo(startYaw + CONFIG.FREE_CAM_ARROW_LOOK_SPEED * frameDelta);

    docMock.listeners.keydown({ key: 'ArrowRight' });
    ctrl.update(camera, frameDelta, frameDelta);
    docMock.listeners.keyup({ key: 'ArrowRight' });
    expect(camera.rotation.y).toBeCloseTo(startYaw);
  });

  it('ArrowUp/ArrowDown move forward/backward like W/S', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(terrain);
    ctrl.activate(camera);
    camera.rotation.y = 0;
    const startZ = camera.position.z;

    docMock.listeners.keydown({ key: 'ArrowUp' });
    ctrl.update(camera, 1, 0);
    docMock.listeners.keyup({ key: 'ArrowUp' });
    expect(camera.position.z).toBeLessThan(startZ);

    docMock.listeners.keydown({ key: 'ArrowDown' });
    ctrl.update(camera, 1, 1);
    docMock.listeners.keyup({ key: 'ArrowDown' });
    expect(camera.position.z).toBeCloseTo(startZ);
  });

  it('A and D still strafe without rotating yaw', async () => {
    const { createFreeCamController } = await import('../../src/camera/free-cam');
    const ctrl = createFreeCamController(terrain);
    ctrl.activate(camera);
    ctrl.update(camera, 0.016, 0);
    const startYaw = camera.rotation.y;

    docMock.listeners.keydown({ key: 'a' });
    ctrl.update(camera, 1, 0);
    docMock.listeners.keyup({ key: 'a' });

    docMock.listeners.keydown({ key: 'd' });
    ctrl.update(camera, 1, 1);
    docMock.listeners.keyup({ key: 'd' });
    expect(camera.rotation.y).toBe(startYaw);
  });
});
