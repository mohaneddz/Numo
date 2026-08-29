import { completeWithEcho } from '../services/aiProvider';
import type { ChatMessage } from '../types/ai';
import {
  applyQuickPolicy,
  canUseFreeProduction,
  type DifficultyPreference,
  type JourneyLevel,
} from '../services/exercises/exercisePolicy';
import { resolveExerciseImage } from '../services/exercises/exerciseMediaService';
import {
  getExerciseByUserKey,
  resolveExerciseByInternal,
  type ExerciseAdapter,
  type ExerciseCatalogEntry,
} from '../services/exercises/exerciseCatalog';

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
  userKey?: string;
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

export type ExerciseDomain = 'learn' | 'quick' | 'review' | 'script' | 'speak' | 'write';

export interface GenerateExerciseDraftInput extends GenerateSessionInput {
  exerciseDomain: ExerciseDomain;
  exerciseType: string;
  userExerciseKey?: string;
  unit?: {
    id: string;
    title: string;
  };
  concept?: string;
}

export interface GenerateExerciseDraftOutput {
  input: Record<string, unknown>;
  template: Record<string, unknown>;
  result: Record<string, unknown>;
  quickItem: PracticeItem | null;
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

interface QuickDraftPrompt {
  method?: string;
  text?: string;
  variables?: Record<string, unknown>;
}

interface QuickDraftResultShape {
  id?: unknown;
  type?: unknown;
  prompt?: string | QuickDraftPrompt;
  answer?: unknown;
  options?: unknown;
  choices?: unknown;
  correctAnswer?: unknown;
  correctAnswers?: unknown;
  correctChoices?: unknown;
  pairs?: unknown;
  tokens?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  audioText?: unknown;
  context?: unknown;
  scriptHint?: unknown;
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

function parseCompositeAnswer(answer: string): string[] {
  return answer
    .split('||')
    .map((part) => part.trim())
    .filter(Boolean);
}

function markTargetText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('[[') && trimmed.includes(']]')) return trimmed;
  return `[[${trimmed}]]`;
}

function markTargetArray(values: string[] | undefined): string[] | undefined {
  if (!values) return values;
  return values.map((value) => markTargetText(value));
}

function markTargetAnswer(value: string): string {
  const parts = parseCompositeAnswer(value);
  if (parts.length > 1) {
    return parts.map((part) => markTargetText(part)).join(' || ');
  }
  return markTargetText(value);
}

function withTargetMarkers(item: PracticeItem): PracticeItem {
  return {
    ...item,
    answer: markTargetAnswer(item.answer),
    options: markTargetArray(item.options),
    pairs: item.pairs?.map((pair) => ({ left: markTargetText(pair.left), right: markTargetText(pair.right) })),
    tokens: markTargetArray(item.tokens),
    context: item.context ? markTargetText(item.context) : item.context,
  };
}

function withCatalogKey(item: PracticeItem): PracticeItem {
  return {
    ...item,
    userKey: item.userKey ?? resolveExerciseByInternal('quick', item.type)?.userKey ?? undefined,
  };
}

function resolveCatalogEntry(
  input: Pick<GenerateExerciseDraftInput, 'exerciseDomain' | 'exerciseType' | 'userExerciseKey'>,
): ExerciseCatalogEntry | null {
  const byUserKey = getExerciseByUserKey(input.userExerciseKey);
  if (byUserKey) return byUserKey;
  return resolveExerciseByInternal(input.exerciseDomain, input.exerciseType);
}

function hasMarkedTarget(text: string): boolean {
  return /\[\[[\s\S]+?\]\]/.test(text);
}

function isDraftPromptValid(prompt: string): boolean {
  const cleaned = prompt.trim();
  if (!cleaned) return false;
  if (cleaned.includes('...') && !hasMarkedTarget(cleaned)) return false;
  return true;
}

function stripTargetMarkers(text: string): string {
  return text.replace(/\[\[|\]\]/g, '').trim();
}

function normalizeBooleanToken(value: string): string {
  const normalized = stripTargetMarkers(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
  if (normalized === 'true' || normalized === 'wahr') return 'true';
  if (normalized === 'false' || normalized === 'falsch') return 'false';
  return normalized;
}

function optionsAreBooleanPair(options: string[]): boolean {
  if (options.length !== 2) return false;
  const normalized = new Set(options.map((option) => normalizeBooleanToken(option)));
  return normalized.size === 2 && normalized.has('true') && normalized.has('false');
}

function looksLikeGenericChoicePrompt(prompt: string): boolean {
  const cleaned = stripTargetMarkers(prompt).toLowerCase();
  return (
    /^choose the best answer in\b/.test(cleaned)
    || /^select the best answer in\b/.test(cleaned)
    || /^choose the correct answer in\b/.test(cleaned)
    || /^choose the best option in\b/.test(cleaned)
    || /^choose the best answer\b/.test(cleaned)
  );
}

function hasConcreteChoiceContext(prompt: string): boolean {
  const cleaned = prompt.trim();
  if (!cleaned) return false;
  if (hasMarkedTarget(cleaned)) return true;
  if (/["'][^"']+["']/.test(cleaned)) return true;
  return /\b(what does|what do we call|how do we say|which option|which phrase|which word|translate|in this situation|complete the dialogue|true or false|statement|most natural|more formal)\b/i.test(cleaned);
}

function isImageExerciseType(type: PracticeItemType): boolean {
  return type === 'image_to_word' || type === 'word_to_image' || type === 'sound_to_image';
}

function isImageAdapter(adapter: ExerciseAdapter): boolean {
  return (
    adapter.previewQuickType === 'image_to_word'
    || adapter.internalType === 'image_to_word'
    || adapter.internalType === 'word_to_image'
    || adapter.internalType === 'sound_to_image'
    || adapter.internalType === 'image_word_recognition'
  );
}

function looksLikePlaceholderImageUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith('data:')) return true;
  return (
    normalized.includes('example.com')
    || normalized.includes('dummyimage.com')
    || normalized.includes('placehold.co')
    || normalized.includes('placeholder.com')
    || normalized.includes('loremflickr.com')
  );
}

function hasImagePromptContext(prompt: string): boolean {
  const cleaned = stripTargetMarkers(prompt).toLowerCase();
  return /\b(image|photo|picture|visual|look at the image|shown)\b/.test(cleaned);
}

let imagePromptVariantCursor = 0;

function nextImagePromptVariant(): number {
  imagePromptVariantCursor = (imagePromptVariantCursor + 1) % 4;
  return imagePromptVariantCursor;
}

function buildDeterministicImageChoiceFallback(input: GenerateSessionInput): DeterministicChoiceFallback {
  const variant = nextImagePromptVariant();
  if (input.languageCode === 'de') {
    if (variant === 0) {
      return {
        prompt: 'What do we call the thing in this picture in German?',
        choices: ['[[Katze]]', '[[Hund]]', '[[Haus]]', '[[Buch]]'],
        correctAnswer: '[[Katze]]',
      };
    }
    if (variant === 1) {
      return {
        prompt: 'Which German word best labels the object shown in the photo?',
        choices: ['[[Katze]]', '[[Hund]]', '[[Haus]]', '[[Buch]]'],
        correctAnswer: '[[Katze]]',
      };
    }
    if (variant === 2) {
      return {
        prompt: 'Choose the German word that matches this picture.',
        choices: ['[[Katze]]', '[[Hund]]', '[[Haus]]', '[[Buch]]'],
        correctAnswer: '[[Katze]]',
      };
    }
    return {
      prompt: 'Which option is NOT a correct label for the animal in this picture?',
      choices: ['[[Katze]]', '[[Kätzchen]]', '[[Stubentiger]]', '[[Hund]]'],
      correctAnswer: '[[Hund]]',
    };
  }
  if (input.languageCode === 'zh') {
    if (variant === 0) {
      return {
        prompt: 'What do we call the thing in this picture in Chinese?',
        choices: ['[[猫]]', '[[狗]]', '[[房子]]', '[[书]]'],
        correctAnswer: '[[猫]]',
      };
    }
    if (variant === 1) {
      return {
        prompt: 'Which Chinese word best labels the object shown in the photo?',
        choices: ['[[猫]]', '[[狗]]', '[[房子]]', '[[书]]'],
        correctAnswer: '[[猫]]',
      };
    }
    if (variant === 2) {
      return {
        prompt: 'Choose the Chinese word that matches this picture.',
        choices: ['[[猫]]', '[[狗]]', '[[房子]]', '[[书]]'],
        correctAnswer: '[[猫]]',
      };
    }
    return {
      prompt: 'Which option is NOT a correct label for the animal in this picture?',
      choices: ['[[猫]]', '[[小猫]]', '[[猫咪]]', '[[狗]]'],
      correctAnswer: '[[狗]]',
    };
  }
  if (input.languageCode === 'ja') {
    if (variant === 0) {
      return {
        prompt: 'What do we call the thing in this picture in Japanese?',
        choices: ['[[猫]]', '[[犬]]', '[[家]]', '[[本]]'],
        correctAnswer: '[[猫]]',
      };
    }
    if (variant === 1) {
      return {
        prompt: 'Which Japanese word best labels the object shown in the photo?',
        choices: ['[[猫]]', '[[犬]]', '[[家]]', '[[本]]'],
        correctAnswer: '[[猫]]',
      };
    }
    if (variant === 2) {
      return {
        prompt: 'Choose the Japanese word that matches this picture.',
        choices: ['[[猫]]', '[[犬]]', '[[家]]', '[[本]]'],
        correctAnswer: '[[猫]]',
      };
    }
    return {
      prompt: 'Which option is NOT a correct label for the animal in this picture?',
      choices: ['[[猫]]', '[[ねこ]]', '[[ネコ]]', '[[犬]]'],
      correctAnswer: '[[犬]]',
    };
  }
  const languageLabel = input.languageName || input.languageCode.toUpperCase();
  if (variant === 0) {
    return {
      prompt: `What do we call the thing in this picture in ${languageLabel}?`,
      choices: ['[[cat]]', '[[dog]]', '[[house]]', '[[book]]'],
      correctAnswer: '[[cat]]',
    };
  }
  if (variant === 1) {
    return {
      prompt: `Which ${languageLabel} word best labels the object shown in the photo?`,
      choices: ['[[cat]]', '[[dog]]', '[[house]]', '[[book]]'],
      correctAnswer: '[[cat]]',
    };
  }
  if (variant === 2) {
    return {
      prompt: `Choose the ${languageLabel} word that matches this picture.`,
      choices: ['[[cat]]', '[[dog]]', '[[house]]', '[[book]]'],
      correctAnswer: '[[cat]]',
    };
  }
  return {
    prompt: 'Which option is NOT a correct label for the animal in this picture?',
    choices: ['[[cat]]', '[[kitty]]', '[[feline]]', '[[dog]]'],
    correctAnswer: '[[dog]]',
  };
}

interface DeterministicChoiceFallback {
  prompt: string;
  choices: string[];
  correctAnswer: string;
}

function buildDeterministicChoiceFallback(input: GenerateSessionInput): DeterministicChoiceFallback {
  if (input.languageCode === 'de') {
    return {
      prompt: "How do we say 'hello' in German?",
      choices: ['[[Hallo]]', '[[Guten Tag]]', '[[Auf Wiedersehen]]', '[[Gute Nacht]]'],
      correctAnswer: '[[Hallo]]',
    };
  }

  if (input.languageCode === 'zh') {
    return {
      prompt: "How do we say 'hello' in Chinese?",
      choices: ['[[你好]]', '[[谢谢]]', '[[再见]]', '[[请]]'],
      correctAnswer: '[[你好]]',
    };
  }

  if (input.languageCode === 'ja') {
    return {
      prompt: "How do we say 'hello' in Japanese?",
      choices: ['[[こんにちは]]', '[[ありがとう]]', '[[さようなら]]', '[[お願いします]]'],
      correctAnswer: '[[こんにちは]]',
    };
  }

  const languageLabel = input.languageName || input.languageCode.toUpperCase();
  return {
    prompt: `How do we say 'hello' in ${languageLabel}?`,
    choices: ['[[hello]]', '[[goodbye]]', '[[thank you]]', '[[good night]]'],
    correctAnswer: '[[hello]]',
  };
}

function buildDeterministicBinaryFallback(input: GenerateSessionInput): DeterministicChoiceFallback {
  if (input.languageCode === 'de') {
    return {
      prompt: 'True or False: In German, [[Guten Tag]] means "good day."',
      choices: ['[[True]]', '[[False]]'],
      correctAnswer: '[[True]]',
    };
  }
  if (input.languageCode === 'zh') {
    return {
      prompt: 'True or False: In Chinese, [[你好]] means "hello."',
      choices: ['[[True]]', '[[False]]'],
      correctAnswer: '[[True]]',
    };
  }
  if (input.languageCode === 'ja') {
    return {
      prompt: 'True or False: In Japanese, [[ありがとう]] means "thank you."',
      choices: ['[[True]]', '[[False]]'],
      correctAnswer: '[[True]]',
    };
  }
  const languageLabel = input.languageName || input.languageCode.toUpperCase();
  return {
    prompt: `True or False: In ${languageLabel}, "hello" is a greeting.`,
    choices: ['[[True]]', '[[False]]'],
    correctAnswer: '[[True]]',
  };
}

function validateQuickDraftResult(
  adapter: ExerciseAdapter,
  result: QuickDraftResultShape,
): { valid: boolean; reason?: string } {
  const promptText = typeof result.prompt === 'string'
    ? result.prompt.trim()
    : (result.prompt && typeof result.prompt === 'object' && typeof result.prompt.text === 'string'
      ? result.prompt.text.trim()
      : '');
  if (!isDraftPromptValid(promptText)) return { valid: false, reason: 'Prompt missing or incomplete' };

  const options = parseStringArray(result.choices ?? result.options);
  const pairs = parsePairs(result.pairs);
  const tokens = parseStringArray(result.tokens);
  const singleAnswer = typeof result.correctAnswer === 'string' && result.correctAnswer.trim()
    ? result.correctAnswer.trim()
    : (typeof result.answer === 'string' && result.answer.trim() ? result.answer.trim() : '');
  const answerList = parseStringArray(result.correctAnswers ?? result.correctChoices);
  const answers = answerList.length > 0 ? answerList : (singleAnswer ? [singleAnswer] : []);

  if (adapter.validationFamily === 'choice' || adapter.validationFamily === 'binary_choice') {
    if (options.length < 2) return { valid: false, reason: 'Choice exercise needs options' };
    if (answers.length === 0) return { valid: false, reason: 'Choice exercise needs an answer' };
    if (!answers.every((answer) => options.includes(answer))) return { valid: false, reason: 'Answer must exist in options' };
    if (!hasConcreteChoiceContext(promptText) || looksLikeGenericChoicePrompt(promptText)) {
      return { valid: false, reason: 'Prompt must reference a concrete statement or phrase' };
    }
    if (adapter.validationFamily === 'choice') {
      if (options.length < 4) return { valid: false, reason: 'MCQ-style choice needs 4 options' };
      if (optionsAreBooleanPair(options)) return { valid: false, reason: 'MCQ cannot be plain True/False' };
      if (isImageAdapter(adapter)) {
        if (!hasImagePromptContext(promptText)) return { valid: false, reason: 'Image choice prompt must reference an image' };
        if (typeof result.imageUrl === 'string' && looksLikePlaceholderImageUrl(result.imageUrl)) {
          return { valid: false, reason: 'Image choice cannot use placeholder URLs' };
        }
      }
    }
    if (adapter.validationFamily === 'binary_choice') {
      if (options.length !== 2) return { valid: false, reason: 'True/False needs exactly 2 options' };
      if (!optionsAreBooleanPair(options)) return { valid: false, reason: 'True/False must use True/False options' };
    }
  }

  if (adapter.validationFamily === 'pair' && pairs.length < 2) {
    return { valid: false, reason: 'Matching exercise needs at least 2 pairs' };
  }

  if (adapter.validationFamily === 'ordering' && tokens.length < 2) {
    return { valid: false, reason: 'Ordering exercise needs at least 2 tokens' };
  }

  if ((adapter.validationFamily === 'text' || adapter.validationFamily === 'speech') && answers.length === 0) {
    return { valid: false, reason: 'Text/speech exercise needs a target answer' };
  }

  if (adapter.validationFamily === 'script' && options.length < 2 && answers.length === 0) {
    return { valid: false, reason: 'Script preview needs minimal prompt/answer data' };
  }

  if (adapter.validationFamily === 'review_preset' && !promptText) {
    return { valid: false, reason: 'Review preset preview needs a prompt' };
  }

  return { valid: true };
}

function toPreviewQuickType(previewType: string | undefined, languageCode: string): PracticeItemType {
  if (isPracticeItemType(previewType)) return previewType;
  return normalizeItemType(previewType, languageCode);
}

function createFallbackDraftResult(input: GenerateExerciseDraftInput, adapter: ExerciseAdapter | null): Record<string, unknown> {
  const previewType = toPreviewQuickType(adapter?.previewQuickType, input.languageCode);
  if (adapter?.validationFamily === 'pair') {
    return {
      id: `${Date.now()}`,
      type: previewType,
      prompt: englishFallbackPrompt(input, previewType, input.concept),
      pairs: [
        { left: '[[hello]]', right: '[[greeting]]' },
        { left: '[[thank you]]', right: '[[gratitude]]' },
      ],
      answer: '[[Pair matching]]',
    };
  }
  if (adapter?.validationFamily === 'ordering') {
    return {
      id: `${Date.now()}`,
      type: previewType,
      prompt: englishFallbackPrompt(input, previewType, input.concept),
      tokens: ['[[I]]', '[[like]]', '[[water]]'],
      answer: '[[I like water]]',
    };
  }
  if (adapter?.validationFamily === 'binary_choice') {
    const fallback = buildDeterministicBinaryFallback(input);
    return {
      id: `${Date.now()}`,
      type: previewType,
      prompt: fallback.prompt,
      choices: fallback.choices,
      correctAnswer: fallback.correctAnswer,
    };
  }
  if (adapter?.validationFamily === 'speech') {
    return {
      id: `${Date.now()}`,
      type: previewType,
      prompt: englishFallbackPrompt(input, previewType, input.concept),
      answer: '[[Sample spoken response]]',
    };
  }
  if (adapter && isImageAdapter(adapter)) {
    const fallback = buildDeterministicImageChoiceFallback(input);
    return {
      id: `${Date.now()}`,
      type: previewType,
      prompt: fallback.prompt,
      choices: fallback.choices,
      correctAnswer: fallback.correctAnswer,
      answer: fallback.correctAnswer,
    };
  }
  const fallbackChoice = buildDeterministicChoiceFallback(input);
  return {
    id: `${Date.now()}`,
    type: previewType,
    prompt: fallbackChoice.prompt,
    choices: fallbackChoice.choices,
    correctAnswer: fallbackChoice.correctAnswer,
    answer: fallbackChoice.correctAnswer,
  };
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
        userKey: resolveExerciseByInternal('quick', type)?.userKey ?? undefined,
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

  return normalized.map(withCatalogKey).map(withTargetMarkers);
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

async function hydrateImageItems(
  items: PracticeItem[],
  input: GenerateSessionInput,
  options?: { forceSearch?: boolean },
): Promise<PracticeItem[]> {
  const forceSearch = options?.forceSearch === true;
  const mapped = await Promise.all(
    items.map(async (item) => {
      if (!isImageExerciseType(item.type)) {
        return item;
      }
      const hasUsableImage = typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0 && !looksLikePlaceholderImageUrl(item.imageUrl);
      if (hasUsableImage && !forceSearch) {
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
    items: hydrated.map(withCatalogKey).map(withTargetMarkers),
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
  return `${buildDeterministicChoiceFallback(input).prompt}${conceptSuffix}`;
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
- Never return placeholder prompts or incomplete questions.
- Beginners should receive recognition/select/matching/cloze style items.
- For zh include pinyin/tone cues where useful.
- For ja include kana/kanji reading clarity where useful.
- Prompt/instruction text must be in English.
- Wrap any target-language token or phrase shown to learners in [[...]] markers.
- Output JSON only.`,
    createdAt: Date.now(),
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const responseText = await completeWithEcho([prompt], 'analyst', {
        maxTokens: 1800,
        responseFormat: { type: 'json_object' },
      });
      const payload = parseJsonPayload<GeneratedPracticePayload>(responseText);
      const items = normalizeItems(input.languageCode, payload)
        .filter((item) => isDraftPromptValid(item.prompt));
      if (items.length > 0) {
        return items;
      }
      lastError = new Error('No valid practice items returned');
    } catch (error) {
      lastError = error;
    }
  }
  throw (lastError instanceof Error ? lastError : new Error('Failed to generate valid practice items'));
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
    return withTargetMarkers(withCatalogKey({ ...base, answer: 'I like tea', tokens: ['I', 'like', 'tea'] }));
  }
  if (base.type === 'match') {
    return withTargetMarkers(withCatalogKey({
      ...base,
      answer: 'Pair matching',
      pairs: [
        { left: 'hello', right: 'greeting' },
        { left: 'thanks', right: 'gratitude' },
      ],
    }));
  }
  if (base.type === 'single_cloze') {
    return withTargetMarkers(withCatalogKey({ ...base, prompt: 'Complete: I ___ water.', answer: 'drink', options: undefined }));
  }
  return withTargetMarkers(withCatalogKey(base));
}

function buildExerciseTemplate(
  domain: ExerciseDomain,
  exerciseType: string,
  userExerciseKey?: string,
  adapter?: ExerciseAdapter | null,
): Record<string, unknown> {
  if (domain === 'quick') {
    const imageAdapter = Boolean(adapter && isImageAdapter(adapter));
    const promptMethodSpec = imageAdapter
      ? 'image_label_match | image_name_object | image_not_matching'
      : 'meaning | translation_to_target | translation_to_english | context_choice | fill_in_context | register_formality';
    const promptMethods = imageAdapter
      ? [
        { method: 'image_label_match', template: 'Which word matches the object in this image?' },
        { method: 'image_name_object', template: "What do we call the thing in this picture in <target language>?" },
        { method: 'image_not_matching', template: 'Which option is NOT a correct label for the object in this picture?' },
      ]
      : [
        { method: 'meaning', template: "What does '{word}' mean in English?" },
        { method: 'translation_to_target', template: "How do we say '{englishPhrase}' in <target language>?" },
        { method: 'translation_to_english', template: "Which option is the best English translation of '{targetPhrase}'?" },
        { method: 'context_choice', template: "In this situation: '{situation}', which phrase is most natural?" },
        { method: 'fill_in_context', template: "Complete the dialogue: '{dialogueWithBlank}'" },
        { method: 'register_formality', template: 'Which phrase is more formal?' },
      ];
    return {
      id: 'string',
      userKey: userExerciseKey ?? 'string',
      type: adapter?.previewQuickType ?? exerciseType,
      prompt: {
        method: promptMethodSpec,
        text: 'string (explicit English instruction, wrap target-language words/phrases with [[...]] markers)',
        variables: {
          word: 'string optional',
          englishPhrase: 'string optional',
          targetPhrase: 'string optional',
          situation: 'string optional',
          dialogueWithBlank: 'string optional',
        },
      },
      choices: ['string', 'string', 'string', 'string'],
      correctAnswer: 'string (must match one choice exactly)',
      correctAnswers: ['string optional for multi-select MCQ'],
      explanation: 'string optional',
      promptMethods,
      pairs: [{ left: 'string', right: 'string' }],
      tokens: ['string', 'string'],
      imageUrl: 'string optional',
      imageAlt: 'string optional',
      audioText: 'string optional',
      context: 'string optional',
      scriptHint: 'string optional',
    };
  }
  if (domain === 'learn') {
    return {
      taskType: exerciseType,
      instruction: 'string (English instruction)',
      prompt: 'string',
      expectedAnswer: 'string',
      distractors: ['string', 'string', 'string'],
      payload: {
        promptText: 'string optional',
        expectedText: 'string optional',
        options: ['string', 'string'],
        correctOption: 'string optional',
        pairs: [{ left: 'string', right: 'string' }],
        tokens: ['string', 'string'],
        groups: [{ name: 'string', items: ['string', 'string'] }],
        statement: 'string optional',
        audioText: 'string optional',
        imageUrl: 'string optional',
        imageAlt: 'string optional',
      },
    };
  }
  if (domain === 'review') {
    return {
      id: 'string',
      type: exerciseType,
      term: 'string',
      prompt: 'string',
      answer: 'string',
      hint: 'string optional',
      options: ['string', 'string', 'string', 'string'],
      correctIndex: 0,
      statement: 'string optional',
      correctBool: true,
      bank: ['string', 'string'],
      expectedReason: 'string optional',
      sourceId: 'string optional',
      scriptHint: 'string optional',
    };
  }
  if (domain === 'script') {
    return {
      mode: exerciseType,
      payload: {
        strokePaths: [],
        width: 320,
        height: 320,
        modelKey: 'string optional',
      },
    };
  }
  if (domain === 'speak') {
    return {
      type: exerciseType,
      target: 'string',
      gloss: 'string',
    };
  }
  return exerciseType === 'correction_review'
    ? {
      type: exerciseType,
      corrections: [
        {
          original: 'string',
          corrected: 'string',
          type: 'grammar',
          explanation: 'string',
        },
      ],
    }
    : {
      type: exerciseType,
      text: 'string',
    };
}

function normalizeQuickItemFromDraft(
  input: GenerateExerciseDraftInput,
  result: Record<string, unknown>,
  adapter?: ExerciseAdapter | null,
  userKey?: string,
): PracticeItem {
  const draft = result as QuickDraftResultShape;
  const rawType = typeof draft.type === 'string' ? draft.type : adapter?.previewQuickType ?? input.exerciseType;
  const type = normalizeItemType(rawType, input.languageCode);
  const options = parseStringArray(draft.choices ?? draft.options).slice(0, 4);
  const pairs = parsePairs(draft.pairs).slice(0, 6);
  const tokens = parseStringArray(draft.tokens);

  const promptText = typeof draft.prompt === 'string'
    ? draft.prompt.trim()
    : (draft.prompt && typeof draft.prompt === 'object' && typeof draft.prompt.text === 'string'
      ? draft.prompt.text.trim()
      : '');

  const normalizedCorrectAnswers = parseStringArray(draft.correctAnswers ?? draft.correctChoices);
  const singleCorrectAnswer = typeof draft.correctAnswer === 'string' && draft.correctAnswer.trim()
    ? draft.correctAnswer.trim()
    : (typeof draft.answer === 'string' && draft.answer.trim() ? draft.answer.trim() : 'Sample answer');
  let rawAnswers = normalizedCorrectAnswers.length > 0 ? normalizedCorrectAnswers : [singleCorrectAnswer];
  let effectivePrompt = promptText || englishFallbackPrompt(input, type, input.concept);

  let normalizedOptions = options.length >= 2
    ? options
    : adapter?.validationFamily === 'binary_choice'
      ? [rawAnswers[0], rawAnswers[0] === 'True' ? 'False' : 'True']
      : type === 'mcq' || type === 'greeting_response' || type === 'context_meaning' || type === 'image_to_word' || type === 'sound_to_word' || type === 'sound_to_image'
      ? [rawAnswers[0], 'Distractor A', 'Distractor B', 'Distractor C']
      : undefined;

  if (adapter?.validationFamily === 'choice') {
    const fallback = buildDeterministicChoiceFallback(input);
    if (!normalizedOptions || normalizedOptions.length < 4 || optionsAreBooleanPair(normalizedOptions)) {
      normalizedOptions = [...fallback.choices];
    }
    if (looksLikeGenericChoicePrompt(effectivePrompt) || !hasConcreteChoiceContext(effectivePrompt)) {
      effectivePrompt = fallback.prompt;
    }
    const optionPool = normalizedOptions ?? [];
    const validAnswers = rawAnswers.filter((entry) => optionPool.includes(entry));
    rawAnswers = validAnswers.length > 0 ? validAnswers : [fallback.correctAnswer];
  }

  if (adapter?.validationFamily === 'binary_choice') {
    const fallback = buildDeterministicBinaryFallback(input);
    if (!normalizedOptions || normalizedOptions.length !== 2 || !optionsAreBooleanPair(normalizedOptions)) {
      normalizedOptions = [...fallback.choices];
    }
    if (looksLikeGenericChoicePrompt(effectivePrompt) || !hasConcreteChoiceContext(effectivePrompt)) {
      effectivePrompt = fallback.prompt;
    }
    const optionPool = normalizedOptions ?? [];
    const validAnswers = rawAnswers.filter((entry) => optionPool.includes(entry));
    rawAnswers = validAnswers.length > 0 ? validAnswers : [fallback.correctAnswer];
  }

  if (isImageExerciseType(type)) {
    const fallback = buildDeterministicImageChoiceFallback(input);
    if (!normalizedOptions || normalizedOptions.length < 4 || optionsAreBooleanPair(normalizedOptions)) {
      normalizedOptions = [...fallback.choices];
    }
    if (!hasImagePromptContext(effectivePrompt)) {
      effectivePrompt = fallback.prompt;
    }
    const optionPool = normalizedOptions ?? [];
    const validAnswers = rawAnswers.filter((entry) => optionPool.includes(entry));
    rawAnswers = validAnswers.length > 0 ? validAnswers : [fallback.correctAnswer];
  }

  const safeAnswers = normalizedOptions && normalizedOptions.length >= 2
    ? rawAnswers.filter((entry) => normalizedOptions.includes(entry))
    : rawAnswers;
  const safeAnswer = safeAnswers.length > 0
    ? safeAnswers.join(' || ')
    : (normalizedOptions && normalizedOptions.length >= 2 ? normalizedOptions[0] : singleCorrectAnswer);

  return withTargetMarkers(withAudioFallback({
    id: (typeof draft.id === 'string' && draft.id.trim()) || `${Date.now()}`,
    type,
    userKey: userKey ?? resolveExerciseByInternal(input.exerciseDomain, input.exerciseType)?.userKey ?? resolveExerciseByInternal('quick', type)?.userKey ?? undefined,
    prompt: effectivePrompt,
    answer: safeAnswer,
    options: normalizedOptions,
    pairs: pairs.length >= 2 ? pairs : undefined,
    tokens: tokens.length >= 2 ? tokens : undefined,
    imageUrl: typeof draft.imageUrl === 'string' ? draft.imageUrl : undefined,
    imageAlt: typeof draft.imageAlt === 'string' ? draft.imageAlt : undefined,
    audioText: typeof draft.audioText === 'string' ? draft.audioText : undefined,
    context: typeof draft.context === 'string' ? draft.context : undefined,
    scriptHint: typeof draft.scriptHint === 'string' ? draft.scriptHint : undefined,
    languageCode: input.languageCode,
  }));
}

export async function generateExerciseDraft(input: GenerateExerciseDraftInput): Promise<GenerateExerciseDraftOutput> {
  const catalogEntry = resolveCatalogEntry(input);
  const effectiveAdapter = catalogEntry?.adapter ?? null;
  const effectiveDomain: ExerciseDomain = effectiveAdapter?.engineDomain ?? input.exerciseDomain;
  const effectiveType = effectiveAdapter?.internalType ?? input.exerciseType;

  const requestInput: Record<string, unknown> = {
    languageCode: input.languageCode,
    languageName: input.languageName,
    mode: input.mode ?? 'quick',
    source: input.source ?? 'dev-exercises-page',
    exerciseDomain: effectiveDomain,
    exerciseType: effectiveType,
    userExerciseKey: input.userExerciseKey ?? catalogEntry?.userKey ?? null,
    unit: input.unit ? { id: input.unit.id, title: input.unit.title } : null,
    concept: input.concept?.trim() || null,
    learnerLevel: input.journeyLevel ?? 'beginner',
    difficulty: input.difficultyPreference ?? 'standard',
  };
  const normalizedInput: GenerateExerciseDraftInput = {
    ...input,
    exerciseDomain: effectiveDomain,
    exerciseType: effectiveType,
    userExerciseKey: input.userExerciseKey ?? catalogEntry?.userKey ?? input.userExerciseKey,
  };
  const template = buildExerciseTemplate(
    effectiveDomain,
    effectiveType,
    normalizedInput.userExerciseKey,
    effectiveAdapter,
  );
  const imageRuleBlock = effectiveAdapter && isImageAdapter(effectiveAdapter)
    ? `
- This is an image-choice exercise:
  - Use one of these prompt styles: "What do we call the thing in this picture ...?", "Which word matches the object in this image?", or "Which option is NOT a correct label for the object in this picture?"
  - Ensure prompt.method is one of: image_label_match | image_name_object | image_not_matching.
  - Keep the prompt explicitly visual (mention image/picture/photo).
  - Do NOT use placeholder URLs like example.com or dummyimage.com.`
    : '';
  const prompt: ChatMessage = {
    id: `${Date.now()}-exercise-draft`,
    role: 'user',
    content: `You are generating one language-learning exercise draft.
Input JSON:
${JSON.stringify(requestInput)}

Template JSON (follow this structure and field types):
${JSON.stringify(template)}

Return JSON only:
{"result": <exercise object>}

Rules:
- The result must match the requested exerciseDomain and exerciseType exactly.
- Prompt/instruction text must be in English.
- If any target-language token/phrase appears to learners, wrap it with [[...]] markers.
- Keep beginner-safe content and one clear concept.
- If concept is provided, guide the content with it.
- If unit is provided, align vocabulary/theme with that unit title.
- For quick MCQ-style types, prefer explicit prompts such as:
  - "What does '...' mean?"
  - "How do we say '...' in <target language>?"
  - "In this situation, which phrase is best?"
  and set prompt.method accordingly.
- For quick MCQ-style types, provide exactly 4 choices and make correctAnswer match one choice exactly.
- If the MCQ has multiple correct choices, use correctAnswers array (each must exist in choices).
- For image-choice exercises, choices must be visually grounded and prompt style must match the image context.
${imageRuleBlock}
- Do not return markdown.
- Keep strings concise and practical.`,
    createdAt: Date.now(),
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const responseText = await completeWithEcho([prompt], 'analyst', {
        maxTokens: 1400,
        responseFormat: { type: 'json_object' },
      });
      const parsed = parseJsonPayload<Record<string, unknown>>(responseText);
      const result = parsed.result && typeof parsed.result === 'object'
        ? (parsed.result as Record<string, unknown>)
        : parsed;
      if (effectiveAdapter) {
        const validation = validateQuickDraftResult(effectiveAdapter, result as QuickDraftResultShape);
        if (!validation.valid) {
          lastError = new Error(validation.reason || 'Invalid generated draft');
          continue;
        }
      }

      const quickItem = normalizeQuickItemFromDraft(
        normalizedInput,
        result,
        effectiveAdapter,
        normalizedInput.userExerciseKey,
      );
      const hydratedQuickItem = quickItem
        ? (await hydrateImageItems([quickItem], normalizedInput, { forceSearch: true }))[0]
        : quickItem;

      return {
        input: requestInput,
        template,
        result,
        quickItem: hydratedQuickItem,
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.error('Failed to generate exercise draft', lastError);
  const fallbackResult = createFallbackDraftResult(normalizedInput, effectiveAdapter);
  return {
    input: requestInput,
    template,
    result: fallbackResult,
    quickItem: (
      await hydrateImageItems(
        [
          normalizeQuickItemFromDraft(
            normalizedInput,
            fallbackResult,
            effectiveAdapter,
            normalizedInput.userExerciseKey,
          ),
        ],
        normalizedInput,
        { forceSearch: true },
      )
    )[0],
  };
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
      items: hydrated.map(withCatalogKey).map(withTargetMarkers),
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
    return withTargetMarkers(withCatalogKey(hydrated[0]));
  } catch (error) {
    // This used to hand back the same exercise with " (refreshed)" appended to
    // the prompt and the options reversed, so a failed regeneration looked like
    // a successful one. The caller renders a refresh error, so failing here is
    // both honest and already handled.
    console.error('Failed to regenerate exercise', error);
    throw new Error(
      'Could not generate a new exercise. Check your AI provider settings, or try again.',
    );
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
    return withTargetMarkers(withCatalogKey(hydrated[0]));
  } catch (error) {
    console.error('Failed to generate infinite exercise', error);
    return fallbackInfiniteExercise(input);
  }
}
