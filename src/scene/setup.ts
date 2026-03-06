import * as THREE from 'three';
import { CONFIG } from '../config';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resize: () => void;
}

export function initScene(): SceneContext {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: CONFIG.RENDERER_ANTIALIAS });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.RENDERER_PIXEL_RATIO_MAX));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(CONFIG.FOG_COLOR, CONFIG.FOG_DENSITY);
  scene.background = new THREE.Color(CONFIG.SKY_COLOR);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA_FOV,
    Math.max(window.innerWidth, 1) / Math.max(window.innerHeight, 1),
    CONFIG.CAMERA_NEAR,
    CONFIG.CAMERA_FAR,
  );
  camera.position.set(0, CONFIG.DESCENT_START_Y, 0);
  camera.lookAt(0, -200, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x111133, 1.0);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x8800cc, 0.8);
  dirLight.position.set(0, 100, 50);
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0x001133, 0xff00aa, 0.3);
  scene.add(hemiLight);

  // Resize handler
  const resize = (): void => {
    const w = Math.max(window.innerWidth, 1);
    const h = Math.max(window.innerHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resize);

  // WebGL context loss handler
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    console.error('WebGL context lost:', event);
  });

  return { renderer, scene, camera, resize };
}
