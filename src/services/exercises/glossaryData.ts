export interface GlossaryEntry {
  token: string;
  languageCode: string;
  translation: string;
  romanization?: string;
  partOfSpeech?: string;
  example?: string;
}

export interface InteractiveSegmentToken {
  token: string;
  interactive: boolean;
  target: boolean;
}

const GLOSSARY_LANGUAGE_ALIASES: Record<string, string> = {
  german: 'de',
  deutsch: 'de',
  de: 'de',
  'de-de': 'de',
  chinese: 'zh',
  mandarin: 'zh',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  japanese: 'ja',
  ja: 'ja',
  'ja-jp': 'ja',
};

const STARTER_GLOSSARY: GlossaryEntry[] = [
  { token: 'Hallo', languageCode: 'de', translation: 'hello', romanization: 'HAH-loh', partOfSpeech: 'greeting', example: 'Hallo! Wie geht es dir?' },
  { token: 'Guten', languageCode: 'de', translation: 'good', romanization: 'GOO-ten', partOfSpeech: 'adjective' },
  { token: 'Tag', languageCode: 'de', translation: 'day', romanization: 'tahk', partOfSpeech: 'noun' },
  { token: 'Auf', languageCode: 'de', translation: 'on / at', romanization: 'owf', partOfSpeech: 'preposition' },
  { token: 'Wiedersehen', languageCode: 'de', translation: 'seeing again', romanization: 'VEE-der-zay-en', partOfSpeech: 'noun' },
  { token: 'Gute', languageCode: 'de', translation: 'good', romanization: 'GOO-teh', partOfSpeech: 'adjective' },
  { token: 'Nacht', languageCode: 'de', translation: 'night', romanization: 'nahkt', partOfSpeech: 'noun' },
  { token: 'ich', languageCode: 'de', translation: 'I', romanization: 'ikh', partOfSpeech: 'pronoun' },
  { token: 'bin', languageCode: 'de', translation: 'am', romanization: 'bin', partOfSpeech: 'verb' },
  { token: 'heiße', languageCode: 'de', translation: 'am called / my name is', romanization: 'HYE-suh', partOfSpeech: 'verb' },
  { token: 'Wie', languageCode: 'de', translation: 'how', romanization: 'vee', partOfSpeech: 'adverb' },
  { token: 'geht', languageCode: 'de', translation: 'goes', romanization: 'gayt', partOfSpeech: 'verb' },
  { token: 'dir', languageCode: 'de', translation: 'you (dative)', romanization: 'deer', partOfSpeech: 'pronoun' },
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
  map.set(entry.token.toLowerCase(), entry);
  byLanguage.set(code, map);
}

export function normalizeGlossaryLanguageCode(languageCode: string): string {
  const raw = (languageCode ?? '').trim().toLowerCase();
  if (!raw) return 'en';
  if (GLOSSARY_LANGUAGE_ALIASES[raw]) return GLOSSARY_LANGUAGE_ALIASES[raw];
  const base = raw.split('-')[0];
  return GLOSSARY_LANGUAGE_ALIASES[base] ?? base;
}

export function lookupStarterGlossary(languageCode: string, token: string): GlossaryEntry | null {
  const normalizedCode = normalizeGlossaryLanguageCode(languageCode);
  const map = byLanguage.get(normalizedCode);
  if (!map) return null;
  const direct = map.get(token);
  if (direct) return direct;
  const lower = map.get(token.toLowerCase());
  if (lower) return lower;
  const title = token.length > 0 ? `${token[0].toUpperCase()}${token.slice(1).toLowerCase()}` : token;
  return map.get(title) ?? null;
}

export function upsertStarterGlossary(entry: GlossaryEntry): void {
  const normalizedCode = normalizeGlossaryLanguageCode(entry.languageCode);
  const map = byLanguage.get(normalizedCode) ?? new Map<string, GlossaryEntry>();
  map.set(entry.token, entry);
  map.set(entry.token.toLowerCase(), entry);
  byLanguage.set(normalizedCode, map);
}

export function tokenizeInteractiveText(text: string, languageCode: string): string[] {
  const trimmed = text ?? '';
  if (!trimmed) return [];
  const normalizedCode = normalizeGlossaryLanguageCode(languageCode);

  if (normalizedCode === 'zh' || normalizedCode === 'ja') {
    const matches = trimmed.match(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[A-Za-z0-9']+|\s+|[^\s])/gu);
    return matches ?? [trimmed];
  }

  const matches = trimmed.match(/([A-Za-z0-9']+|\s+|[^\s])/g);
  return matches ?? [trimmed];
}

function isCandidateWord(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token);
}

export function tokenizeMarkedInteractiveText(text: string, languageCode: string): InteractiveSegmentToken[] {
  const raw = text ?? '';
  if (!raw) return [];

  const output: InteractiveSegmentToken[] = [];
  const marker = /\[\[([\s\S]*?)\]\]/g;
  let cursor = 0;
  let match = marker.exec(raw);

  while (match) {
    const before = raw.slice(cursor, match.index);
    if (before) {
      tokenizeInteractiveText(before, languageCode).forEach((token) => {
        output.push({ token, interactive: false, target: false });
      });
    }

    const inside = match[1] ?? '';
    tokenizeInteractiveText(inside, languageCode).forEach((token) => {
      output.push({ token, interactive: isCandidateWord(token), target: isCandidateWord(token) });
    });

    cursor = marker.lastIndex;
    match = marker.exec(raw);
  }

  const tail = raw.slice(cursor);
  if (tail) {
    tokenizeInteractiveText(tail, languageCode).forEach((token) => {
      output.push({ token, interactive: false, target: false });
    });
  }

  return output;
}
