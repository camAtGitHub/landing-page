import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CONFIG } from '../config';

export interface PostProcessing {
  render: () => void;
  resize: (width: number, height: number) => void;
  enabled: boolean;
  dispose: () => void;
}

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostProcessing {
  let enabled = true;
  let frameCount = 0;
  let fpsAccum = 0;
  let lastTime = performance.now();
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;

  try {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      CONFIG.BLOOM_STRENGTH,
      CONFIG.BLOOM_RADIUS,
      CONFIG.BLOOM_THRESHOLD,
    );
    composer.addPass(bloomPass);
  } catch (e) {
    console.error('Failed to initialize post-processing, falling back to standard render:', e);
    enabled = false;
  }

  const render = (): void => {
    if (!enabled || !composer) {
      renderer.render(scene, camera);
      return;
    }

    // Performance monitoring over first 60 frames
    if (frameCount < 60) {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;
      if (dt > 0) {
        fpsAccum += 1000 / dt;
        frameCount++;
        if (frameCount === 60) {
          const avgFps = fpsAccum / 60;
          if (avgFps < 30) {
            enabled = false;
            console.info('Bloom disabled for performance');
          }
        }
      }
    }

    try {
      if (enabled && composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    } catch (e) {
      console.error('Render error, disabling bloom:', e);
      enabled = false;
      renderer.render(scene, camera);
    }
  };

  const resize = (width: number, height: number): void => {
    if (!composer) return;
    composer.setSize(width, height);
    if (bloomPass) {
      bloomPass.resolution.set(width, height);
    }
  };

  const dispose = (): void => {
    if (composer) {
      composer.passes.forEach((pass) => {
        if ('dispose' in pass && typeof (pass as any).dispose === 'function') {
          (pass as any).dispose();
        }
      });
    }
  };

  return { render, resize, get enabled() { return enabled; }, dispose };
}
