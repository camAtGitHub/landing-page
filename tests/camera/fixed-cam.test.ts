import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFixedCamController } from '../../src/camera/fixed-cam';
import { CONFIG } from '../../src/config';

function mockCamera() {
  return {
    position: { x: 0, y: CONFIG.TERRAIN_Y_OFFSET + 6, z: CONFIG.FIXED_CAM_ORBIT_RADIUS },
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    lookAt: vi.fn(),
  } as any;
}

describe('FixedCamController', () => {
  let camera: any;
  let listeners: Record<string, (e: any) => void>;
  let domElement: any;
  let ctrl: ReturnType<typeof createFixedCamController>;

  beforeEach(() => {
    listeners = {};
    domElement = {
      addEventListener: vi.fn((name: string, cb: (e: any) => void) => {
        listeners[name] = cb;
      }),
      removeEventListener: vi.fn((name: string) => {
        delete listeners[name];
      }),
    };

    camera = mockCamera();

    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    ctrl = createFixedCamController({
      domElement,
      terrain: {
        getHeightAt: vi.fn(() => CONFIG.TERRAIN_Y_OFFSET),
      } as any,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('activate registers touch listeners on renderer element', () => {
    ctrl.activate(camera);
    expect(domElement.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
    expect(domElement.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
    expect(domElement.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true });
    expect(domElement.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), { passive: true });
  });

  it('single-finger drag updates orbit yaw', () => {
    ctrl.activate(camera);
    ctrl.update(camera, 0.016, 0);
    const beforeX = camera.position.x;

    listeners.touchstart({ touches: [{ clientX: 100, clientY: 120, identifier: 1 }] });
    listeners.touchmove({ touches: [{ clientX: 180, clientY: 120, identifier: 1 }], preventDefault: vi.fn() });
    ctrl.update(camera, 0.016, 0.016);

    expect(camera.position.x).not.toBeCloseTo(beforeX, 3);
  });

  it('after drag release it holds, then resumes orbit after delay', () => {
    vi.useFakeTimers();
    ctrl.activate(camera);

    listeners.touchstart({ touches: [{ clientX: 100, clientY: 100, identifier: 1 }] });
    listeners.touchmove({ touches: [{ clientX: 240, clientY: 100, identifier: 1 }], preventDefault: vi.fn() });
    ctrl.update(camera, 0.016, 0.016);
    const heldX = camera.position.x;

    listeners.touchend({ touches: [], changedTouches: [{ clientX: 240, clientY: 100 }] });
    ctrl.update(camera, 0.5, 0.5);
    expect(camera.position.x).toBeCloseTo(heldX, 2);

    vi.advanceTimersByTime(CONFIG.FIXED_CAM_RESUME_ORBIT_DELAY + 10);
    ctrl.update(camera, 2, 2);
    expect(camera.position.x).not.toBeCloseTo(heldX, 2);
  });

  it('pinch gesture clamps orbit radius', () => {
    ctrl.activate(camera);

    listeners.touchstart({
      touches: [
        { clientX: 100, clientY: 100, identifier: 1 },
        { clientX: 350, clientY: 100, identifier: 2 },
      ],
    });

    listeners.touchmove({
      touches: [
        { clientX: 100, clientY: 100, identifier: 1 },
        { clientX: 105, clientY: 100, identifier: 2 },
      ],
      preventDefault: vi.fn(),
    });

    ctrl.update(camera, 0.016, 0);
    const distToFocal = Math.hypot(
      camera.position.x,
      camera.position.y - (CONFIG.TERRAIN_Y_OFFSET + 5),
      camera.position.z,
    );

    expect(distToFocal).toBeLessThanOrEqual(CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX + 0.5);
    expect(distToFocal).toBeGreaterThanOrEqual(CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN - 0.5);
  });

  it('pinch gesture calls preventDefault to block browser zoom', () => {
    ctrl.activate(camera);

    listeners.touchstart({
      touches: [
        { clientX: 100, clientY: 100, identifier: 1 },
        { clientX: 300, clientY: 100, identifier: 2 },
      ],
    });

    const preventDefaultSpy = vi.fn();
    listeners.touchmove({
      touches: [
        { clientX: 100, clientY: 100, identifier: 1 },
        { clientX: 250, clientY: 100, identifier: 2 },
      ],
      preventDefault: preventDefaultSpy,
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
