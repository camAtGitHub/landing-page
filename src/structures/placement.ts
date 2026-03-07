import * as THREE from 'three';
import { DataEntry, StructureInstance } from '../types';
import { TerrainContext } from '../scene/terrain';
import { StructureRegistry } from './registry';
import { CONFIG } from '../config';

const TYPE_ALIASES: Record<string, string> = {
  jellyfish: 'entity',
  entities: 'entity',
  creature: 'entity',
};

function resolveType(typeName: string | undefined): string {
  if (!typeName) return 'crystal';
  const normalized = typeName.trim().toLowerCase();
  return TYPE_ALIASES[normalized] ?? normalized;
}

export function placeStructures(
  entries: DataEntry[],
  terrain: TerrainContext,
  scene: THREE.Scene,
): StructureInstance[] {
  if (entries.length === 0) return [];

  const instances: StructureInstance[] = [];
  const neonColors = CONFIG.NEON_COLORS;

  entries.forEach((entry, index) => {
    // Resolve generator
    const resolvedType = resolveType(entry.type);
    let generator = StructureRegistry.get(resolvedType);
    if (!generator) {
      console.warn(`Unknown structure type "${entry.type}", falling back to crystal`);
      generator = StructureRegistry.get('crystal');
    }
    if (!generator) {
      console.error(`Crystal generator not registered, skipping entry: ${entry.name}`);
      return;
    }

    // Color from neon palette
    const colorHex = neonColors[index % neonColors.length];
    const color = new THREE.Color(colorHex);

    // Seed is guaranteed by the data loader
    const seed = entry.seed ?? 0;

    // Generate structure
    const generated = generator(seed, entry.priority, color);

    // Compute placement radius (higher priority = closer to center)
    const maxPriority = Math.max(...entries.map(e => e.priority));
    const normalizedPriority = maxPriority > 0 ? entry.priority / maxPriority : 0;
    const radius =
      CONFIG.STRUCTURE_MIN_RADIUS +
      (1 - normalizedPriority) * (CONFIG.STRUCTURE_MAX_RADIUS - CONFIG.STRUCTURE_MIN_RADIUS);

    // Angular distribution with slight offset so first entry doesn't face camera directly
    const angleOffset = Math.PI / 6;
    const angle = angleOffset + (index / entries.length) * Math.PI * 2;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = terrain.getHeightAt(x, z);

    generated.group.position.set(x, y, z);

    scene.add(generated.group);

    const worldPosition = new THREE.Vector3(x, y, z);

    const instance: StructureInstance = {
      entry,
      group: generated.group,
      worldPosition,
      boundingRadius: generated.boundingRadius,
      update: (elapsed, delta) => generated.update(elapsed, delta),
      dispose: () => {
        generated.dispose();
        scene.remove(generated.group);
      },
    };

    instances.push(instance);
  });

  return instances;
}
