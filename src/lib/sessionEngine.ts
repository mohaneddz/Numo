import { completeWithEcho } from '../services/aiProvider';
import type { ChatMessage } from '../types/ai';
import {
  applyQuickPolicy,
  canUseFreeProduction,
  type DifficultyPreference,
  type JourneyLevel,
} from '../services/exercises/exercisePolicy';
import { resolveExerciseImage } from '../services/exercises/exerciseMediaService';

export type PracticeItemType =
  | 'mcq'
  | 'translate'
  | 'speak'
  | 'match'
  | 'image_to_word'
  | 'word_to_image'
  | 'sound_to_word'
  | 'sound_to_image'
  | 'phrase_assembly'
  | 'single_cloze'
  | 'greeting_response'
  | 'context_meaning'
  | 'hanzi_pinyin'
  | 'kanji_reading'
  | 'radical_match'
  | 'kana_confusion';

export interface PracticeMatchPair {
  left: string;
  right: string;
}

export interface PracticeItem {
  id: string;
  type: PracticeItemType;
  prompt: string;
  answer: string;
  options?: string[];
  pairs?: PracticeMatchPair[];
  tokens?: string[];
  imageUrl?: string;
  imageAlt?: string;
  audioText?: string;
  context?: string;
  languageCode?: string;
  scriptHint?: string;
}

export interface SessionState {
  items: PracticeItem[];
  currentIndex: number;
  correctAnswers: number;
  completed: boolean;
}

interface GenerateSessionInput {
  mode?: string;
  source?: string;
  languageCode: string;
  languageName: string;
  journeyLevel?: JourneyLevel;
  difficultyPreference?: DifficultyPreference;
}

interface RegenerateExerciseInput extends GenerateSessionInput {
  currentItem: PracticeItem;
}

interface GenerateInfiniteExerciseInput extends GenerateSessionInput {
  concept?: string;
  forceType?: PracticeItemType;
}

interface GeneratedPracticePayload {
  practiceItems?: Array<{
    id?: string;
    type?: string;
    prompt?: string;
    answer?: string;
    options?: string[];
    pairs?: Array<{
      left?: string;
      right?: string;
    }>;
    tokens?: string[];
    imageUrl?: string;
    imageAlt?: string;
    audioText?: string;
    context?: string;
    scriptHint?: string;
  }>;
}

const ALL_TYPES: PracticeItemType[] = [
  'mcq',
  'translate',
  'speak',
  'match',
  'image_to_word',
  'word_to_image',
  'sound_to_word',
  'sound_to_image',
  'phrase_assembly',
  'single_cloze',
  'greeting_response',
  'context_meaning',
  'hanzi_pinyin',
  'kanji_reading',
  'radical_match',
  'kana_confusion',
];

const COMPLETE_BEGINNER_TYPES: PracticeItemType[] = [
  'mcq',
  'match',
  'image_to_word',
  'word_to_image',
  'sound_to_word',
  'sound_to_image',
  'single_cloze',
  'greeting_response',
  'context_meaning',
  'hanzi_pinyin',
  'kanji_reading',
  'radical_match',
  'kana_confusion',
  'phrase_assembly',
];

function parseJsonPayload<T>(value: string): T {
  const jsonMatch = value.match(/```(?:json)?\n([\s\S]*)\n```/);
  const jsonString = jsonMatch ? jsonMatch[1] : value;
  return JSON.parse(jsonString.trim()) as T;
}

function isPracticeItemType(value: string | undefined): value is PracticeItemType {
  return typeof value === 'string' && ALL_TYPES.includes(value as PracticeItemType);
}

function getPolicyContext(input: GenerateSessionInput) {
  return {
    languageCode: input.languageCode,
    level: input.journeyLevel ?? 'beginner',
    difficulty: input.difficultyPreference ?? 'standard',
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function parsePairs(value: unknown): PracticeMatchPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const left = typeof (item as { left?: unknown }).left === 'string' ? (item as { left: string }).left.trim() : '';
      const right = typeof (item as { right?: unknown }).right === 'string' ? (item as { right: string }).right.trim() : '';
      if (!left || !right) return null;
      return { left, right };
    })
    .filter((item): item is PracticeMatchPair => Boolean(item));
}

function normalizeItemType(rawType: string | undefined, languageCode: string): PracticeItemType {
  if (isPracticeItemType(rawType)) return rawType;
  if (languageCode === 'zh') return 'hanzi_pinyin';
  if (languageCode === 'ja') return 'kanji_reading';
  return 'context_meaning';
}

function normalizeItems(languageCode: string, payload: GeneratedPracticePayload): PracticeItem[] {
  const normalized = (payload.practiceItems ?? [])
    .filter((item): item is NonNullable<GeneratedPracticePayload['practiceItems']>[number] => Boolean(item))
    .map((item, index): PracticeItem => {
      const type = normalizeItemType(item.type, languageCode);
      const options = parseStringArray(item.options).slice(0, 4);
      const pairs = parsePairs(item.pairs).slice(0, 6);
      const tokens = parseStringArray(item.tokens);
      return {
        id: (item.id && item.id.trim()) || String(index + 1),
        type,
        prompt: (item.prompt && item.prompt.trim()) || 'Practice prompt unavailable.',
        answer: (item.answer && item.answer.trim()) || '',
        options: options.length >= 2 ? options : undefined,
        pairs: pairs.length >= 2 ? pairs : undefined,
        tokens: tokens.length >= 2 ? tokens : undefined,
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
        imageAlt: typeof item.imageAlt === 'string' ? item.imageAlt : undefined,
        audioText: typeof item.audioText === 'string' ? item.audioText : undefined,
        context: typeof item.context === 'string' ? item.context : undefined,
        scriptHint: typeof item.scriptHint === 'string' ? item.scriptHint : undefined,
        languageCode,
      };
    })
    .filter((item) => {
      if (!item.answer) return false;
      if (item.type === 'match') return Boolean(item.pairs && item.pairs.length >= 2);
      if (item.type === 'phrase_assembly') return Boolean(item.tokens && item.tokens.length >= 2);
      if (
        item.type === 'mcq'
        || item.type === 'greeting_response'
        || item.type === 'context_meaning'
        || item.type === 'hanzi_pinyin'
        || item.type === 'kanji_reading'
        || item.type === 'radical_match'
        || item.type === 'kana_confusion'
        || item.type === 'image_to_word'
        || item.type === 'word_to_image'
        || item.type === 'sound_to_word'
        || item.type === 'sound_to_image'
      ) {
        return Boolean(item.options && item.options.length >= 2);
      }
      return true;
    });

  return normalized;
}

function zhFallbackItems(languageLabel: string): PracticeItem[] {
  return [
    {
      id: 'zh-greet',
      type: 'greeting_response',
      prompt: `You hear: "\u4f60\u597d". Choose the best response in ${languageLabel}.`,
      answer: '\u4f60\u597d\uff01',
      options: ['\u4f60\u597d\uff01', '\u518d\u89c1\u3002', '\u8c22\u8c22\u3002', '\u4e0d\u7528\u8c22\u3002'],
      languageCode: 'zh',
      scriptHint: 'ni3 hao3',
    },
    {
      id: 'zh-pinyin',
      type: 'hanzi_pinyin',
      prompt: 'Choose the correct pinyin for \"\u732b\".',
      answer: 'mao1',
      options: ['mao1', 'miao3', 'muo2', 'mao3'],
      languageCode: 'zh',
    },
    {
      id: 'zh-radical',
      type: 'radical_match',
      prompt: 'Which character shares the \"\u5973\" component?',
      answer: '\u5988',
      options: ['\u5988', '\u53e3', '\u6728', '\u4eba'],
      languageCode: 'zh',
    },
    {
      id: 'zh-cloze',
      type: 'single_cloze',
      prompt: '\u6211 ___ \u5496\u5561\u3002 (I drink coffee.)',
      answer: '\u559d',
      languageCode: 'zh',
    },
    {
      id: 'zh-audio',
      type: 'sound_to_word',
      prompt: 'Listen and pick the word you hear.',
      answer: '\u8c22\u8c22',
      options: ['\u8c22\u8c22', '\u4f60\u597d', '\u4e0d\u5ba2\u6c14', '\u518d\u89c1'],
      audioText: '\u8c22\u8c22',
      languageCode: 'zh',
    },
  ];
}

function jaFallbackItems(languageLabel: string): PracticeItem[] {
  return [
    {
      id: 'ja-greet',
      type: 'greeting_response',
      prompt: `You hear: "\u3053\u3093\u306b\u3061\u306f". Choose the best response in ${languageLabel}.`,
      answer: '\u3053\u3093\u306b\u3061\u306f',
      options: ['\u3053\u3093\u306b\u3061\u306f', '\u3055\u3088\u3046\u306a\u3089', '\u3042\u308a\u304c\u3068\u3046', '\u3044\u305f\u3060\u304d\u307e\u3059'],
      languageCode: 'ja',
    },
    {
      id: 'ja-reading',
      type: 'kanji_reading',
      prompt: 'Choose the reading for \"\u6c34\".',
      answer: 'mizu',
      options: ['mizu', 'ki', 'hi', 'yama'],
      languageCode: 'ja',
    },
    {
      id: 'ja-kana',
      type: 'kana_confusion',
      prompt: 'Choose the correct katakana for "ka".',
      answer: '\u30ab',
      options: ['\u30ab', '\u30ca', '\u304b', '\u304f'],
      languageCode: 'ja',
    },
    {
      id: 'ja-cloze',
      type: 'single_cloze',
      prompt: '\u308f\u305f\u3057\u306f\u307f\u305a\u3092 ___\u3002 (I drink water.)',
      answer: '\u306e\u307f\u307e\u3059',
      languageCode: 'ja',
    },
    {
      id: 'ja-audio',
      type: 'sound_to_word',
      prompt: 'Listen and choose what you hear.',
      answer: '\u3067\u3059',
      options: ['\u3067\u3059', '\u307e\u3059', '\u306f', '\u3092'],
      audioText: '\u3067\u3059',
      languageCode: 'ja',
    },
  ];
}

function defaultFallbackItems(languageLabel: string, languageCode: string): PracticeItem[] {
  return [
    {
      id: 'greet',
      type: 'greeting_response',
      prompt: `Choose the best greeting response in ${languageLabel}.`,
      answer: 'Nice to meet you too.',
      options: ['Nice to meet you too.', 'See you last week.', 'I am a table.', 'Three coffees please.'],
      languageCode,
    },
    {
      id: 'context',
      type: 'context_meaning',
      prompt: `In ${languageLabel}, what meaning fits this context best?`,
      answer: 'Asking politely for help',
      options: ['Asking politely for help', 'Ordering expensive food', 'Ending a phone call', 'Giving weather news'],
      languageCode,
    },
    {
      id: 'assembly',
      type: 'phrase_assembly',
      prompt: 'Assemble the phrase: "I would like water".',
      answer: 'I would like water',
      tokens: ['I', 'would', 'like', 'water'],
      languageCode,
    },
    {
      id: 'cloze',
      type: 'single_cloze',
      prompt: 'Complete: I ___ coffee every morning.',
      answer: 'drink',
      languageCode,
    },
    {
      id: 'audio-word',
      type: 'sound_to_word',
      prompt: 'Listen and choose the matching word.',
      answer: 'hello',
      options: ['hello', 'thanks', 'water', 'goodbye'],
      audioText: 'hello',
      languageCode,
    },
    {
      id: 'mcq',
      type: 'mcq',
      prompt: `Choose the best beginner sentence in ${languageLabel}.`,
      answer: 'Simple practical sentence',
      options: ['Simple practical sentence', 'Complex legal contract', 'Rare academic quote', 'Ambiguous idiom chain'],
      languageCode,
    },
  ];
}

async function hydrateImageItems(items: PracticeItem[], input: GenerateSessionInput): Promise<PracticeItem[]> {
  const mapped = await Promise.all(
    items.map(async (item) => {
      if ((item.type !== 'image_to_word' && item.type !== 'word_to_image' && item.type !== 'sound_to_image') || item.imageUrl) {
        return item;
      }
      try {
        const media = await resolveExerciseImage({
          languageCode: input.languageCode,
          concept: item.answer || item.prompt,
          prompt: item.prompt,
          fallbackLabel: item.answer,
        });
        return {
          ...item,
          imageUrl: media.imageUrl,
          imageAlt: item.imageAlt || item.answer,
        };
      } catch {
        return item;
      }
    }),
  );
  return mapped;
}

async function fallbackSession(input: GenerateSessionInput): Promise<SessionState> {
  const languageLabel = input.languageName || input.languageCode.toUpperCase();
  const policyContext = getPolicyContext(input);

  const core = input.languageCode === 'zh'
    ? zhFallbackItems(languageLabel)
    : input.languageCode === 'ja'
      ? jaFallbackItems(languageLabel)
      : defaultFallbackItems(languageLabel, input.languageCode);

  if (canUseFreeProduction(policyContext)) {
    core.push({
      id: `${input.languageCode}-translate`,
      type: 'translate',
      prompt: `Translate into ${languageLabel}: "I am practicing every day."`,
      answer: `Localized sentence in ${languageLabel}`,
      languageCode: input.languageCode,
    });
  }

  const withImageType = [
    ...core,
    {
      id: `${input.languageCode}-image`,
      type: 'image_to_word' as const,
      prompt: 'Look at the image and choose the correct word.',
      answer: core[0]?.answer || 'hello',
      options: [core[0]?.answer || 'hello', 'table', 'window', 'mountain'],
      languageCode: input.languageCode,
    },
  ];

  const allowedTypes = policyContext.level === 'complete_beginner' ? COMPLETE_BEGINNER_TYPES : ALL_TYPES;
  const filteredByLevel = withImageType.filter((item) => allowedTypes.includes(item.type));
  const policyItems = applyQuickPolicy(filteredByLevel, policyContext).slice(0, 8);
  const covered = enforceCoverage(policyItems, input, 6);
  const hydrated = await hydrateImageItems(covered, input);

  return {
    items: hydrated,
    currentIndex: 0,
    correctAnswers: 0,
    completed: false,
  };
}

function appearsEnglish(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const englishSignals = ['choose', 'translate', 'match', 'speak', 'select', 'complete', 'listen', 'context'];
  return englishSignals.some((signal) => normalized.includes(signal));
}

function englishFallbackPrompt(input: GenerateSessionInput, type: PracticeItemType, concept?: string): string {
  const languageLabel = input.languageName || input.languageCode.toUpperCase();
  const conceptSuffix = concept?.trim() ? ` Focus concept: ${concept.trim()}.` : '';
  if (type === 'match') return `Match each ${languageLabel} expression with its meaning.${conceptSuffix}`;
  if (type === 'image_to_word' || type === 'word_to_image' || type === 'sound_to_image') return `Use the media cue to choose the correct ${languageLabel} item.${conceptSuffix}`;
  if (type === 'sound_to_word') return `Listen and select the matching ${languageLabel} word.${conceptSuffix}`;
  if (type === 'phrase_assembly') return `Assemble a short ${languageLabel} phrase.${conceptSuffix}`;
  if (type === 'single_cloze') return `Fill the missing word in the ${languageLabel} sentence.${conceptSuffix}`;
  if (type === 'translate') return `Translate this into ${languageLabel}.${conceptSuffix}`;
  if (type === 'speak') return `Speak a short response in ${languageLabel}.${conceptSuffix}`;
  return `Choose the best answer in ${languageLabel}.${conceptSuffix}`;
}

function enforceEnglishPrompts(input: GenerateSessionInput, items: PracticeItem[], concept?: string): PracticeItem[] {
  return items.map((item) => ({
    ...item,
    prompt: appearsEnglish(item.prompt) ? item.prompt : englishFallbackPrompt(input, item.type, concept),
  }));
}

function withAudioFallback(item: PracticeItem): PracticeItem {
  if ((item.type === 'sound_to_word' || item.type === 'sound_to_image') && !item.audioText) {
    return { ...item, audioText: item.answer };
  }
  return item;
}

function requiredCoverageTypes(languageCode: string): PracticeItemType[] {
  const base: PracticeItemType[] = ['greeting_response', 'context_meaning', 'single_cloze', 'image_to_word'];
  if (languageCode === 'zh') return [...base, 'hanzi_pinyin', 'radical_match'];
  if (languageCode === 'ja') return [...base, 'kanji_reading', 'kana_confusion'];
  return base;
}

function createCoverageItem(type: PracticeItemType, languageCode: string, languageName: string): PracticeItem {
  const common = { languageCode };
  if (type === 'greeting_response') {
    return {
      id: `cov-${languageCode}-greeting`,
      type,
      prompt: `Choose the best greeting response in ${languageName}.`,
      answer: languageCode === 'zh' ? '\u4f60\u597d\uff01' : languageCode === 'ja' ? '\u3053\u3093\u306b\u3061\u306f' : 'Nice to meet you too.',
      options: languageCode === 'zh'
        ? ['\u4f60\u597d\uff01', '\u518d\u89c1', '\u8c22\u8c22', '\u660e\u5929\u89c1']
        : languageCode === 'ja'
          ? ['\u3053\u3093\u306b\u3061\u306f', '\u3055\u3088\u3046\u306a\u3089', '\u3042\u308a\u304c\u3068\u3046', '\u307e\u305f\u3042\u3057\u305f']
          : ['Nice to meet you too.', 'I am a mountain.', 'Tomorrow table.', 'Blue quickly.'],
      ...common,
    };
  }
  if (type === 'context_meaning') {
    return {
      id: `cov-${languageCode}-context`,
      type,
      prompt: `In ${languageName}, what meaning fits this context?`,
      answer: 'Asking politely for help',
      options: ['Asking politely for help', 'Arguing loudly', 'Discussing taxes', 'Giving technical specs'],
      ...common,
    };
  }
  if (type === 'single_cloze') {
    return {
      id: `cov-${languageCode}-cloze`,
      type,
      prompt: languageCode === 'zh'
        ? '\u6211 ___ \u6c34\u3002 (I drink water.)'
        : languageCode === 'ja'
          ? '\u308f\u305f\u3057\u306f\u307f\u305a\u3092 ___\u3002'
          : 'Complete: I ___ water every day.',
      answer: languageCode === 'zh' ? '\u559d' : languageCode === 'ja' ? '\u306e\u307f\u307e\u3059' : 'drink',
      ...common,
    };
  }
  if (type === 'image_to_word') {
    return {
      id: `cov-${languageCode}-image`,
      type,
      prompt: 'Look at the image and pick the matching word.',
      answer: languageCode === 'zh' ? '\u732b' : languageCode === 'ja' ? '\u732b' : 'cat',
      options: languageCode === 'zh'
        ? ['\u732b', '\u72d7', '\u6865', '\u5e97']
        : languageCode === 'ja'
          ? ['\u732b', '\u72ac', '\u5ddd', '\u672c']
          : ['cat', 'bridge', 'book', 'city'],
      ...common,
    };
  }
  if (type === 'hanzi_pinyin') {
    return {
      id: 'cov-zh-hanzi',
      type,
      prompt: 'Choose the correct pinyin for \u597d.',
      answer: 'hao3',
      options: ['hao3', 'hao4', 'hao2', 'ha1'],
      ...common,
    };
  }
  if (type === 'radical_match') {
    return {
      id: 'cov-zh-radical',
      type,
      prompt: 'Which option shares the \u6c35 water radical family?',
      answer: '\u6cb3',
      options: ['\u6cb3', '\u6797', '\u706b', '\u53e3'],
      ...common,
    };
  }
  if (type === 'kanji_reading') {
    return {
      id: 'cov-ja-reading',
      type,
      prompt: 'Choose the reading for \u706b.',
      answer: 'hi',
      options: ['hi', 'mizu', 'ki', 'yama'],
      ...common,
    };
  }
  return {
    id: 'cov-ja-kana',
    type: 'kana_confusion',
    prompt: 'Choose the correct kana for \"shi\".',
    answer: '\u3057',
    options: ['\u3057', '\u3061', '\u3055', '\u30b7'],
    ...common,
  };
}

function enforceCoverage(
  items: PracticeItem[],
  input: GenerateSessionInput,
  maxItems: number,
): PracticeItem[] {
  const required = requiredCoverageTypes(input.languageCode);
  const result = [...items];
  const existing = new Set(result.map((item) => item.type));

  for (const type of required) {
    if (existing.has(type)) continue;
    result.push(createCoverageItem(type, input.languageCode, input.languageName));
    existing.add(type);
  }

  if (result.length <= maxItems) {
    return result.map(withAudioFallback);
  }

  const requiredSet = new Set(required);
  while (result.length > maxItems) {
    const removableIndex = result.findIndex((item) => !requiredSet.has(item.type));
    if (removableIndex >= 0) {
      result.splice(removableIndex, 1);
      continue;
    }
    result.pop();
  }

  return result.map(withAudioFallback);
}

function buildAllowedTypes(input: GenerateSessionInput, forceType?: PracticeItemType): PracticeItemType[] {
  if (forceType) return [forceType];
  const context = getPolicyContext(input);
  if (context.level === 'complete_beginner') return COMPLETE_BEGINNER_TYPES;
  if (context.level === 'beginner' && !canUseFreeProduction(context)) {
    return ALL_TYPES.filter((type) => type !== 'translate' && type !== 'speak');
  }
  return ALL_TYPES;
}

async function aiGenerateItems(
  input: GenerateSessionInput,
  opts: { count: number; forceType?: PracticeItemType; concept?: string; currentItem?: PracticeItem },
): Promise<PracticeItem[]> {
  const allowedTypes = buildAllowedTypes(input, opts.forceType).join('|');
  const conceptText = opts.concept?.trim() ? `Concept focus: "${opts.concept.trim()}".` : 'No specific concept focus.';
  const regenerateText = opts.currentItem
    ? `Current exercise to replace with a new one: ${JSON.stringify(opts.currentItem)}`
    : 'No current exercise context.';

  const prompt: ChatMessage = {
    id: `${Date.now()}-quick-gen`,
    role: 'user',
    content: `You are generating beginner-safe language-learning quick exercises.
Language code: "${input.languageCode}" (${input.languageName})
Mode: "${input.mode ?? 'quick'}"
Learner level: "${input.journeyLevel ?? 'beginner'}"
Difficulty: "${input.difficultyPreference ?? 'standard'}"
${conceptText}
${regenerateText}

Return ONLY JSON object:
{
  "practiceItems": [
    {
      "id": "string",
      "type": "${allowedTypes}",
      "prompt": "string",
      "answer": "string",
      "options": ["string", "string", "string", "string"],
      "pairs": [{"left":"string","right":"string"}],
      "tokens": ["string", "string"],
      "imageUrl": "string",
      "imageAlt": "string",
      "audioText": "string",
      "context": "string",
      "scriptHint": "string"
    }
  ]
}

Rules:
- Generate exactly ${opts.count} items.
- Keep one concept per item and short prompts.
- Use practical examples, fair distractors, and no grammar traps.
- Beginners should receive recognition/select/matching/cloze style items.
- For zh include pinyin/tone cues where useful.
- For ja include kana/kanji reading clarity where useful.
- Prompt/instruction text must be in English.
- Output JSON only.`,
    createdAt: Date.now(),
  };

  const responseText = await completeWithEcho([prompt], 'analyst', {
    maxTokens: 1800,
    responseFormat: { type: 'json_object' },
  });
  const payload = parseJsonPayload<GeneratedPracticePayload>(responseText);
  return normalizeItems(input.languageCode, payload);
}

function fallbackInfiniteExercise(input: GenerateInfiniteExerciseInput): PracticeItem {
  const base: PracticeItem = {
    id: 'fallback-single',
    type: input.forceType ?? 'context_meaning',
    prompt: englishFallbackPrompt(input, input.forceType ?? 'context_meaning', input.concept),
    answer: 'Sample answer',
    options: ['Sample answer', 'Distractor A', 'Distractor B', 'Distractor C'],
    languageCode: input.languageCode,
  };

  if (base.type === 'phrase_assembly') {
    return { ...base, answer: 'I like tea', tokens: ['I', 'like', 'tea'] };
  }
  if (base.type === 'match') {
    return {
      ...base,
      answer: 'Pair matching',
      pairs: [
        { left: 'hello', right: 'greeting' },
        { left: 'thanks', right: 'gratitude' },
      ],
    };
  }
  if (base.type === 'single_cloze') {
    return { ...base, prompt: 'Complete: I ___ water.', answer: 'drink', options: undefined };
  }
  return base;
}

export async function generateSession(input: GenerateSessionInput): Promise<SessionState> {
  const policyContext = getPolicyContext(input);
  try {
    const generated = await aiGenerateItems(input, { count: 6 });
    const policyItems = applyQuickPolicy(enforceEnglishPrompts(input, generated), policyContext).slice(0, 8);
    const coveredItems = enforceCoverage(policyItems, input, 6);
    if (coveredItems.length === 0) {
      return fallbackSession(input);
    }
    const hydrated = await hydrateImageItems(coveredItems, input);
    return {
      items: hydrated,
      currentIndex: 0,
      correctAnswers: 0,
      completed: false,
    };
  } catch (error) {
    console.error('Failed to generate session items', error);
    return fallbackSession(input);
  }
}

export async function regenerateExercise(input: RegenerateExerciseInput): Promise<PracticeItem> {
  try {
    const generated = await aiGenerateItems(input, {
      count: 1,
      forceType: input.currentItem.type,
      currentItem: input.currentItem,
    });
    const candidate = generated.find((item) => item.type === input.currentItem.type) ?? generated[0];
    if (!candidate) {
      throw new Error('No regenerated candidate');
    }
    const polished = withAudioFallback(enforceEnglishPrompts(input, [candidate])[0]);
    const hydrated = await hydrateImageItems([{ ...polished, id: input.currentItem.id }], input);
    return hydrated[0];
  } catch (error) {
    console.error('Failed to regenerate exercise', error);
    return {
      ...input.currentItem,
      prompt: `${input.currentItem.prompt} (refreshed)`,
      options: input.currentItem.options ? [...input.currentItem.options].reverse() : input.currentItem.options,
    };
  }
}

export async function generateInfiniteExercise(input: GenerateInfiniteExerciseInput): Promise<PracticeItem> {
  try {
    const generated = await aiGenerateItems(input, {
      count: 1,
      forceType: input.forceType,
      concept: input.concept,
    });
    const policyItems = applyQuickPolicy(
      enforceEnglishPrompts(input, generated, input.concept),
      getPolicyContext(input),
    );
    const candidate = input.forceType
      ? policyItems.find((item) => item.type === input.forceType) ?? policyItems[0]
      : policyItems[0];
    if (!candidate) {
      return fallbackInfiniteExercise(input);
    }
    const hydrated = await hydrateImageItems([withAudioFallback(candidate)], input);
    return hydrated[0];
  } catch (error) {
    console.error('Failed to generate infinite exercise', error);
    return fallbackInfiniteExercise(input);
  }
}
