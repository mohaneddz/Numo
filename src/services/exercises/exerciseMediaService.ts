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

function itemKey(input: ExerciseMediaRequest): string {
  return `${input.languageCode}:${input.concept}:${input.prompt}`.toLowerCase();
}

function fallbackMedia(input: ExerciseMediaRequest): ExerciseMediaSelection {
  const label = input.fallbackLabel?.trim() || input.concept || 'learning visual';
  const encoded = encodeURIComponent(label.slice(0, 28));
  return {
    imageUrl: `https://dummyimage.com/640x360/0f173a/9ed4ff.png&text=${encoded}`,
    attribution: 'Deterministic fallback image',
    query: input.concept,
    fromCache: false,
  };
}

async function planQuery(input: ExerciseMediaRequest): Promise<string> {
  const prompt = `Plan one concise web image query for a beginner-safe language exercise.
Language: ${input.languageCode}
Concept: ${input.concept}
Prompt: ${input.prompt}
Return JSON only: {"query":"..."}`;

  try {
    const raw = await completeWithEcho([{ id: `img-plan-${Date.now()}`, role: 'user', content: prompt, createdAt: Date.now() }], 'analyst', {
      maxTokens: 120,
      responseFormat: { type: 'json_object' },
    });
    const parsed = JSON.parse(raw) as PlannedQueryResponse;
    const query = parsed.query?.trim();
    if (query) return query;
  } catch {
    // fallback below
  }

  return `${input.concept} ${input.languageCode} educational illustration`;
}

export async function resolveExerciseImage(input: ExerciseMediaRequest): Promise<ExerciseMediaSelection> {
  const persistence = await initializePersistence();
  const key = itemKey(input);

  const cache = (await persistence.repositories.settings.getJson<Record<string, ExerciseMediaSelection>>(MEDIA_CACHE_KEY)) ?? {};
  if (cache[key]) {
    return { ...cache[key], fromCache: true };
  }

  const plannedQuery = await planQuery(input);

  try {
    const results = await imageSearch(plannedQuery, { limit: 6, safeSearch: true });
    const first = results.find((entry) => Boolean(entry.url));
    if (!first) {
      return fallbackMedia(input);
    }

    const selected: ExerciseMediaSelection = {
      imageUrl: first.url,
      thumbnailUrl: first.thumbnail,
      attribution: `Source: ${first.source}`,
      query: plannedQuery,
      fromCache: false,
    };

    const nextCache = { ...cache, [key]: selected };
    await persistence.repositories.settings.setJson(MEDIA_CACHE_KEY, nextCache, 'exercise_media');
    return selected;
  } catch {
    return fallbackMedia(input);
  }
}
