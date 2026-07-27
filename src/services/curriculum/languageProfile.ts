/**
 * Per-language facts the curriculum needs: which script the language is written in,
 * whether it separates words with spaces, and whether learners need romanization.
 *
 * The immediate motivation is validation. Generated exercise content was never
 * checked against the language being studied, which is how a fixed list of English
 * tasks ("I ___ coffee every morning" → drink) ended up appended to every session
 * for every language. A script check catches that class of failure outright.
 */

export type ScriptId =
  | 'latin'
  | 'cyrillic'
  | 'greek'
  | 'arabic'
  | 'hebrew'
  | 'devanagari'
  | 'bengali'
  | 'tamil'
  | 'thai'
  | 'lao'
  | 'khmer'
  | 'hangul'
  | 'kana'
  | 'han'
  | 'ethiopic'
  | 'georgian'
  | 'armenian';

/** Unicode ranges used to decide whether text is written in a given script. */
const SCRIPT_PATTERNS: Record<ScriptId, RegExp> = {
  latin: /[A-Za-zÀ-ɏ]/,
  cyrillic: /[Ѐ-ӿ]/,
  greek: /[Ͱ-Ͽ]/,
  arabic: /[؀-ۿݐ-ݿ]/,
  hebrew: /[֐-׿]/,
  devanagari: /[ऀ-ॿ]/,
  bengali: /[ঀ-৿]/,
  tamil: /[஀-௿]/,
  thai: /[฀-๿]/,
  lao: /[຀-໿]/,
  khmer: /[ក-៿]/,
  hangul: /[가-힯ᄀ-ᇿ㄰-㆏]/,
  kana: /[぀-ゟ゠-ヿ]/,
  han: /[一-鿿㐀-䶿]/,
  ethiopic: /[ሀ-፿]/,
  georgian: /[Ⴀ-ჿ]/,
  armenian: /[԰-֏]/,
};

export interface LanguageProfile {
  code: string;
  /** Scripts a valid answer may be written in. Any one of them satisfies validation. */
  scripts: ScriptId[];
  /** True when the language does not put spaces between words. */
  spaceless: boolean;
  /** True when learners typically need a romanized reading alongside the script. */
  needsRomanization: boolean;
  /** Human-readable name of the romanization system, when there is one. */
  romanizationName?: string;
}

const PROFILES: Record<string, LanguageProfile> = {
  zh: { code: 'zh', scripts: ['han'], spaceless: true, needsRomanization: true, romanizationName: 'Pinyin' },
  ja: { code: 'ja', scripts: ['kana', 'han'], spaceless: true, needsRomanization: true, romanizationName: 'Romaji' },
  ko: { code: 'ko', scripts: ['hangul', 'han'], spaceless: false, needsRomanization: true, romanizationName: 'Revised Romanization' },
  ru: { code: 'ru', scripts: ['cyrillic'], spaceless: false, needsRomanization: true, romanizationName: 'Transliteration' },
  uk: { code: 'uk', scripts: ['cyrillic'], spaceless: false, needsRomanization: true },
  bg: { code: 'bg', scripts: ['cyrillic'], spaceless: false, needsRomanization: true },
  sr: { code: 'sr', scripts: ['cyrillic', 'latin'], spaceless: false, needsRomanization: false },
  el: { code: 'el', scripts: ['greek'], spaceless: false, needsRomanization: true },
  ar: { code: 'ar', scripts: ['arabic'], spaceless: false, needsRomanization: true, romanizationName: 'Transliteration' },
  fa: { code: 'fa', scripts: ['arabic'], spaceless: false, needsRomanization: true },
  ur: { code: 'ur', scripts: ['arabic'], spaceless: false, needsRomanization: true },
  he: { code: 'he', scripts: ['hebrew'], spaceless: false, needsRomanization: true },
  hi: { code: 'hi', scripts: ['devanagari'], spaceless: false, needsRomanization: true, romanizationName: 'IAST' },
  mr: { code: 'mr', scripts: ['devanagari'], spaceless: false, needsRomanization: true },
  ne: { code: 'ne', scripts: ['devanagari'], spaceless: false, needsRomanization: true },
  bn: { code: 'bn', scripts: ['bengali'], spaceless: false, needsRomanization: true },
  ta: { code: 'ta', scripts: ['tamil'], spaceless: false, needsRomanization: true },
  th: { code: 'th', scripts: ['thai'], spaceless: true, needsRomanization: true },
  lo: { code: 'lo', scripts: ['lao'], spaceless: true, needsRomanization: true },
  km: { code: 'km', scripts: ['khmer'], spaceless: true, needsRomanization: true },
  am: { code: 'am', scripts: ['ethiopic'], spaceless: false, needsRomanization: true },
  ka: { code: 'ka', scripts: ['georgian'], spaceless: false, needsRomanization: true },
  hy: { code: 'hy', scripts: ['armenian'], spaceless: false, needsRomanization: true },
};

const DEFAULT_PROFILE: Omit<LanguageProfile, 'code'> = {
  scripts: ['latin'],
  spaceless: false,
  needsRomanization: false,
};

export function getLanguageProfile(languageCode: string): LanguageProfile {
  const normalized = languageCode.split('-')[0].toLowerCase();
  return PROFILES[normalized] ?? { code: normalized, ...DEFAULT_PROFILE };
}

/** True when the text contains at least one character of the given script. */
export function containsScript(text: string, script: ScriptId): boolean {
  return SCRIPT_PATTERNS[script].test(text);
}

/**
 * True when the text is plausibly written in the target language's script.
 *
 * Text with no letters at all (a number, a price) passes, because those are valid
 * answers in any language. This is a script check, not a language check: it cannot
 * tell Spanish from Portuguese, but it reliably catches Latin text presented as a
 * Japanese answer.
 */
export function matchesLanguageScript(text: string, languageCode: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const profile = getLanguageProfile(languageCode);
  if (profile.scripts.some((script) => containsScript(trimmed, script))) return true;

  // Digits, punctuation and symbols only: acceptable in any language.
  return !/\p{L}/u.test(trimmed);
}

/**
 * Detects text that is in the wrong script for the target language — specifically
 * Latin text where a non-Latin script was expected.
 */
export function isWrongScript(text: string, languageCode: string): boolean {
  const profile = getLanguageProfile(languageCode);
  if (profile.scripts.includes('latin')) return false;
  if (!/\p{L}/u.test(text)) return false;
  return !matchesLanguageScript(text, languageCode);
}

const SCRIPT_LABELS: Record<ScriptId, string> = {
  latin: 'the Latin alphabet',
  cyrillic: 'the Cyrillic alphabet',
  greek: 'the Greek alphabet',
  arabic: 'the Arabic script',
  hebrew: 'the Hebrew script',
  devanagari: 'Devanagari script',
  bengali: 'Bengali script',
  tamil: 'Tamil script',
  thai: 'Thai script',
  lao: 'Lao script',
  khmer: 'Khmer script',
  hangul: 'Hangul',
  kana: 'kana',
  han: 'Chinese characters (Hanzi/Kanji)',
  ethiopic: 'Ethiopic script',
  georgian: 'the Georgian script',
  armenian: 'the Armenian script',
};

/**
 * Human-readable name of a language's script(s), for prompting a model — e.g.
 * "kana and Chinese characters (Hanzi/Kanji)" for Japanese. Generation content
 * repeatedly came back with expectedAnswer written as a romanization (Pinyin,
 * Romaji) rather than the actual script, even when the prompt separately asked
 * for a "romanization" field — naming the script explicitly, rather than only
 * naming the language, is what a model reliably tells apart from "the romanized
 * form of it".
 */
export function scriptLabel(languageCode: string): string {
  const scripts = getLanguageProfile(languageCode).scripts;
  return scripts.map((script) => SCRIPT_LABELS[script]).join(' and ');
}
