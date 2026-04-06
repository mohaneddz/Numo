import { describe, expect, it } from 'vitest';
import { lookupStarterGlossary, tokenizeInteractiveText, upsertStarterGlossary } from './glossaryData';

describe('glossaryData', () => {
  it('tokenizes CJK text into script-aware chunks', () => {
    const tokens = tokenizeInteractiveText('\u4f60\u597d\uff0c\u6211\u662fAI', 'zh');
    expect(tokens.length).toBeGreaterThan(2);
    expect(tokens.join('')).toContain('\u4f60\u597d');
  });

  it('resolves starter entries for zh and ja', () => {
    expect(lookupStarterGlossary('zh', '\u4f60\u597d')?.translation).toBe('hello');
    expect(lookupStarterGlossary('ja', '\u306f')?.partOfSpeech).toBe('particle');
  });

  it('upserts starter entries in memory', () => {
    upsertStarterGlossary({
      token: 'custom-token',
      languageCode: 'zh',
      translation: 'custom',
      romanization: 'custom',
      partOfSpeech: 'noun',
    });

    expect(lookupStarterGlossary('zh', 'custom-token')?.translation).toBe('custom');
  });
});
