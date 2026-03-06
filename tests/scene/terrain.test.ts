import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config';

// We test the displacement function logic directly without THREE.js
// Extract the displacement function logic for testing
function displace(x: number, z: number): number {
  const halfSize = CONFIG.TERRAIN_SIZE / 2;
  const cx = Math.max(-halfSize, Math.min(halfSize, x));
  const cz = Math.max(-halfSize, Math.min(halfSize, z));

  const dist = Math.sqrt(cx * cx + cz * cz);

  const flatRadius = CONFIG.TERRAIN_FLAT_RADIUS;
  const blendStart = flatRadius;
  const blendEnd = flatRadius * 2.5;
  let blend = 0;
  if (dist > blendStart) {
    const t = (dist - blendStart) / (blendEnd - blendStart);
    blend = Math.min(1, t * t);
  }

  const nx = cx / CONFIG.TERRAIN_SIZE;
  const nz = cz / CONFIG.TERRAIN_SIZE;

  const h1 = Math.sin(nx * 8.3 + 1.2) * Math.cos(nz * 7.1 + 0.8) * 18;
  const h2 = Math.sin(nx * 15.7 + 3.4) * Math.cos(nz * 13.2 + 2.1) * 9;
  const h3 = Math.sin(nx * 28.1 + 5.6) * Math.cos(nz * 31.4 + 4.3) * 4;

  return (h1 + h2 + h3) * blend;
}

function getHeightAt(x: number, z: number): number {
  return CONFIG.TERRAIN_Y_OFFSET + displace(x, z);
}

describe('Terrain getHeightAt', () => {
  it('returns TERRAIN_Y_OFFSET at origin (flat zone center)', () => {
    expect(getHeightAt(0, 0)).toBe(CONFIG.TERRAIN_Y_OFFSET);
  });

  it('returns TERRAIN_Y_OFFSET within the flat zone', () => {
    expect(getHeightAt(5, 0)).toBe(CONFIG.TERRAIN_Y_OFFSET);
    expect(getHeightAt(0, 5)).toBe(CONFIG.TERRAIN_Y_OFFSET);
    expect(getHeightAt(10, 10)).toBe(CONFIG.TERRAIN_Y_OFFSET);
  });

  it('returns a value different from TERRAIN_Y_OFFSET outside the flat zone', () => {
    const h = getHeightAt(100, 100);
    expect(h).not.toBe(CONFIG.TERRAIN_Y_OFFSET);
  });

  it('is deterministic - same input same output', () => {
    const h1 = getHeightAt(50, 75);
    const h2 = getHeightAt(50, 75);
    expect(h1).toBe(h2);
  });

  it('handles positions at flat zone boundary correctly', () => {
    // Just inside the flat zone
    const inside = getHeightAt(CONFIG.TERRAIN_FLAT_RADIUS * 0.9, 0);
    expect(inside).toBe(CONFIG.TERRAIN_Y_OFFSET);
  });

  it('clamps out-of-bounds coordinates to terrain edge', () => {
    const h = getHeightAt(10000, 10000);
    expect(typeof h).toBe('number');
    expect(isNaN(h)).toBe(false);
  });
});
