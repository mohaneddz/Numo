import { describe, expect, it } from 'vitest';
import {
  lookupStarterGlossary,
  normalizeGlossaryLanguageCode,
  tokenizeInteractiveText,
  tokenizeMarkedInteractiveText,
  upsertStarterGlossary,
} from './glossaryData';

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

  it('normalizes language aliases and locale codes for glossary lookup', () => {
    expect(normalizeGlossaryLanguageCode('German')).toBe('de');
    expect(normalizeGlossaryLanguageCode('de-DE')).toBe('de');
    expect(lookupStarterGlossary('German', 'Hallo')?.translation).toBe('hello');
    expect(lookupStarterGlossary('de-DE', 'Guten')?.translation).toBe('good');
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

  it('tokenizes marked target segments and keeps plain text non-interactive', () => {
    const tokens = tokenizeMarkedInteractiveText("How do we say [[Guten Tag]] in German?", 'de');
    const targetTokens = tokens.filter((token) => token.interactive).map((token) => token.token);
    expect(targetTokens).toContain('Guten');
    expect(targetTokens).toContain('Tag');
    expect(tokens.some((token) => token.token === 'How' && token.interactive)).toBe(false);
  });
});
