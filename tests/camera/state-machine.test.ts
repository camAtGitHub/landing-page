import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraStateMachine, CameraController } from '../../src/camera/state-machine';
import { CameraState } from '../../src/types';
import { mockCamera } from '../helpers/three-mocks';

function mockController(isCompleteVal = false): CameraController & {
  activateCalls: number;
  deactivateCalls: number;
  updateCalls: number;
} {
  let activateCalls = 0;
  let deactivateCalls = 0;
  let updateCalls = 0;
  return {
    get activateCalls() { return activateCalls; },
    get deactivateCalls() { return deactivateCalls; },
    get updateCalls() { return updateCalls; },
    activate: vi.fn(() => { activateCalls++; }),
    deactivate: vi.fn(() => { deactivateCalls++; }),
    update: vi.fn(() => { updateCalls++; }),
    isComplete: vi.fn(() => isCompleteVal),
  };
}


describe('CameraStateMachine', () => {
  let camera: any;
  let sm: CameraStateMachine;

  beforeEach(() => {
    camera = mockCamera();
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.spyOn(performance, 'now').mockReturnValue(10000);
    sm = new CameraStateMachine(camera, false);
  });

  it('initial state is DESCENT', () => {
    expect(sm.getState()).toBe(CameraState.DESCENT);
  });

  it('registers controllers and calls update on active controller', () => {
    const ctrl = mockController();
    sm.registerController(CameraState.DESCENT, ctrl);
    sm.update(0.016, 1.0);
    expect(ctrl.updateCalls).toBe(1);
  });

  it('auto-transitions from DESCENT when isComplete returns true', () => {
    const descentCtrl = mockController(true);
    const freeCamCtrl = mockController(false);
    sm.registerController(CameraState.DESCENT, descentCtrl);
    sm.registerController(CameraState.FREE_CAM, freeCamCtrl);

    sm.update(0.016, 14.1);
    expect(sm.getState()).toBe(CameraState.FREE_CAM);
    expect(freeCamCtrl.activateCalls).toBe(1);
    expect(descentCtrl.deactivateCalls).toBe(1);
  });

  it('skip() transitions from DESCENT to FREE_CAM on desktop', () => {
    const descentCtrl = mockController(false);
    const freeCamCtrl = mockController(false);
    sm.registerController(CameraState.DESCENT, descentCtrl);
    sm.registerController(CameraState.FREE_CAM, freeCamCtrl);

    sm.skip();
    expect(sm.getState()).toBe(CameraState.FREE_CAM);
  });

  it('skip() transitions to FIXED_CAM on mobile', () => {
    camera = mockCamera();
    vi.spyOn(performance, 'now').mockReturnValue(10000);
    // window is already stubbed by beforeEach
    const mobileSm = new CameraStateMachine(camera, true);
    const descentCtrl = mockController(false);
    const fixedCtrl = mockController(false);
    mobileSm.registerController(CameraState.DESCENT, descentCtrl);
    mobileSm.registerController(CameraState.FIXED_CAM, fixedCtrl);

    mobileSm.skip();
    expect(mobileSm.getState()).toBe(CameraState.FIXED_CAM);
  });

  it('skip() is a no-op when not in DESCENT', () => {
    const descentCtrl = mockController(false);
    const freeCamCtrl = mockController(false);
    const fixedCtrl = mockController(false);
    sm.registerController(CameraState.DESCENT, descentCtrl);
    sm.registerController(CameraState.FREE_CAM, freeCamCtrl);
    sm.registerController(CameraState.FIXED_CAM, fixedCtrl);

    sm.skip(); // go to free cam
    const stateAfterSkip = sm.getState();

    vi.spyOn(performance, 'now').mockReturnValue(20000); // advance time past cooldown
    sm.skip(); // no-op
    expect(sm.getState()).toBe(stateAfterSkip);
  });

  it('toggle() after descent swaps between FREE_CAM and FIXED_CAM', () => {
    const descentCtrl = mockController(false);
    const freeCamCtrl = mockController(false);
    const fixedCtrl = mockController(false);
    sm.registerController(CameraState.DESCENT, descentCtrl);
    sm.registerController(CameraState.FREE_CAM, freeCamCtrl);
    sm.registerController(CameraState.FIXED_CAM, fixedCtrl);

    // Go to free cam first
    sm.skip();
    expect(sm.getState()).toBe(CameraState.FREE_CAM);

    // Advance time to pass cooldown
    vi.spyOn(performance, 'now').mockReturnValue(20000);
    sm.toggle();
    expect(sm.getState()).toBe(CameraState.FIXED_CAM);

    vi.spyOn(performance, 'now').mockReturnValue(30000);
    sm.toggle();
    expect(sm.getState()).toBe(CameraState.FREE_CAM);
  });

  it('toggle() during DESCENT is a no-op', () => {
    sm.toggle();
    expect(sm.getState()).toBe(CameraState.DESCENT);
  });

  it('enforces transition cooldown', () => {
    const descentCtrl = mockController(false);
    const freeCamCtrl = mockController(false);
    const fixedCtrl = mockController(false);
    sm.registerController(CameraState.DESCENT, descentCtrl);
    sm.registerController(CameraState.FREE_CAM, freeCamCtrl);
    sm.registerController(CameraState.FIXED_CAM, fixedCtrl);

    sm.skip(); // to free cam at time 10000
    expect(sm.getState()).toBe(CameraState.FREE_CAM);

    // Within cooldown window - toggle should be ignored
    vi.spyOn(performance, 'now').mockReturnValue(10100); // only 100ms later
    sm.toggle();
    expect(sm.getState()).toBe(CameraState.FREE_CAM); // unchanged
  });

  it('fires onStateChange callbacks after transition', () => {
    const cb = vi.fn();
    sm.onStateChange(cb);
    const descentCtrl = mockController(false);
    const freeCamCtrl = mockController(false);
    sm.registerController(CameraState.DESCENT, descentCtrl);
    sm.registerController(CameraState.FREE_CAM, freeCamCtrl);

    sm.skip();
    expect(cb).toHaveBeenCalledWith(CameraState.FREE_CAM, CameraState.DESCENT);
  });

  it('activates new controller before deactivating old one', () => {
    const order: string[] = [];
    const descentCtrl = mockController(false);
    const freeCamCtrl = mockController(false);
    (descentCtrl.deactivate as any).mockImplementation(() => order.push('deactivate'));
    (freeCamCtrl.activate as any).mockImplementation(() => order.push('activate'));
    sm.registerController(CameraState.DESCENT, descentCtrl);
    sm.registerController(CameraState.FREE_CAM, freeCamCtrl);

    sm.skip();
    expect(order[0]).toBe('activate');
    expect(order[1]).toBe('deactivate');
  });

  it('logs error when no controller registered for target state', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sm.skip(); // no FREE_CAM registered
    expect(consoleSpy).toHaveBeenCalled();
    expect(sm.getState()).toBe(CameraState.DESCENT);
  });
});
