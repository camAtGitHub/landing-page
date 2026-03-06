import { StructureGenerator } from '../types';

const _registry = new Map<string, StructureGenerator>();

export const StructureRegistry = {
  register(typeName: string, generator: StructureGenerator): void {
    if (_registry.has(typeName)) {
      console.warn(`StructureRegistry: overwriting generator for type "${typeName}"`);
    }
    _registry.set(typeName, generator);
  },

  get(typeName: string): StructureGenerator | undefined {
    return _registry.get(typeName);
  },

  getTypes(): string[] {
    return Array.from(_registry.keys());
  },
};
