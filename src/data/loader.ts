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

/** Runtime config parsed from data.json */
export interface SiteConfig {
  randomize: boolean;
}

/** Full result from loading data.json */
export interface SiteData {
  config: SiteConfig;
  entries: DataEntry[];
}

const DEFAULT_CONFIG: SiteConfig = {
  randomize: false,
};

/**
 * Fetches data.json, validates entries, applies defaults.
 *
 * Supports two formats:
 *   - Legacy: bare array of entries   → [ { name, url, ... }, ... ]
 *   - New:    object with config      → { config: { randomize: true }, entries: [...] }
 *
 * Returns SiteData with config and entries sorted by priority descending.
 */
export async function loadSiteData(): Promise<SiteData> {
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

  // Determine format: bare array (legacy) or object with config + entries
  let rawEntries: unknown[];
  let config: SiteConfig = { ...DEFAULT_CONFIG };

  if (Array.isArray(raw)) {
    // Legacy format — plain array of entries
    rawEntries = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;

    // Parse config section
    if (typeof obj.config === 'object' && obj.config !== null) {
      const rawConfig = obj.config as Record<string, unknown>;
      if (typeof rawConfig.randomize === 'boolean') {
        config.randomize = rawConfig.randomize;
      }
    }

    // Parse entries
    if (Array.isArray(obj.entries)) {
      rawEntries = obj.entries;
    } else {
      throw new Error('data.json object must contain an "entries" array');
    }
  } else {
    throw new Error('data.json must be an array or an object with "entries"');
  }

  const validated: DataEntry[] = [];
  let typeIndex = 0;

  for (const item of rawEntries) {
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

  const entries = validated.sort((a, b) => b.priority - a.priority);

  // Apply randomization if enabled
  if (config.randomize) {
    entries.forEach(e => {
      e.seed = Math.floor(Math.random() * 1000000);
    });
  }

  return { config, entries };
}
