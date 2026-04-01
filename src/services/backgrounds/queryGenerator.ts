import type { BackgroundImageRequest, BackgroundQueryTier } from './types';

const LANGUAGE_CONTEXT: Record<string, { country: string; city: string; culture: string }> = {
  en: { country: 'United Kingdom', city: 'London', culture: 'english literature culture' },
  es: { country: 'Spain', city: 'Madrid', culture: 'hispanic culture architecture' },
  fr: { country: 'France', city: 'Paris', culture: 'french culture cafe books' },
  de: { country: 'Germany', city: 'Berlin', culture: 'german culture architecture' },
  ja: { country: 'Japan', city: 'Kyoto', culture: 'japanese culture temple urban' },
  zh: { country: 'China', city: 'Shanghai', culture: 'chinese culture calligraphy architecture' },
  ar: { country: 'Morocco', city: 'Marrakech', culture: 'arabic culture calligraphy architecture' },
};

function uniq(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function compact(...parts: Array<string | undefined | null>): string {
  return parts
    .filter((item): item is string => Boolean(item && item.trim()))
    .map((item) => item.trim())
    .join(' ')
    .trim();
}

function languageCulture(request: BackgroundImageRequest): { country: string; city: string; culture: string } {
  const fallback = request.languageCode ? LANGUAGE_CONTEXT[request.languageCode] : undefined;
  return {
    country: request.country || fallback?.country || request.languageName || 'global',
    city: request.city || fallback?.city || '',
    culture: fallback?.culture || compact(request.languageName, 'culture'),
  };
}

export function generateBackgroundQueryTiers(request: BackgroundImageRequest): BackgroundQueryTier[] {
  const context = languageCulture(request);
  const topic = compact(request.title, request.lessonTitle, request.cardType, ...(request.topicTags ?? []));
  const mood = request.mood || 'atmospheric cinematic';
  const card = request.itemType === 'immersion' ? 'story learning scene' : `${request.itemType} learning card`;

  const tiers: BackgroundQueryTier[] = [
    {
      level: 1,
      label: 'exact topic + country + card type',
      queries: uniq([
        compact(topic, context.country, card, mood),
        compact(topic, context.city, 'culture', 'golden hour'),
        compact(request.curriculumSlug?.replace(/[-_]+/g, ' '), context.country, card),
      ]),
    },
    {
      level: 2,
      label: 'broader topic + country',
      queries: uniq([
        compact(topic, context.country, 'culture landscape'),
        compact(request.lessonTitle, context.country, 'architecture streets'),
        compact(request.cardType, context.country, 'travel mood'),
      ]),
    },
    {
      level: 3,
      label: 'broader country + culture',
      queries: uniq([
        compact(context.country, context.culture, 'landscape'),
        compact(context.city, context.country, 'urban atmosphere'),
        compact(context.country, 'cultural architecture evening'),
      ]),
    },
    {
      level: 4,
      label: 'broader language + culture',
      queries: uniq([
        compact(request.languageName, 'language culture', 'atmospheric background'),
        compact(request.languageName, 'study ambience', 'cinematic'),
        compact(context.culture, 'minimal scene'),
      ]),
    },
    {
      level: 5,
      label: 'generic high-quality study aesthetic',
      queries: uniq([
        'moody study desk headphones books cinematic',
        'minimal dark learning workspace atmospheric',
        'premium abstract travel culture texture dark teal',
      ]),
    },
  ];

  return tiers.map((tier) => ({
    ...tier,
    queries: tier.queries.filter((query) => query.length >= 8).slice(0, 4),
  }));
}
