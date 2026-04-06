export interface GlossaryEntry {
  token: string;
  languageCode: string;
  translation: string;
  romanization?: string;
  partOfSpeech?: string;
  example?: string;
}

const STARTER_GLOSSARY: GlossaryEntry[] = [
  { token: '\u4f60\u597d', languageCode: 'zh', translation: 'hello', romanization: 'ni hao', partOfSpeech: 'phrase', example: '\u4f60\u597d\uff01\u5f88\u9ad8\u5174\u89c1\u5230\u4f60\u3002' },
  { token: '\u8c22\u8c22', languageCode: 'zh', translation: 'thank you', romanization: 'xie xie', partOfSpeech: 'phrase', example: '\u8c22\u8c22\u4f60\u7684\u5e2e\u52a9\u3002' },
  { token: '\u6211', languageCode: 'zh', translation: 'I / me', romanization: 'wo', partOfSpeech: 'pronoun' },
  { token: '\u4f60', languageCode: 'zh', translation: 'you', romanization: 'ni', partOfSpeech: 'pronoun' },
  { token: '\u5403', languageCode: 'zh', translation: 'eat', romanization: 'chi', partOfSpeech: 'verb' },
  { token: '\u732b', languageCode: 'zh', translation: 'cat', romanization: 'mao', partOfSpeech: 'noun' },
  { token: '\u4eca\u65e5\u306f', languageCode: 'ja', translation: 'hello', romanization: 'konnichiwa', partOfSpeech: 'phrase' },
  { token: '\u3042\u308a\u304c\u3068\u3046', languageCode: 'ja', translation: 'thank you', romanization: 'arigatou', partOfSpeech: 'phrase' },
  { token: '\u79c1', languageCode: 'ja', translation: 'I / me', romanization: 'watashi', partOfSpeech: 'pronoun' },
  { token: '\u98df\u3079\u308b', languageCode: 'ja', translation: 'to eat', romanization: 'taberu', partOfSpeech: 'verb' },
  { token: '\u732b', languageCode: 'ja', translation: 'cat', romanization: 'neko', partOfSpeech: 'noun' },
  { token: '\u306f', languageCode: 'ja', translation: 'topic marker', romanization: 'wa', partOfSpeech: 'particle' },
  { token: '\u3092', languageCode: 'ja', translation: 'object marker', romanization: 'o', partOfSpeech: 'particle' },
  { token: '\u306e', languageCode: 'ja', translation: 'possessive marker', romanization: 'no', partOfSpeech: 'particle' },
  { token: '\u7684', languageCode: 'zh', translation: 'possessive marker', romanization: 'de', partOfSpeech: 'particle' },
  { token: '\u4e86', languageCode: 'zh', translation: 'completed action marker', romanization: 'le', partOfSpeech: 'particle' },
  { token: '\u3067\u3059', languageCode: 'ja', translation: 'copula (polite)', romanization: 'desu', partOfSpeech: 'copula' },
  { token: '\u307e\u3059', languageCode: 'ja', translation: 'polite verb ending', romanization: 'masu', partOfSpeech: 'suffix' },
  { token: '\u4f60\u4eec', languageCode: 'zh', translation: 'you (plural)', romanization: 'ni men', partOfSpeech: 'pronoun' },
  { token: '\u6211\u5011', languageCode: 'zh', translation: 'we (traditional)', romanization: 'wo men', partOfSpeech: 'pronoun' },
  { token: '\u6211\u4eec', languageCode: 'zh', translation: 'we (simplified)', romanization: 'wo men', partOfSpeech: 'pronoun' },
];

const byLanguage = new Map<string, Map<string, GlossaryEntry>>();

for (const entry of STARTER_GLOSSARY) {
  const code = entry.languageCode;
  const map = byLanguage.get(code) ?? new Map<string, GlossaryEntry>();
  map.set(entry.token, entry);
  byLanguage.set(code, map);
}

export function lookupStarterGlossary(languageCode: string, token: string): GlossaryEntry | null {
  const map = byLanguage.get(languageCode);
  if (!map) return null;
  return map.get(token) ?? null;
}

export function upsertStarterGlossary(entry: GlossaryEntry): void {
  const map = byLanguage.get(entry.languageCode) ?? new Map<string, GlossaryEntry>();
  map.set(entry.token, entry);
  byLanguage.set(entry.languageCode, map);
}

export function tokenizeInteractiveText(text: string, languageCode: string): string[] {
  const trimmed = text ?? '';
  if (!trimmed) return [];

  if (languageCode === 'zh' || languageCode === 'ja') {
    const matches = trimmed.match(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[A-Za-z0-9']+|\s+|[^\s])/gu);
    return matches ?? [trimmed];
  }

  const matches = trimmed.match(/([A-Za-z0-9']+|\s+|[^\s])/g);
  return matches ?? [trimmed];
}
