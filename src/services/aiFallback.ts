import type { WritingCorrection } from '../data/types';

export function fallbackSpeakingFeedback(expected: string, transcript: string): {
  accuracy: number;
  fluency: number;
  tip: string;
} {
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z\sáéíóúñü¿?¡!]/gi, '').trim();
  const expectedTokens = normalize(expected).split(/\s+/).filter(Boolean);
  const actualTokens = normalize(transcript).split(/\s+/).filter(Boolean);

  const overlap = actualTokens.filter((token) => expectedTokens.includes(token)).length;
  const coverage = expectedTokens.length > 0 ? overlap / expectedTokens.length : 0;
  const lengthRatio = expectedTokens.length > 0 ? Math.min(1, actualTokens.length / expectedTokens.length) : 0;

  const accuracy = Math.round(Math.max(40, Math.min(98, coverage * 100)));
  const fluency = Math.round(Math.max(35, Math.min(96, (coverage * 0.7 + lengthRatio * 0.3) * 100)));

  const tip = coverage < 0.5
    ? 'Repeat slowly and focus on the key words first, then increase speed.'
    : 'Great pace. Focus on clearer vowel sounds to improve pronunciation.';

  return { accuracy, fluency, tip };
}

export function fallbackWritingAnalysis(text: string): WritingCorrection[] {
  const corrections: WritingCorrection[] = [];
  const patterns: Array<{ regex: RegExp; corrected: string; type: WritingCorrection['type']; explanation: string }> = [
    {
      regex: /\bsoy cansado\b/gi,
      corrected: 'estoy cansado',
      type: 'grammar',
      explanation: 'Use estar for temporary states like feeling tired.',
    },
    {
      regex: /\bme gusto\b/gi,
      corrected: 'me gustó',
      type: 'spelling',
      explanation: 'Past tense of gustar takes an accent: gustó.',
    },
    {
      regex: /\bproblema muy grande\b/gi,
      corrected: 'gran problema',
      type: 'style',
      explanation: 'Use gran before singular nouns for more natural style.',
    },
  ];

  patterns.forEach((pattern) => {
    const match = text.match(pattern.regex);
    if (match) {
      match.forEach((original) => {
        corrections.push({
          original,
          corrected: pattern.corrected,
          type: pattern.type,
          explanation: pattern.explanation,
        });
      });
    }
  });

  if (corrections.length === 0) {
    corrections.push({
      original: 'Text looks good',
      corrected: 'Text looks good',
      type: 'correct',
      explanation: 'No major grammar patterns were detected in fallback mode.',
    });
  }

  return corrections;
}
