import { describe, expect, it } from 'vitest';
import { hasSeedPack, loadSeedPack, seededLanguages, seedVariantsFor } from './seedPack';

describe('seedPack', () => {
  it('reports whether a language has bundled content without loading it', () => {
    // Whatever is actually bundled is authoritative; this just checks the two
    // query paths (hasSeedPack vs seededLanguages) agree with each other.
    const languages = seededLanguages();
    for (const code of languages) {
      expect(hasSeedPack(code)).toBe(true);
    }
    expect(hasSeedPack('__no_such_language__')).toBe(false);
  });

  it('returns null for a language with no bundled pack', async () => {
    expect(await loadSeedPack('__no_such_language__')).toBeNull();
    expect(await seedVariantsFor('__no_such_language__', 'any-key')).toBeNull();
  });

  it('returns null for a key not present in an otherwise-bundled language', async () => {
    const languages = seededLanguages();
    if (languages.length === 0) return; // Nothing bundled yet in this checkout.
    expect(await seedVariantsFor(languages[0], '__key_that_does_not_exist__')).toBeNull();
  });

  it('loads real entries for a bundled language, keyed the way taskContentService expects', async () => {
    const languages = seededLanguages();
    if (languages.length === 0) return;

    const pack = await loadSeedPack(languages[0]);
    expect(pack).not.toBeNull();
    if (!pack) return;

    expect(pack.languageCode).toBe(languages[0]);
    const keys = Object.keys(pack.entries);
    expect(keys.length).toBeGreaterThan(0);

    const [firstKey] = keys;
    expect(firstKey.startsWith('task_content_v')).toBe(true);
    const variants = await seedVariantsFor(languages[0], firstKey);
    expect(variants).not.toBeNull();
    expect(variants?.length).toBeGreaterThan(0);
    for (const variant of variants ?? []) {
      expect(variant.instruction).toBeTruthy();
      expect(variant.prompt).toBeTruthy();
      expect(variant.expectedAnswer).toBeTruthy();
    }
  });
});
