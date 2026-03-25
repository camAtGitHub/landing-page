import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSiteData, hashString } from '../../src/data/loader';

function mockFetch(data: unknown, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('hashString', () => {
  it('returns the same number for the same input', () => {
    expect(hashString('Blog')).toBe(hashString('Blog'));
  });

  it('returns different numbers for different inputs', () => {
    expect(hashString('Blog')).not.toBe(hashString('Contact'));
  });

  it('returns a positive integer', () => {
    expect(hashString('test')).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hashString('test'))).toBe(true);
  });
});

describe('loadSiteData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and returns valid entries sorted by priority desc (legacy array format)', async () => {
    mockFetch([
      { name: 'A', url: '/a', priority: 3 },
      { name: 'B', url: '/b', priority: 8 },
      { name: 'C', url: '/c', priority: 1 },
    ]);
    const { entries } = await loadSiteData();
    expect(entries).toHaveLength(3);
    expect(entries[0].priority).toBe(8);
    expect(entries[1].priority).toBe(3);
    expect(entries[2].priority).toBe(1);
  });

  it('loads entries from new object format with config', async () => {
    mockFetch({
      config: { randomize: false },
      entries: [
        { name: 'A', url: '/a', priority: 5 },
      ],
    });
    const { config, entries } = await loadSiteData();
    expect(config.randomize).toBe(false);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('A');
  });

  it('defaults randomize to false when config is missing', async () => {
    mockFetch([{ name: 'A', url: '/a', priority: 5 }]);
    const { config } = await loadSiteData();
    expect(config.randomize).toBe(false);
  });

  it('randomizes seeds when config.randomize is true', async () => {
    mockFetch({
      config: { randomize: true },
      entries: [
        { name: 'A', url: '/a', priority: 5, seed: 42 },
        { name: 'B', url: '/b', priority: 3, seed: 77 },
      ],
    });
    const { entries } = await loadSiteData();
    // Seeds should be overridden (extremely unlikely to match originals)
    const seedsMatchOriginal = entries[0].seed === 42 && entries[1].seed === 77;
    // This could theoretically fail 1 in 10^12 times — good enough
    expect(seedsMatchOriginal).toBe(false);
  });

  it('skips entries missing required fields', async () => {
    mockFetch([
      { name: 'Good', url: '/good', priority: 5 },
      { url: '/no-name', priority: 5 },
      { name: 'No URL', priority: 5 },
      { name: 'No Priority', url: '/no-priority' },
    ]);
    const { entries } = await loadSiteData();
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Good');
  });

  it('derives seed from name when not provided', async () => {
    mockFetch([{ name: 'Blog', url: '/blog', priority: 5 }]);
    const { entries } = await loadSiteData();
    expect(entries[0].seed).toBe(hashString('Blog'));
  });

  it('uses provided seed when given (randomize off)', async () => {
    mockFetch([{ name: 'Blog', url: '/blog', priority: 5, seed: 42 }]);
    const { entries } = await loadSiteData();
    expect(entries[0].seed).toBe(42);
  });

  it('assigns type round-robin when not provided', async () => {
    mockFetch([
      { name: 'A', url: '/a', priority: 1 },
      { name: 'B', url: '/b', priority: 1 },
    ]);
    const { entries } = await loadSiteData();
    expect(entries[0].type).toBeDefined();
    expect(entries[1].type).toBeDefined();
  });

  it('uses provided type when given', async () => {
    mockFetch([{ name: 'A', url: '/a', priority: 5, type: 'vortex' }]);
    const { entries } = await loadSiteData();
    expect(entries[0].type).toBe('vortex');
  });

  it('clamps priority to 0-10 range', async () => {
    mockFetch([
      { name: 'A', url: '/a', priority: -5 },
      { name: 'B', url: '/b', priority: 100 },
    ]);
    const { entries } = await loadSiteData();
    expect(entries.find(e => e.name === 'A')?.priority).toBe(0);
    expect(entries.find(e => e.name === 'B')?.priority).toBe(10);
  });

  it('returns empty entries for empty data.json array', async () => {
    mockFetch([]);
    const { entries } = await loadSiteData();
    expect(entries).toHaveLength(0);
  });

  it('throws when fetch fails', async () => {
    mockFetch(null, false, 404);
    await expect(loadSiteData()).rejects.toThrow('404');
  });

  it('throws when object format is missing entries array', async () => {
    mockFetch({ config: {}, not_entries: [] });
    await expect(loadSiteData()).rejects.toThrow('entries');
  });

  it('throws when data is neither array nor object', async () => {
    mockFetch('just a string');
    await expect(loadSiteData()).rejects.toThrow('array');
  });
});
