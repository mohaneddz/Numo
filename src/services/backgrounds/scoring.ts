import type { BackgroundImageCandidate, BackgroundImageRequest, ScoredBackgroundCandidate } from './types';

function luminanceFromHex(hex: string): number {
  const value = hex.replace('#', '').trim();
  const normalized = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return 0.5;
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

export function scoreBackgroundCandidate(
  candidate: BackgroundImageCandidate,
  request: BackgroundImageRequest,
  tierLevel: number,
  query: string,
): ScoredBackgroundCandidate {
  let score = 0;
  const reasons: string[] = [];

  const width = candidate.width || 0;
  const height = candidate.height || 0;
  const ratio = height > 0 ? width / height : 0;

  if (width >= 1400 && height >= 780) {
    score += 24;
    reasons.push('high-resolution');
  } else if (width >= 1200 && height >= 675) {
    score += 16;
    reasons.push('good-resolution');
  } else if (width >= 960 && height >= 540) {
    score += 8;
    reasons.push('usable-resolution');
  } else {
    score -= 20;
    reasons.push('low-resolution');
  }

  if (ratio >= 1.45 && ratio <= 2.15) {
    score += 18;
    reasons.push('card-friendly-aspect');
  } else if (ratio >= 1.25 && ratio <= 2.4) {
    score += 8;
  } else {
    score -= 14;
    reasons.push('poor-aspect-for-card');
  }

  const searchable = [candidate.title, candidate.description, candidate.tags.join(' ')].join(' ').toLowerCase();
  const badTokens = ['portrait', 'selfie', 'smile', 'isolated', 'white background', 'watermark', 'mockup', 'business woman', 'business man'];
  const badCount = badTokens.filter((token) => searchable.includes(token)).length;
  if (badCount > 0) {
    score -= badCount * 8;
    reasons.push('stock-or-portrait-vibe');
  }

  const color = candidate.colorHex;
  if (color) {
    const luma = luminanceFromHex(color);
    if (luma >= 0.24 && luma <= 0.68) {
      score += 8;
      reasons.push('balanced-luminance');
    } else if (luma > 0.78 || luma < 0.15) {
      score -= 6;
    }
  }

  const relevanceTokens = new Set([
    ...tokenize(query),
    ...tokenize(request.languageName || ''),
    ...tokenize(request.country || ''),
    ...tokenize(request.city || ''),
    ...tokenize(request.lessonTitle || ''),
    ...tokenize(request.title || ''),
    ...tokenize((request.topicTags ?? []).join(' ')),
  ]);

  let matches = 0;
  for (const token of relevanceTokens) {
    if (searchable.includes(token)) matches += 1;
  }
  score += Math.min(22, matches * 2.5);

  if (request.itemType === 'review' || request.itemType === 'study') {
    const busyTokens = ['crowd', 'festival', 'busy', 'market', 'traffic'];
    if (busyTokens.some((token) => searchable.includes(token))) {
      score -= 4;
      reasons.push('too-busy-for-review-card');
    }
  }

  if (request.itemType === 'immersion' && searchable.includes('cinematic')) {
    score += 4;
  }

  if (candidate.provider === 'unsplash') {
    score += 2;
  }

  score += Math.max(0, 8 - (tierLevel - 1) * 2);

  return {
    candidate,
    score,
    reasons,
    tierLevel,
    query,
  };
}
