import { DataEntry } from '../types';

const AVAILABLE_TYPES = ['crystal', 'flora', 'mushroom', 'vortex', 'geometric', 'entity', 'architecture'] as const;

/**
 * Deterministic djb2 hash of a string to a positive integer.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Fetches data.json, validates entries, applies defaults.
 * Returns array sorted by priority descending.
 */
export async function loadSiteData(): Promise<DataEntry[]> {
  let raw: unknown;
  try {
    const response = await fetch('./data.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch data.json: HTTP ${response.status}`);
    }
    raw = await response.json();
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to parse data.json');
  }

  if (!Array.isArray(raw)) {
    throw new Error('data.json must be an array');
  }

  const validated: DataEntry[] = [];
  let typeIndex = 0;

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      console.warn('Skipping invalid entry:', item);
      continue;
    }
    const entry = item as Record<string, unknown>;

    if (typeof entry.name !== 'string' || !entry.name) {
      console.warn('Skipping entry missing required field "name":', entry);
      continue;
    }
    if (typeof entry.url !== 'string' || !entry.url) {
      console.warn('Skipping entry missing required field "url":', entry);
      continue;
    }
    if (typeof entry.priority !== 'number') {
      console.warn('Skipping entry missing required field "priority":', entry);
      continue;
    }

    const priority = Math.max(0, Math.min(10, entry.priority));
    const seed = typeof entry.seed === 'number' ? entry.seed : hashString(entry.name as string);
    const type = typeof entry.type === 'string' && entry.type
      ? entry.type
      : AVAILABLE_TYPES[typeIndex % AVAILABLE_TYPES.length];
    
    typeIndex++;

    const dataEntry: DataEntry = {
      name: entry.name as string,
      url: entry.url as string,
      priority,
      seed,
      type,
    };

    if (typeof entry.description === 'string') {
      dataEntry.description = entry.description;
    }

    validated.push(dataEntry);
  }

  return validated.sort((a, b) => b.priority - a.priority);
}
