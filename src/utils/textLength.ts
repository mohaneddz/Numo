/**
 * Length of a piece of writing, counted the way each script is counted.
 *
 * Writing used to split on whitespace, so any Chinese or Japanese draft, which has
 * no spaces, was reported as "1 words". Han and kana characters now count one each
 * (the 字数 convention); any Latin or other spaced words mixed in count as words.
 */

const SPACELESS_CHARACTER = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

function spacelessCharacterCount(text: string): number {
  return text.match(SPACELESS_CHARACTER)?.length ?? 0;
}

export function countWritingUnits(text: string): number {
  const remainder = text.replace(SPACELESS_CHARACTER, ' ').trim();
  const words = remainder
    ? remainder.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
    : 0;
  return spacelessCharacterCount(text) + words;
}

/** "57 characters" for mostly-Chinese text, "12 words" otherwise, singular when it is one. */
export function formatWritingLength(text: string, count = countWritingUnits(text)): string {
  const characters = spacelessCharacterCount(text);
  const unit = characters > 0 && characters * 2 >= count ? 'character' : 'word';
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}
