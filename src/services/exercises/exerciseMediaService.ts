import { initializePersistence } from '../../persistence';
import { imageSearch } from '../../utils/webSearch';
import { completeWithEcho } from '../aiProvider';

export interface ExerciseMediaSelection {
  imageUrl: string;
  thumbnailUrl?: string;
  attribution: string;
  query: string;
  fromCache: boolean;
}

interface ExerciseMediaRequest {
  languageCode: string;
  concept: string;
  prompt: string;
  fallbackLabel?: string;
}

interface PlannedQueryResponse {
  query?: string;
}

const MEDIA_CACHE_KEY = 'exercise_media_cache_v1';

function stripTargetMarkers(value: string): string {
  return value.replace(/\[\[|\]\]/g, '').trim();
}

function normalizeConcept(value: string): string {
  const stripped = stripTargetMarkers(value);
  const first = stripped.split('||')[0]?.trim() ?? '';
  return first;
}

function normalizePromptForKey(value: string): string {
  return stripTargetMarkers(value).replace(/\s+/g, ' ').trim();
}

function itemKey(input: ExerciseMediaRequest): string {
  const concept = normalizeConcept(input.concept);
  const prompt = normalizePromptForKey(input.prompt);
  return `${input.languageCode}:${concept}:${prompt}`.toLowerCase();
}

function fallbackMedia(input: ExerciseMediaRequest): ExerciseMediaSelection {
  const label = normalizeConcept(input.fallbackLabel?.trim() || input.concept || 'learning visual');
  return {
    imageUrl: '/continue_learning.png',
    attribution: 'Built-in offline visual',
    query: label,
    fromCache: false,
  };
}

async function planQuery(input: ExerciseMediaRequest): Promise<string> {
  const safeConcept = normalizeConcept(input.concept);
  const safePrompt = normalizePromptForKey(input.prompt);
  const prompt = `Plan one concise web image query for a beginner-safe language exercise.
Language: ${input.languageCode}
Concept: ${safeConcept}
Prompt: ${safePrompt}
Return JSON only: {"query":"..."}`;

  try {
    const raw = await completeWithEcho([{ id: `img-plan-${Date.now()}`, role: 'user', content: prompt, createdAt: Date.now() }], 'analyst', {
      maxTokens: 120,
      responseFormat: { type: 'json_object' },
    });
    const fenced = raw.match(/```(?:json)?\n([\s\S]*?)\n```/);
    const body = fenced ? fenced[1] : raw;
    const objectText = body.match(/\{[\s\S]*\}/)?.[0] ?? body;
    const parsed = JSON.parse(objectText) as PlannedQueryResponse;
    const query = parsed.query?.trim();
    if (query) return query;
  } catch {
    // fallback below
  }

  return `${safeConcept} object photo`;
}

function uniqueQueries(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function buildQueryCandidates(input: ExerciseMediaRequest, plannedQuery: string): string[] {
  const concept = normalizeConcept(input.concept);
  const fallbackLabel = normalizeConcept(input.fallbackLabel ?? '');
  const prompt = normalizePromptForKey(input.prompt);
  const safePlannedQuery = stripTargetMarkers(plannedQuery).replace(/\s+/g, ' ').trim();
  const quoted = Array.from(prompt.matchAll(/["']([^"']+)["']/g))
    .map((match) => normalizeConcept(match[1] ?? ''))
    .filter(Boolean);

  return uniqueQueries([
    safePlannedQuery,
    `${concept} object photo`,
    `${concept} isolated object`,
    `${fallbackLabel} object photo`,
    ...quoted.map((value) => `${value} object photo`),
    `${concept} ${input.languageCode} vocabulary picture`,
  ]);
}

function isUsableImageUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('data:')) return false;
  if (normalized.includes('example.com')) return false;
  if (normalized.includes('dummyimage.com')) return false;
  if (normalized.endsWith('.svg') || normalized.includes('.svg?')) return false;
  return true;
}

export async function resolveExerciseImage(input: ExerciseMediaRequest): Promise<ExerciseMediaSelection> {
  const persistence = await initializePersistence();
  const key = itemKey(input);

  const cache = (await persistence.repositories.settings.getJson<Record<string, ExerciseMediaSelection>>(MEDIA_CACHE_KEY)) ?? {};
  if (cache[key]) {
    return { ...cache[key], fromCache: true };
  }

  const plannedQuery = await planQuery(input);
  const queryCandidates = buildQueryCandidates(input, plannedQuery);

  try {
    for (const query of queryCandidates) {
      const results = await imageSearch(query, { limit: 10, safeSearch: true });
      const first = results.find((entry) => isUsableImageUrl(entry.url));
      if (!first) continue;

      const selected: ExerciseMediaSelection = {
        imageUrl: first.url,
        thumbnailUrl: first.thumbnail,
        attribution: `Source: ${first.source}`,
        query,
        fromCache: false,
      };

      const nextCache = { ...cache, [key]: selected };
      await persistence.repositories.settings.setJson(MEDIA_CACHE_KEY, nextCache, 'exercise_media');
      return selected;
    }

    return fallbackMedia(input);
  } catch {
    return fallbackMedia(input);
  }
}
