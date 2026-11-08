import { describe, expect, it } from 'vitest';
import { captionLanguagePreferences } from './youtubeTranscriptService';

describe('captionLanguagePreferences', () => {
  it('asks for the original Chinese track first, then simplified script', () => {
    expect(captionLanguagePreferences('zh')).toEqual(['zh-Hans-orig', 'zh-orig', 'zh-Hans', 'zh-CN', 'zh']);
    expect(captionLanguagePreferences('zh-TW')[0]).toBe('zh-Hans-orig');
  });

  it('keeps the original Spanish order', () => {
    expect(captionLanguagePreferences('es')).toEqual(['es-orig', 'es']);
    expect(captionLanguagePreferences('es-MX')).toEqual(['es-orig', 'es']);
  });
});
