import { describe, expect, it } from 'vitest';
import { languageCatalog } from './LanguageContext';

describe('learning language catalog', () => {
  it('contains exactly the ten supported learning languages', () => {
    expect(languageCatalog.map((language) => language.code)).toEqual([
      'zh',
      'de',
      'es',
      'it',
      'ru',
      'fr',
      'ja',
      'ko',
      'pt',
      'ar',
    ]);
  });

  it('does not list English as a learning language', () => {
    expect(languageCatalog.some((language) => language.code === 'en')).toBe(false);
  });
});
