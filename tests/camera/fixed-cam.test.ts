import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createFixedCamController } from '../../src/camera/fixed-cam';
import { CONFIG } from '../../src/config';

function createCamera() {
  return {
    position: new THREE.Vector3(0, CONFIG.FIXED_CAM_HEIGHT, CONFIG.FIXED_CAM_ORBIT_RADIUS),
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
  } as unknown as THREE.PerspectiveCamera;
}

describe('FixedCamController', () => {
  let camera: THREE.PerspectiveCamera;
  let addDoc: ReturnType<typeof vi.fn>;
  let removeDoc: ReturnType<typeof vi.fn>;
  let addWindow: ReturnType<typeof vi.fn>;
  let removeWindow: ReturnType<typeof vi.fn>;
  let domElement: {
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  let handlers: Record<string, (e: any) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    handlers = {};

    addDoc = vi.fn();
    removeDoc = vi.fn();
    addWindow = vi.fn();
    removeWindow = vi.fn();

    vi.stubGlobal('document', {
      addEventListener: addDoc,
      removeEventListener: removeDoc,
      elementFromPoint: vi.fn(() => null),
    });
    vi.stubGlobal('window', {
      innerWidth: 1280,
      innerHeight: 720,
      addEventListener: addWindow,
      removeEventListener: removeWindow,
    });

    domElement = {
      addEventListener: vi.fn((name: string, cb: (e: any) => void) => {
        handlers[name] = cb;
      }),
      removeEventListener: vi.fn(),
    };

    camera = createCamera();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('activate registers listeners on document/window/domElement', () => {
    const ctrl = createFixedCamController({ getHeightAt: () => -200 } as any, domElement as any);
    ctrl.activate(camera);

    expect(addDoc).toHaveBeenCalled();
    expect(addWindow).toHaveBeenCalled();
    expect(domElement.addEventListener).toHaveBeenCalled();
  });

  it('single finger drag overrides auto orbit and resumes after delay', () => {
    const ctrl = createFixedCamController({ getHeightAt: () => -200 } as any, domElement as any);
    ctrl.activate(camera);

    handlers.touchstart({ touches: [{ clientX: 100, clientY: 100 }] });
    handlers.touchmove({
      touches: [{ clientX: 160, clientY: 130 }],
      preventDefault: vi.fn(),
    });

    ctrl.update(camera, 0.016, 0);
    const xDuringDrag = camera.position.x;

    handlers.touchend({ touches: [], changedTouches: [{ clientX: 160, clientY: 130 }] });
    ctrl.update(camera, 0.016, 0.5);
    const xDuringHold = camera.position.x;

    vi.advanceTimersByTime(CONFIG.FIXED_CAM_RESUME_ORBIT_DELAY + 1);
    ctrl.update(camera, 1, 2);
    const xAfterResume = camera.position.x;

    expect(Math.abs(xDuringDrag)).toBeGreaterThan(0);
    expect(xDuringHold).toBeCloseTo(xDuringDrag, 1);
    expect(xAfterResume).not.toBeCloseTo(xDuringHold, 3);
  });

  it('pinch gesture clamps orbital radius', () => {
    const ctrl = createFixedCamController({ getHeightAt: () => -200 } as any, domElement as any);
    ctrl.activate(camera);

    handlers.touchstart({
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 400, clientY: 0 },
      ],
    });

    handlers.touchmove({
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 10, clientY: 0 },
      ],
      preventDefault: vi.fn(),
    });
    ctrl.update(camera, 0.016, 0);

    const focal = new THREE.Vector3(0, CONFIG.TERRAIN_Y_OFFSET + 5, 0);
    const radiusAfterZoomOut = camera.position.distanceTo(focal);
    expect(radiusAfterZoomOut).toBeLessThanOrEqual(CONFIG.FIXED_CAM_ORBIT_RADIUS_MAX + 0.01);

    handlers.touchmove({
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 2000, clientY: 0 },
      ],
      preventDefault: vi.fn(),
    });
    ctrl.update(camera, 0.016, 0.1);

    const radiusAfterZoomIn = camera.position.distanceTo(focal);
    expect(radiusAfterZoomIn).toBeGreaterThanOrEqual(CONFIG.FIXED_CAM_ORBIT_RADIUS_MIN - 0.7);
  });

  it('double tap on label triggers blink target update', () => {
    const label = {
      dataset: { worldX: '25', worldY: '-180', worldZ: '10' },
      closest: vi.fn(() => label),
    } as any;

    (document.elementFromPoint as any) = vi.fn(() => label);

    const ctrl = createFixedCamController({ getHeightAt: () => -200 } as any, domElement as any);
    ctrl.activate(camera);

    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    handlers.touchend({ touches: [], changedTouches: [{ clientX: 100, clientY: 100 }] });
    vi.setSystemTime(new Date('2024-01-01T00:00:00.150Z'));
    handlers.touchend({ touches: [], changedTouches: [{ clientX: 104, clientY: 103 }] });

    ctrl.update(camera, 0.016, 0.2);
    const before = camera.position.clone();

    vi.spyOn(performance, 'now').mockReturnValue(2000);
    ctrl.update(camera, 0.016, 0.3);

    expect(document.elementFromPoint).toHaveBeenCalled();
    expect(camera.position.distanceTo(before)).toBeGreaterThan(0.0001);
    expect(camera.lookAt).toHaveBeenCalled();
  });
});
