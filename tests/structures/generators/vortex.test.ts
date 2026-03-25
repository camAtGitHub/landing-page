import { describe, it, expect, vi } from 'vitest';
const { createColorMock } = vi.hoisted(() => ({
  createColorMock: () => {
    const obj: any = { r: 1, g: 0, b: 1, clone: vi.fn(), multiplyScalar: vi.fn(), offsetHSL: vi.fn(), getHSL: vi.fn((t: any) => { t.h=0.5;t.s=1;t.l=0.5; }), setHSL: vi.fn(), lerp: vi.fn() };
    obj.clone.mockReturnValue(obj); obj.multiplyScalar.mockReturnValue(obj); obj.offsetHSL.mockReturnValue(obj); obj.setHSL.mockReturnValue(obj); obj.lerp.mockReturnValue(obj);
    return obj;
  },
}));
vi.mock('three', () => ({
  Group: vi.fn(() => { const c: any[] = []; return { children: c, rotation: {y:0,x:0,z:0}, position: {set:vi.fn(),copy:vi.fn(),x:0,y:0,z:0}, scale:{x:1,y:1,z:1,setScalar:vi.fn()}, add: vi.fn((ch: any)=>{c.push(ch);}), traverse:vi.fn() }; }),
  CylinderGeometry: vi.fn(()=>({dispose:vi.fn()})), SphereGeometry: vi.fn(()=>({dispose:vi.fn()})),
  TorusGeometry: vi.fn(()=>({dispose:vi.fn()})), RingGeometry: vi.fn(()=>({dispose:vi.fn()})),
  CircleGeometry: vi.fn(()=>({dispose:vi.fn()})),
  MeshStandardMaterial: vi.fn(()=>({emissiveIntensity:0.5,opacity:0.5,dispose:vi.fn(),transparent:true,depthWrite:true,side:0,blending:0})),
  PointsMaterial: vi.fn(()=>({dispose:vi.fn()})),
  Mesh: vi.fn(function(this:any,g:any,m:any){this.geometry=g||{dispose:vi.fn()};this.material=m||{dispose:vi.fn(),emissiveIntensity:0.5,opacity:0.5};this.position={set:vi.fn(),copy:vi.fn(),x:0,y:0,z:0};this.rotation={set:vi.fn(),x:0,y:0,z:0};this.scale={set:vi.fn(),setScalar:vi.fn(),x:1,y:1,z:1};}),
  Points: vi.fn(function(this:any,g:any,m:any){this.geometry=g||{dispose:vi.fn()};this.material=m||{dispose:vi.fn()};}),
  PointLight: vi.fn(function(this:any){this.position={set:vi.fn(),x:0,y:0,z:0};this.intensity=1;}),
  BufferGeometry: vi.fn(()=>({dispose:vi.fn(),setAttribute:vi.fn()})),
  BufferAttribute: vi.fn(function(this:any,a:any,s:number){this.array=a;this.itemSize=s;this.needsUpdate=false;}),
  Color: vi.fn(createColorMock),
  AdditiveBlending: 2, DoubleSide: 2,
}));
import { StructureRegistry } from '../../../src/structures/registry';
import '../../../src/structures/generators/vortex';
const color = createColorMock() as any;

describe('Vortex Generator', () => {
  it('registers itself in StructureRegistry', () => { expect(StructureRegistry.get('vortex')).toBeDefined(); });
  it('returns bounding radius > 0', () => { expect(StructureRegistry.get('vortex')!(42,5,color).boundingRadius).toBeGreaterThan(0); });
  it('produces deterministic output for same seed', () => { const g=StructureRegistry.get('vortex')!; expect(g(42,5,color).boundingRadius).toBe(g(42,5,color).boundingRadius); });
  it('has component presence (group defined)', () => { const r=StructureRegistry.get('vortex')!(42,5,color); expect(r.group).toBeDefined(); expect(r.group.children.length).toBeGreaterThan(0); });
  it('update() does not throw', () => { const r=StructureRegistry.get('vortex')!(42,5,color); expect(()=>r.update(1.0,0.016)).not.toThrow(); });
  it('dispose() does not throw', () => { const r=StructureRegistry.get('vortex')!(42,5,color); expect(()=>r.dispose()).not.toThrow(); });
});
