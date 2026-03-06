import * as THREE from 'three';

/** Raw entry from data.json */
export interface DataEntry {
  name: string;
  url: string;
  priority: number;
  description?: string;
  type?: string;
  seed?: number;
}

/** Camera operating modes */
export enum CameraState {
  DESCENT = 'descent',
  FREE_CAM = 'free_cam',
  FIXED_CAM = 'fixed_cam',
}

/** A placed structure instance in the scene */
export interface StructureInstance {
  entry: DataEntry;
  group: THREE.Group;
  worldPosition: THREE.Vector3;
  boundingRadius: number;
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

/** Structure generator function signature */
export type StructureGenerator = (
  seed: number,
  priority: number,
  color: THREE.Color,
) => {
  group: THREE.Group;
  boundingRadius: number;
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
};
