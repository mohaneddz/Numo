/**
 * The catalog of languages Numo offers, and their onboarding starter copy.
 *
 * Pulled out of `LanguageContext.tsx` so it can be imported by code that has no
 * business depending on a React context module — notably CLI tooling under
 * `scripts/`, which needs the language name for a code (e.g. 'zh' -> 'Chinese')
 * without pulling React/JSX typing into a Node-side program.
 */

export interface LanguageCatalogEntry {
  code: string;
  name: string;
  flag: string;
  starterModule: string;
  starterLesson: string;
  starterDescription: string;
}

export const languageCatalog: LanguageCatalogEntry[] = [
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', starterModule: 'Chinese Core Path', starterLesson: 'Core tones and greetings', starterDescription: 'Start with practical Mandarin sounds and expressions.' },
  { code: 'de', name: 'German', flag: '🇩🇪', starterModule: 'German Core Path', starterLesson: 'Common phrases', starterDescription: 'Build practical everyday German.' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', starterModule: 'Spanish Core Path', starterLesson: 'Core phrases', starterDescription: 'Build practical daily Spanish.' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', starterModule: 'Italian Core Path', starterLesson: 'Greetings and essentials', starterDescription: 'Build useful Italian for everyday situations.' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', starterModule: 'Russian Core Path', starterLesson: 'Sounds and essential phrases', starterDescription: 'Start Russian with practical speech and Cyrillic recognition.' },
  { code: 'fr', name: 'French', flag: '🇫🇷', starterModule: 'French Core Path', starterLesson: 'Greetings and introductions', starterDescription: 'Learn how to greet people and introduce yourself.' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', starterModule: 'Japanese Core Path', starterLesson: 'Sounds and writing basics', starterDescription: 'Build practical Japanese alongside gradual script recognition.' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', starterModule: 'Korean Core Path', starterLesson: 'Hangul and greetings', starterDescription: 'Start with useful Korean and gradual Hangul recognition.' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', starterModule: 'Portuguese Core Path', starterLesson: 'Core phrases', starterDescription: 'Build practical Portuguese for everyday communication.' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', starterModule: 'Arabic Core Path', starterLesson: 'Sounds and essential phrases', starterDescription: 'Start with practical Modern Standard Arabic and gradual script recognition.' },
];

export const languageCatalogMap = new Map(languageCatalog.map((entry) => [entry.code, entry]));

export function languageNameForCode(code: string): string {
  return languageCatalogMap.get(code)?.name ?? code.toUpperCase();
}
