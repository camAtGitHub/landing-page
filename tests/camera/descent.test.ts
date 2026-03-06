import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDescentController } from '../../src/camera/descent';
import { CONFIG } from '../../src/config';

function mockSkyContext(starCount = 10) {
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3 + 1] = 100 + i * 10; // y positions
  }
  return {
    stars: {} as any,
    starPositions: {
      array: positions,
      needsUpdate: false,
    } as any,
    starSpeeds: new Float32Array(starCount).fill(1.0),
    starMaterial: { opacity: 1.0 } as any,
    nebulae: [],
  };
}

function mockFog(density = 0.002) {
  return { density };
}

function mockCamera() {
  return {
    position: { x: 0, y: CONFIG.DESCENT_START_Y, z: 0, set: vi.fn() },
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ', set: vi.fn() },
    updateProjectionMatrix: vi.fn(),
    lookAt: vi.fn(),
  } as any;
}

describe('DescentController', () => {
  let sky: ReturnType<typeof mockSkyContext>;
  let fog: ReturnType<typeof mockFog>;
  let camera: any;
  let scene: any;
  let controller: ReturnType<typeof createDescentController>;

  beforeEach(() => {
    sky = mockSkyContext(CONFIG.STAR_COUNT);
    fog = mockFog(0.002);
    camera = mockCamera();
    scene = { fog };
    controller = createDescentController({ sky, scene, fog: fog as any });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('isComplete returns false before activation', () => {
    expect(controller.isComplete!()).toBe(false);
  });

  it('getProgress returns 0 before any update', () => {
    controller.activate(camera);
    expect(controller.getProgress()).toBe(0);
  });

  it('progress increases with each update call', () => {
    controller.activate(camera);
    controller.update(camera, 1.0, 0);
    expect(controller.getProgress()).toBeGreaterThan(0);
  });

  it('isComplete returns true when progress reaches 1.0', () => {
    controller.activate(camera);
    for (let i = 0; i < 150; i++) {
      controller.update(camera, 0.1, i * 0.1);
    }
    expect(controller.isComplete!()).toBe(true);
    expect(controller.getProgress()).toBe(1.0);
  });

  it('progress at 50% places camera between start and end Y', () => {
    controller.activate(camera);
    const halfTime = CONFIG.DESCENT_DURATION_SECONDS / 2;
    for (let t = 0; t < halfTime; t += 0.1) {
      controller.update(camera, 0.1, t);
    }
    const p = controller.getProgress();
    expect(p).toBeGreaterThan(0.3);
    expect(p).toBeLessThan(0.7);
  });

  it('clamps large delta values to 0.1', () => {
    controller.activate(camera);
    controller.update(camera, 100, 0);
    const maxExpectedProgress = 0.1 / CONFIG.DESCENT_DURATION_SECONDS;
    expect(controller.getProgress()).toBeLessThanOrEqual(maxExpectedProgress + 0.001);
  });

  it('sets needsUpdate true on star positions each frame', () => {
    controller.activate(camera);
    sky.starPositions.needsUpdate = false;
    controller.update(camera, 0.016, 0);
    expect(sky.starPositions.needsUpdate).toBe(true);
  });

  it('star positions change during descent', () => {
    controller.activate(camera);
    const initialY = (sky.starPositions.array as Float32Array)[1];
    for (let t = 0; t < 7; t += 0.1) {
      controller.update(camera, 0.1, t);
    }
    const finalY = (sky.starPositions.array as Float32Array)[1];
    expect(finalY).not.toBe(initialY);
  });

  it('fog density increases during descent', () => {
    controller.activate(camera);
    const initialDensity = fog.density;
    for (let t = 0; t < 14; t += 0.1) {
      controller.update(camera, 0.1, t);
    }
    expect(fog.density).toBeGreaterThan(initialDensity);
  });

  it('activate resets progress to 0', () => {
    controller.activate(camera);
    for (let i = 0; i < 10; i++) {
      controller.update(camera, 0.1, i * 0.1);
    }
    expect(controller.getProgress()).toBeGreaterThan(0);

    camera = mockCamera();
    controller.activate(camera);
    expect(controller.getProgress()).toBe(0);
  });
});
