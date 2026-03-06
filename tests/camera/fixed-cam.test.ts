import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFixedCamController } from '../../src/camera/fixed-cam';
import { CONFIG } from '../../src/config';

function mockCamera() {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
  } as any;
}

describe('FixedCamController', () => {
  let camera: any;
  let ctrl: ReturnType<typeof createFixedCamController>;

  beforeEach(() => {
    camera = mockCamera();
    vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080 });
    ctrl = createFixedCamController();
  });

  it('activate registers event listeners', () => {
    ctrl.activate(camera);
    expect(document.addEventListener).toHaveBeenCalled();
  });

  it('deactivate removes event listeners', () => {
    ctrl.activate(camera);
    ctrl.deactivate();
    expect(document.removeEventListener).toHaveBeenCalled();
  });

  it('orbit position at elapsed=0 places camera at z=ORBIT_RADIUS (no parallax)', () => {
    ctrl.activate(camera);
    ctrl.update(camera, 0.016, 0);
    // sin(0)=0 → x≈0, cos(0)=1 → z≈ORBIT_RADIUS (plus tiny smoothed parallax)
    expect(camera.position.z).toBeCloseTo(CONFIG.FIXED_CAM_ORBIT_RADIUS, 0);
    expect(camera.position.x).toBeCloseTo(0, 0);
  });

  it('orbit changes with elapsed time', () => {
    ctrl.activate(camera);
    ctrl.update(camera, 0.016, 0);
    const z0 = camera.position.z;
    const quarterPeriod = (Math.PI / 2) / CONFIG.FIXED_CAM_ORBIT_SPEED;
    ctrl.update(camera, 0.016, quarterPeriod);
    expect(Math.abs(camera.position.z - z0)).toBeGreaterThan(1);
  });

  it('camera always calls lookAt', () => {
    ctrl.activate(camera);
    ctrl.update(camera, 0.016, 0);
    expect(camera.lookAt).toHaveBeenCalled();
  });

  it('camera height is near FIXED_CAM_HEIGHT with no input', () => {
    ctrl.activate(camera);
    ctrl.update(camera, 0.016, 0);
    expect(camera.position.y).toBeCloseTo(CONFIG.FIXED_CAM_HEIGHT, 0);
  });
});
