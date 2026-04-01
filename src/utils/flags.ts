const LANGUAGE_FLAG_MAP: Record<string, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ar: '🇲🇦',
  it: '🇮🇹',
  pt: '🇵🇹',
  ru: '🇷🇺',
  tr: '🇹🇷',
  ko: '🇰🇷',
};

function toRegionalIndicator(countryCode: string): string {
  const upper = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  const first = 0x1f1e6 + (upper.charCodeAt(0) - 65);
  const second = 0x1f1e6 + (upper.charCodeAt(1) - 65);
  return String.fromCodePoint(first, second);
}

function isFlagEmoji(value: string): boolean {
  return /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(value);
}

export function resolveLanguageFlag(code: string, rawFlag?: string | null): string {
  const normalizedCode = code.trim().toLowerCase();
  const cleaned = (rawFlag ?? '').trim();

  if (cleaned && isFlagEmoji(cleaned)) {
    return cleaned;
  }

  if (LANGUAGE_FLAG_MAP[normalizedCode]) {
    return LANGUAGE_FLAG_MAP[normalizedCode];
  }

  if (/^[a-z]{2}$/i.test(normalizedCode)) {
    const regional = toRegionalIndicator(normalizedCode);
    if (regional) return regional;
  }

  if (/^[A-Z]{2}$/.test(cleaned)) {
    const regional = toRegionalIndicator(cleaned);
    if (regional) return regional;
  }

  return '🌐';
}
