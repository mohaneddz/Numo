import { describe, expect, it } from 'vitest';
import {
  CATALOG_LANGUAGE,
  getImmersionResourcesForLanguage,
  immersionCatalogLanguages,
  immersionResources,
  LOCAL_LANGUAGE_CODE,
} from './immersionCatalog';

describe('immersion catalog', () => {
  it('tags every bundled resource with a language', () => {
    for (const resource of immersionResources) {
      expect(resource.languageCode).toBeTruthy();
    }
    expect(immersionCatalogLanguages()).toContain(CATALOG_LANGUAGE);
  });

  it('serves the bundled catalog only to learners of that language', () => {
    // The page previously rendered the full list regardless of active language, so
    // a Japanese learner was shown Don Quijote and Spanish LibriVox links.
    expect(getImmersionResourcesForLanguage('es').length).toBeGreaterThan(0);
    expect(getImmersionResourcesForLanguage('ja')).toHaveLength(0);
    expect(getImmersionResourcesForLanguage('ru')).toHaveLength(0);
  });

  it('serves a Chinese catalog that covers every kind', () => {
    const chinese = getImmersionResourcesForLanguage('zh');
    expect(new Set(chinese.map((resource) => resource.kind))).toEqual(new Set(['video', 'reading', 'audio']));
    expect(chinese.every((resource) => resource.languageCode === 'zh')).toBe(true);
    expect(getImmersionResourcesForLanguage('zh-CN')).toHaveLength(chinese.length);
  });

  it('pins every Chinese reading to a Gutenberg ebook', () => {
    const readings = getImmersionResourcesForLanguage('zh').filter((resource) => resource.kind === 'reading');
    for (const reading of readings) {
      expect(reading.gutenbergId).toBeGreaterThan(0);
      expect(reading.searchTitle).toBeTruthy();
    }
  });

  it('keeps resource ids unique across languages', () => {
    // Ids key the progress, cover and YouTube caches, so a collision would show
    // one language's media on another language's card.
    const ids = immersionResources.map((resource) => resource.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores region subtags when matching', () => {
    expect(getImmersionResourcesForLanguage('es-MX').length).toBe(
      getImmersionResourcesForLanguage('es').length,
    );
  });

  it('does not carry fabricated progress on catalog entries', () => {
    for (const resource of immersionResources) {
      expect(resource).not.toHaveProperty('progress');
    }
  });

  it('reserves a sentinel for imported files whose language is unknown', () => {
    expect(LOCAL_LANGUAGE_CODE).not.toBe(CATALOG_LANGUAGE);
    // Imported books must remain visible under any active language.
    expect(immersionResources.every((resource) => resource.languageCode !== LOCAL_LANGUAGE_CODE)).toBe(true);
  });
});
