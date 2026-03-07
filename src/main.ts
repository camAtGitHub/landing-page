import * as THREE from 'three';
import { CONFIG } from './config';
import { CameraState } from './types';
import { loadSiteData } from './data/loader';
import { initScene } from './scene/setup';
import { createTerrain } from './scene/terrain';
import { createSky } from './scene/sky';
import { CameraStateMachine } from './camera/state-machine';
import { createDescentController } from './camera/descent';
import { createFreeCamController } from './camera/free-cam';
import { createFixedCamController } from './camera/fixed-cam';
import { placeStructures } from './structures/placement';
import { createLabels } from './ui/labels';
import { createDescentHUD } from './hud/descent-hud';
import { createModeIndicator } from './ui/mode-indicator';
import { createControlHints } from './ui/control-hints';
import { createAmbientParticles } from './effects/ambient-particles';
import { createStructureParticles } from './structures/particles';
import { createPostProcessing } from './effects/post-processing';
import { createLoadingScreen } from './ui/loading';

// Side-effect imports — registers all structure generators with the registry
import './structures/generators/crystal';
import './structures/generators/flora';
import './structures/generators/mushroom';
import './structures/generators/vortex';
import './structures/generators/geometric';
import './structures/generators/entity';
import './structures/generators/architecture';

(async () => {
  const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT_PX;

  const ctx = initScene();

  const loading = createLoadingScreen();
  loading.show();

  const entries = await loadSiteData().catch((err: Error) => {
    console.error('Failed to load data.json:', err);
    return [];
  });

  const terrain = createTerrain(ctx.scene);
  const sky = createSky(ctx.scene);

  const fog = ctx.scene.fog as THREE.FogExp2;
  const stateMachine = new CameraStateMachine(ctx.camera, isMobile);

  const descentCtrl = createDescentController({ sky, scene: ctx.scene, fog });
  const freeCtrl = createFreeCamController(terrain);
  const fixedCtrl = createFixedCamController({ domElement: ctx.renderer.domElement, terrain });

  stateMachine.registerController(CameraState.DESCENT, descentCtrl);
  stateMachine.registerController(CameraState.FREE_CAM, freeCtrl);
  stateMachine.registerController(CameraState.FIXED_CAM, fixedCtrl);

  const instances = placeStructures(entries, terrain, ctx.scene);

  const labels = createLabels(instances, ctx.camera);
  labels.hide();

  stateMachine.onStateChange((newState, oldState) => {
    if (oldState === CameraState.DESCENT) {
      labels.show();
    }
    if (newState === CameraState.DESCENT) {
      labels.hide();
    }
  });

  const hud = createDescentHUD(stateMachine);
  createModeIndicator(stateMachine, isMobile);
  createControlHints(stateMachine, isMobile);

  const ambientParticles = createAmbientParticles(ctx.scene);
  const structureParticles = createStructureParticles(instances, ctx.scene);

  const postProc = createPostProcessing(ctx.renderer, ctx.scene, ctx.camera);

  loading.hide();

  window.addEventListener('resize', () => {
    ctx.resize();
    postProc.resize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function animate(): void {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    stateMachine.update(delta, elapsed);
    instances.forEach((s) => s.update(elapsed, delta));
    labels.update();
    hud.update(descentCtrl.getProgress());
    ambientParticles.update(elapsed, delta);
    structureParticles.update(elapsed, delta);
    postProc.render();
  }

  animate();
})();
