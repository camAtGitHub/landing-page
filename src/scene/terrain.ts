import * as THREE from 'three';
import { CONFIG } from '../config';

export interface TerrainContext {
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  getHeightAt: (x: number, z: number) => number;
}

/**
 * Displacement function - shared between geometry generation and getHeightAt.
 * Returns height offset relative to TERRAIN_Y_OFFSET.
 */
function displace(x: number, z: number): number {
  const halfSize = CONFIG.TERRAIN_SIZE / 2;
  // Clamp to terrain bounds
  const cx = Math.max(-halfSize, Math.min(halfSize, x));
  const cz = Math.max(-halfSize, Math.min(halfSize, z));

  const dist = Math.sqrt(cx * cx + cz * cz);

  // Flat zone blend - quadratic for smooth transition
  const flatRadius = CONFIG.TERRAIN_FLAT_RADIUS;
  const blendStart = flatRadius;
  const blendEnd = flatRadius * 2.5;
  let blend = 0;
  if (dist > blendStart) {
    const t = (dist - blendStart) / (blendEnd - blendStart);
    blend = Math.min(1, t * t);
  }

  // Multi-octave displacement
  const nx = cx / CONFIG.TERRAIN_SIZE;
  const nz = cz / CONFIG.TERRAIN_SIZE;

  const h1 = Math.sin(nx * 8.3 + 1.2) * Math.cos(nz * 7.1 + 0.8) * 18;
  const h2 = Math.sin(nx * 15.7 + 3.4) * Math.cos(nz * 13.2 + 2.1) * 9;
  const h3 = Math.sin(nx * 28.1 + 5.6) * Math.cos(nz * 31.4 + 4.3) * 4;

  return (h1 + h2 + h3) * blend;
}

export function createTerrain(scene: THREE.Scene): TerrainContext {
  const geometry = new THREE.PlaneGeometry(
    CONFIG.TERRAIN_SIZE,
    CONFIG.TERRAIN_SIZE,
    CONFIG.TERRAIN_SEGMENTS,
    CONFIG.TERRAIN_SEGMENTS,
  );

  // Rotate to horizontal (XZ plane)
  geometry.rotateX(-Math.PI / 2);

  // Displace vertices
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = displace(x, z);
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  // Solid terrain mesh
  const material = new THREE.MeshStandardMaterial({
    color: CONFIG.TERRAIN_BASE_COLOR,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = CONFIG.TERRAIN_Y_OFFSET;
  scene.add(mesh);

  // Wireframe overlay
  const wireGeometry = new THREE.WireframeGeometry(geometry);
  const wireMaterial = new THREE.LineBasicMaterial({
    color: CONFIG.TERRAIN_WIRE_COLOR,
    transparent: true,
    opacity: CONFIG.TERRAIN_WIRE_OPACITY,
    depthWrite: false,
  });
  const wireframe = new THREE.LineSegments(wireGeometry, wireMaterial);
  wireframe.position.y = CONFIG.TERRAIN_Y_OFFSET;
  scene.add(wireframe);

  const getHeightAt = (x: number, z: number): number => {
    return CONFIG.TERRAIN_Y_OFFSET + displace(x, z);
  };

  return { mesh, wireframe, getHeightAt };
}
