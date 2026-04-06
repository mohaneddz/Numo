import { LESSON_TASK_TYPES, type TaskType } from '../types/learningPlan';
import { initializePersistence } from '../persistence';
import type {
  LearningLessonRecord,
  LearningUnitRecord,
  LessonObjectiveRecord,
  LessonTaskTemplateRecord,
} from '../persistence';
import { completeWithEcho } from './aiProvider';
import { applyLearnPolicy, type ExercisePolicyContext } from './exercises/exercisePolicy';
import { resolveExerciseImage } from './exercises/exerciseMediaService';

export type LearnGradingMode = 'deterministic' | 'ai' | 'hybrid';

export interface LearnTaskRuntime {
  templateId: string;
  objectiveId: string;
  unitId: string;
  lessonId: string;
  taskType: TaskType;
  instruction: string;
  prompt: string;
  expectedAnswer: string;
  distractors: string[];
  gradingMode: LearnGradingMode;
  payload: Record<string, unknown>;
}

export interface LessonSessionRuntime {
  unit: LearningUnitRecord;
  lesson: LearningLessonRecord;
  objectives: LessonObjectiveRecord[];
  tasks: LearnTaskRuntime[];
}

export interface LessonCatalogSnapshot {
  units: Array<{
    unit: LearningUnitRecord;
    lessons: Array<{
      lesson: LearningLessonRecord;
      objectives: LessonObjectiveRecord[];
    }>;
  }>;
}

interface SyntheticLearnTaskSeed {
  taskType: TaskType;
  instruction: string;
  prompt: string;
  expectedAnswer: string;
  distractors: string[];
}

interface GeneratedTaskVariant {
  templateId?: string;
  prompt?: string;
  answer?: string;
  instruction?: string;
  distractors?: string[];
  payload?: Record<string, unknown>;
  gradingMode?: LearnGradingMode;
}

const OPEN_ENDED_TASKS = new Set<TaskType>([
  'replace_synonym',
  'finish_sentence_starter',
  'complete_dialogue',
  'read_answer_questions',
  'transform_statement_question',
  'correct_grammar',
  'compare_structures',
  'listen_repeat',
  'explain_pronunciation_rule',
]);

const GENERIC_COVERAGE_SEEDS: SyntheticLearnTaskSeed[] = [
  {
    taskType: 'greeting_response_select',
    instruction: 'Choose the best greeting response.',
    prompt: 'A learner says hello. Choose the most natural response.',
    expectedAnswer: 'Hello! Nice to meet you.',
    distractors: ['Good night yesterday.', 'I am a notebook.', 'Three buses quickly.'],
  },
  {
    taskType: 'single_slot_fill',
    instruction: 'Fill one missing slot.',
    prompt: 'Complete this sentence: I ___ coffee every morning.',
    expectedAnswer: 'drink',
    distractors: ['table', 'green', 'window'],
  },
  {
    taskType: 'image_word_recognition',
    instruction: 'Choose the word that matches the image.',
    prompt: 'Look at the image and pick the matching word.',
    expectedAnswer: 'cat',
    distractors: ['chair', 'river', 'market'],
  },
  {
    taskType: 'sound_word_recognition',
    instruction: 'Choose the written form that matches the audio.',
    prompt: 'Listen and choose the matching word.',
    expectedAnswer: 'thank you',
    distractors: ['goodbye', 'tomorrow', 'library'],
  },
];

const ZH_COVERAGE_SEEDS: SyntheticLearnTaskSeed[] = [
  {
    taskType: 'tone_pair_identify',
    instruction: 'Identify the correct tone pattern.',
    prompt: 'Choose the option with the correct pinyin tone pair for 你好.',
    expectedAnswer: 'ni3 hao3',
    distractors: ['ni2 hao2', 'ni4 hao1', 'ni1 hao4'],
  },
  {
    taskType: 'radical_component_identify',
    instruction: 'Identify the key component.',
    prompt: 'Which option is the semantic component in 妈?',
    expectedAnswer: '女',
    distractors: ['口', '木', '心'],
  },
  {
    taskType: 'character_reading_match',
    instruction: 'Match character to reading.',
    prompt: 'Match each character to the correct pinyin reading.',
    expectedAnswer: '你 -> ni3',
    distractors: ['我 -> wo3', '好 -> hao3', '妈 -> ma1'],
  },
];

const JA_COVERAGE_SEEDS: SyntheticLearnTaskSeed[] = [
  {
    taskType: 'kana_confusion_select',
    instruction: 'Choose the correct kana.',
    prompt: 'Select the correct kana for the sound "ka".',
    expectedAnswer: 'か',
    distractors: ['き', 'け', 'カ'],
  },
  {
    taskType: 'reading_character_match',
    instruction: 'Match reading to character.',
    prompt: 'Match each reading to the correct character.',
    expectedAnswer: 'mizu -> 水',
    distractors: ['ki -> 木', 'inu -> 犬', 'neko -> 猫'],
  },
  {
    taskType: 'particle_choice',
    instruction: 'Choose the correct particle.',
    prompt: '私は水___飲みます。',
    expectedAnswer: 'を',
    distractors: ['は', 'に', 'で'],
  },
];

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTaskType(value: string): value is TaskType {
  return (LESSON_TASK_TYPES as readonly string[]).includes(value);
}

function parseJsonObject(value: string): Record<string, unknown> {
  const jsonMatch = value.match(/```(?:json)?\n([\s\S]*?)\n```/);
  const jsonString = jsonMatch ? jsonMatch[1] : value;
  return JSON.parse(jsonString.trim()) as Record<string, unknown>;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function defaultGradingMode(taskType: TaskType): LearnGradingMode {
  return OPEN_ENDED_TASKS.has(taskType) ? 'hybrid' : 'deterministic';
}

function mergePayload(base: Record<string, unknown>, generated: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!generated) return { ...base };
  return {
    ...base,
    ...generated,
  };
}

function createFallbackPayload(taskType: TaskType, prompt: string, expectedAnswer: string, distractors: string[]): Record<string, unknown> {
  const characterMatchTypes = new Set<TaskType>(['character_reading_match', 'reading_character_match']);
  const singleSlotTypes = new Set<TaskType>(['single_slot_fill', 'replace_wrong_character', 'okurigana_fill']);
  const expectedTokens = expectedAnswer.split(/\s+/).filter(Boolean);
  const options = Array.from(new Set([expectedAnswer, ...distractors])).slice(0, 4);

  if (
    taskType === 'match_word_meaning'
    || taskType === 'match_sentence_translation'
  ) {
    const leftTerms = [prompt, ...distractors.slice(0, 2)].map((item, index) => `${item} ${index + 1}`);
    const rightTerms = [expectedAnswer, ...distractors.slice(0, 2)];
    const pairs = leftTerms.map((left, index) => ({ left, right: rightTerms[index] ?? expectedAnswer }));
    return { pairs };
  }

  if (taskType === 'group_words_topic') {
    const allItems = Array.from(new Set([expectedAnswer, ...distractors])).slice(0, 6);
    const midpoint = Math.ceil(allItems.length / 2);
    return {
      groups: [
        { name: 'Category A', items: allItems.slice(0, midpoint) },
        { name: 'Category B', items: allItems.slice(midpoint) },
      ],
      options: allItems,
    };
  }

  if (taskType === 'reorder_sentence' || taskType === 'build_from_chunks') {
    return {
      tokens: expectedTokens.length > 0 ? expectedTokens : prompt.split(/\s+/).filter(Boolean),
    };
  }

  if (taskType === 'choose_response' || taskType === 'choose_verb_form' || taskType === 'identify_context_meaning' || taskType === 'identify_sounds' || taskType === 'listen_choose_written') {
    return {
      options: options.length >= 2 ? options : [expectedAnswer, 'Alternative option'],
      correctOption: expectedAnswer,
    };
  }

  if (
    taskType === 'greeting_response_select'
    || taskType === 'image_word_recognition'
    || taskType === 'sound_word_recognition'
    || taskType === 'radical_component_identify'
    || taskType === 'missing_character_choice'
    || taskType === 'tone_pair_identify'
    || taskType === 'kana_confusion_select'
    || taskType === 'particle_choice'
    || taskType === 'classifier_choice'
  ) {
    return {
      options: options.length >= 2 ? options : [expectedAnswer, 'Alternative option'],
      correctOption: expectedAnswer,
      promptText: prompt,
      expectedText: expectedAnswer,
      distractors,
    };
  }

  if (characterMatchTypes.has(taskType)) {
    return {
      pairs: [
        { left: expectedAnswer, right: expectedAnswer },
        ...distractors.slice(0, 2).map((item, index) => ({ left: `${item} ${index + 1}`, right: item })),
      ],
    };
  }

  if (singleSlotTypes.has(taskType)) {
    return {
      promptText: prompt.includes('___') ? prompt : `${prompt} ___`,
      expectedText: expectedAnswer,
      distractors,
    };
  }

  return {
    promptText: prompt,
    expectedText: expectedAnswer,
    distractors,
  };
}

function fallbackTask(template: LessonTaskTemplateRecord): LearnTaskRuntime {
  const taskType = isTaskType(template.taskType) ? template.taskType : LESSON_TASK_TYPES[0];
  const templatePayload = template.metadata.payload && typeof template.metadata.payload === 'object'
    ? (template.metadata.payload as Record<string, unknown>)
    : {};
  const fallbackPayload = createFallbackPayload(taskType, template.promptTemplate, template.answerTemplate, template.distractors);
  return {
    templateId: template.id,
    objectiveId: template.objectiveId,
    unitId: template.unitId,
    lessonId: template.lessonId,
    taskType,
    instruction: template.instruction,
    prompt: template.promptTemplate,
    expectedAnswer: template.answerTemplate,
    distractors: template.distractors,
    gradingMode: defaultGradingMode(taskType),
    payload: mergePayload(fallbackPayload, templatePayload),
  };
}

async function generateVariants(
  languageCode: string,
  templates: LessonTaskTemplateRecord[],
): Promise<LearnTaskRuntime[]> {
  if (templates.length === 0) return [];

  const payload = templates.map((template) => ({
    templateId: template.id,
    taskType: template.taskType,
    instruction: template.instruction,
    promptTemplate: template.promptTemplate,
    answerTemplate: template.answerTemplate,
    distractors: template.distractors,
    metadataPayload: template.metadata.payload ?? {},
    gradingMode: template.metadata.gradingMode ?? null,
  }));

  try {
    const response = await completeWithEcho(
      [
        {
          id: `lesson-variant-${Date.now()}`,
          role: 'user',
          content: `Language code: ${languageCode}
Generate runtime task variants from this template list.
Return JSON only:
{"tasks":[{"templateId":"...","prompt":"...","answer":"...","instruction":"...","distractors":["..."],"payload":{},"gradingMode":"deterministic|ai|hybrid"}]}

Templates:
${JSON.stringify(payload)}

Rules:
- Keep one output per input templateId.
- Respect task intent and taskType.
- Keep prompts practical and short.
- Keep beginner tasks constrained to one concept and short utterances.
- "payload" is optional and must contain task-specific exercise data.
- "gradingMode" is optional.
- The "instruction" field MUST exclusively be in English.
- Use language-specific examples for ${languageCode}.
- For zh include pinyin/tone awareness when useful.
- For ja include kana/kanji reading cues and particle clarity.`,
          createdAt: Date.now(),
        },
      ],
      'analyst',
      { maxTokens: 2200, responseFormat: { type: 'json_object' } },
    );
    const parsed = parseJsonObject(response) as { tasks?: GeneratedTaskVariant[] };

    const byTemplateId = new Map(
      (parsed.tasks ?? [])
        .filter((item): item is GeneratedTaskVariant => Boolean(item && item.templateId))
        .map((item) => [String(item.templateId), item]),
    );

    const hydrated = templates.map((template) => {
      const fallback = fallbackTask(template);
      const generated = byTemplateId.get(template.id);
      if (!generated?.prompt || !generated?.answer) return fallback;

      const mode = generated.gradingMode;
      const gradingMode: LearnGradingMode = mode === 'ai' || mode === 'hybrid' || mode === 'deterministic'
        ? mode
        : fallback.gradingMode;

      const generatedPayload = generated.payload && typeof generated.payload === 'object'
        ? generated.payload
        : undefined;

      return {
        ...fallback,
        instruction: generated.instruction?.trim() || fallback.instruction,
        prompt: generated.prompt.trim(),
        expectedAnswer: generated.answer.trim(),
        distractors: parseStringArray(generated.distractors).length > 0 ? parseStringArray(generated.distractors) : fallback.distractors,
        gradingMode,
        payload: mergePayload(
          createFallbackPayload(fallback.taskType, generated.prompt.trim(), generated.answer.trim(), parseStringArray(generated.distractors).length > 0 ? parseStringArray(generated.distractors) : fallback.distractors),
          mergePayload(fallback.payload, generatedPayload),
        ),
      };
    });
    const withMedia = await Promise.all(hydrated.map((task) => enrichTaskMedia(task, languageCode)));
    return withMedia;
  } catch {
    const fallback = templates.map(fallbackTask);
    return Promise.all(fallback.map((task) => enrichTaskMedia(task, languageCode)));
  }
}

async function enrichTaskMedia(task: LearnTaskRuntime, languageCode: string): Promise<LearnTaskRuntime> {
  if (task.taskType === 'sound_word_recognition') {
    const hasAudio = typeof task.payload.audioText === 'string' && task.payload.audioText.length > 0;
    if (hasAudio) return task;
    return {
      ...task,
      payload: {
        ...task.payload,
        audioText: task.expectedAnswer,
      },
    };
  }

  if (task.taskType === 'image_word_recognition') {
    const hasImage = typeof task.payload.imageUrl === 'string' && task.payload.imageUrl.length > 0;
    if (hasImage) return task;
    try {
      const media = await resolveExerciseImage({
        languageCode,
        concept: task.expectedAnswer,
        prompt: task.prompt,
        fallbackLabel: task.expectedAnswer,
      });
      return {
        ...task,
        payload: {
          ...task.payload,
          imageUrl: media.imageUrl,
          imageAlt: task.expectedAnswer,
        },
      };
    } catch {
      return task;
    }
  }

  return task;
}

function buildSyntheticLearnTask(
  seed: SyntheticLearnTaskSeed,
  context: { objectiveId: string; unitId: string; lessonId: string; suffix: number },
): LearnTaskRuntime {
  return {
    templateId: `synthetic:${seed.taskType}:${context.suffix}`,
    objectiveId: context.objectiveId,
    unitId: context.unitId,
    lessonId: context.lessonId,
    taskType: seed.taskType,
    instruction: seed.instruction,
    prompt: seed.prompt,
    expectedAnswer: seed.expectedAnswer,
    distractors: seed.distractors,
    gradingMode: defaultGradingMode(seed.taskType),
    payload: createFallbackPayload(seed.taskType, seed.prompt, seed.expectedAnswer, seed.distractors),
  };
}

function ensureLearnCoverage(
  tasks: LearnTaskRuntime[],
  languageCode: string,
  context: { objectiveId: string; unitId: string; lessonId: string },
): LearnTaskRuntime[] {
  const existingTypes = new Set(tasks.map((task) => task.taskType));
  const seeds = [
    ...GENERIC_COVERAGE_SEEDS,
    ...(languageCode === 'zh' ? ZH_COVERAGE_SEEDS : []),
    ...(languageCode === 'ja' ? JA_COVERAGE_SEEDS : []),
  ];

  const additions: LearnTaskRuntime[] = [];
  for (const seed of seeds) {
    if (existingTypes.has(seed.taskType)) continue;
    additions.push(
      buildSyntheticLearnTask(seed, {
        objectiveId: context.objectiveId,
        unitId: context.unitId,
        lessonId: context.lessonId,
        suffix: additions.length + 1,
      }),
    );
    existingTypes.add(seed.taskType);
  }

  return [...tasks, ...additions];
}

export async function getLessonCatalog(languageCode: string): Promise<LessonCatalogSnapshot> {
  const persistence = await initializePersistence();
  const language = await persistence.repositories.languages.getLanguageByCode(languageCode);
  if (!language) return { units: [] };

  const units = await persistence.repositories.learning.listUnitsByLanguage(language.id);
  const outputs: LessonCatalogSnapshot['units'] = [];

  for (const unit of units) {
    const lessons = await persistence.repositories.learning.listLessonsByUnit(unit.id);
    const lessonBlocks = [];
    for (const lesson of lessons) {
      const objectives = await persistence.repositories.learning.listObjectivesByLesson(lesson.id);
      lessonBlocks.push({ lesson, objectives });
    }
    outputs.push({ unit, lessons: lessonBlocks });
  }

  return { units: outputs };
}

export async function createLessonSessionRuntime(input: {
  languageCode: string;
  lessonId?: string;
  policyContext?: ExercisePolicyContext;
}): Promise<LessonSessionRuntime | null> {
  const persistence = await initializePersistence();
  const snapshot = await getLessonCatalog(input.languageCode);
  if (snapshot.units.length === 0) return null;

  const flattened = snapshot.units.flatMap((block) =>
    block.lessons.map((lessonBlock) => ({
      unit: block.unit,
      lesson: lessonBlock.lesson,
      objectives: lessonBlock.objectives,
    })),
  );

  const selected = input.lessonId
    ? flattened.find((entry) => entry.lesson.id === input.lessonId) ?? flattened[0]
    : flattened[0];

  const allTemplates: LessonTaskTemplateRecord[] = [];
  for (const objective of selected.objectives) {
    const templates = await persistence.repositories.learning.listTaskTemplatesByObjective(objective.id);
    allTemplates.push(...templates);
  }

  const runtimeTasks = await generateVariants(input.languageCode, allTemplates);
  const objectiveId = selected.objectives[0]?.id ?? 'synthetic-objective';
  const withCoverage = ensureLearnCoverage(runtimeTasks, input.languageCode, {
    objectiveId,
    unitId: selected.unit.id,
    lessonId: selected.lesson.id,
  });
  const withCoverageMedia = await Promise.all(withCoverage.map((task) => enrichTaskMedia(task, input.languageCode)));
  const policyContext: ExercisePolicyContext = input.policyContext ?? {
    languageCode: input.languageCode,
    level: 'beginner',
    difficulty: 'standard',
  };
  const policyTasks = applyLearnPolicy(withCoverageMedia, policyContext);
  return {
    unit: selected.unit,
    lesson: selected.lesson,
    objectives: selected.objectives,
    tasks: policyTasks,
  };
}

export function evaluateLearnTaskAnswer(expectedAnswer: string, learnerAnswer: string): {
  isCorrect: boolean;
  score: number;
  feedback: string;
} {
  const expected = norm(expectedAnswer);
  const actual = norm(learnerAnswer);
  if (!actual) {
    return { isCorrect: false, score: 0, feedback: 'No answer submitted.' };
  }
  if (expected === actual) {
    return { isCorrect: true, score: 100, feedback: 'Correct.' };
  }
  if (expected.includes(actual) || actual.includes(expected)) {
    return { isCorrect: true, score: 78, feedback: 'Close enough. Keep the full target form.' };
  }
  return { isCorrect: false, score: 25, feedback: `Expected: ${expectedAnswer}` };
}

function evaluateDeterministicTask(input: {
  taskType: TaskType;
  expectedAnswer: string;
  learnerAnswer: string;
  payload: Record<string, unknown>;
  structuredResponse: Record<string, unknown>;
}) {
  const { taskType, expectedAnswer, learnerAnswer, payload, structuredResponse } = input;

  if (
    taskType === 'match_word_meaning'
    || taskType === 'match_sentence_translation'
    || taskType === 'character_reading_match'
    || taskType === 'reading_character_match'
  ) {
    const pairs = Array.isArray(payload.pairs) ? payload.pairs as Array<{ left?: unknown; right?: unknown }> : [];
    const mapping = structuredResponse.mapping && typeof structuredResponse.mapping === 'object'
      ? structuredResponse.mapping as Record<string, unknown>
      : {};
    const total = pairs.filter((pair) => typeof pair.left === 'string' && typeof pair.right === 'string').length;
    if (total === 0) return evaluateLearnTaskAnswer(expectedAnswer, learnerAnswer);
    const correct = pairs.filter((pair) => typeof pair.left === 'string' && typeof pair.right === 'string' && mapping[pair.left] === pair.right).length;
    const ratio = correct / total;
    return {
      isCorrect: ratio === 1,
      score: Math.round(ratio * 100),
      feedback: ratio === 1 ? 'All pairs are correct.' : `Matched ${correct}/${total} correctly.`,
    };
  }

  if (taskType === 'group_words_topic') {
    const groups = Array.isArray(payload.groups) ? payload.groups as Array<{ name?: unknown; items?: unknown }> : [];
    const assignment = structuredResponse.assignment && typeof structuredResponse.assignment === 'object'
      ? structuredResponse.assignment as Record<string, unknown>
      : {};
    const expected = new Map<string, string>();
    groups.forEach((group) => {
      if (typeof group.name !== 'string' || !Array.isArray(group.items)) return;
      const groupName = group.name;
      group.items.forEach((item) => {
        if (typeof item === 'string') expected.set(item, groupName);
      });
    });
    if (expected.size === 0) return evaluateLearnTaskAnswer(expectedAnswer, learnerAnswer);
    let correct = 0;
    expected.forEach((groupName, item) => {
      if (assignment[item] === groupName) correct += 1;
    });
    const ratio = correct / expected.size;
    return {
      isCorrect: ratio === 1,
      score: Math.round(ratio * 100),
      feedback: ratio === 1 ? 'Grouping is correct.' : `Grouped ${correct}/${expected.size} correctly.`,
    };
  }

  if (taskType === 'reorder_sentence' || taskType === 'build_from_chunks') {
    const tokens = Array.isArray(structuredResponse.orderedTokens) ? structuredResponse.orderedTokens : [];
    const joined = tokens.map((token) => String(token)).join(' ').trim();
    return evaluateLearnTaskAnswer(expectedAnswer, joined || learnerAnswer);
  }

  if (
    taskType === 'choose_response'
    || taskType === 'choose_verb_form'
    || taskType === 'identify_context_meaning'
    || taskType === 'identify_sounds'
    || taskType === 'listen_choose_written'
    || taskType === 'greeting_response_select'
    || taskType === 'image_word_recognition'
    || taskType === 'sound_word_recognition'
    || taskType === 'radical_component_identify'
    || taskType === 'missing_character_choice'
    || taskType === 'tone_pair_identify'
    || taskType === 'kana_confusion_select'
    || taskType === 'particle_choice'
    || taskType === 'classifier_choice'
  ) {
    const selectedOption = typeof structuredResponse.selectedOption === 'string'
      ? structuredResponse.selectedOption
      : learnerAnswer;
    const expectedOption = typeof payload.correctOption === 'string' ? payload.correctOption : expectedAnswer;
    return evaluateLearnTaskAnswer(expectedOption, selectedOption);
  }

  return evaluateLearnTaskAnswer(expectedAnswer, learnerAnswer);
}

async function evaluateWithAi(input: {
  taskType: TaskType;
  expectedAnswer: string;
  learnerAnswer: string;
  payload: Record<string, unknown>;
  structuredResponse: Record<string, unknown>;
}) {
  const response = await completeWithEcho(
    [
      {
        id: `learn-grade-${Date.now()}`,
        role: 'user',
        content: `Grade a learner task submission.
Task type: ${input.taskType}
Expected answer: ${input.expectedAnswer}
Learner answer: ${input.learnerAnswer}
Payload: ${JSON.stringify(input.payload)}
Structured response: ${JSON.stringify(input.structuredResponse)}

Return JSON only:
{"isCorrect": boolean, "score": number, "feedback": "string"}`,
        createdAt: Date.now(),
      },
    ],
    'analyst',
    { maxTokens: 500, responseFormat: { type: 'json_object' } },
  );
  const parsed = parseJsonObject(response);
  const isCorrect = Boolean(parsed.isCorrect);
  const score = Number(parsed.score);
  const feedback = typeof parsed.feedback === 'string' ? parsed.feedback : isCorrect ? 'Accepted.' : `Expected: ${input.expectedAnswer}`;
  if (!Number.isFinite(score)) {
    throw new Error('Invalid score');
  }
  return {
    isCorrect,
    score: Math.max(0, Math.min(100, Math.round(score))),
    feedback,
  };
}

export async function evaluateLearnTaskSubmission(input: {
  taskType: TaskType;
  expectedAnswer: string;
  learnerAnswer: string;
  gradingMode: LearnGradingMode;
  payload?: Record<string, unknown>;
  structuredResponse?: Record<string, unknown>;
}): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  const payload = input.payload ?? {};
  const structuredResponse = input.structuredResponse ?? {};
  const deterministic = evaluateDeterministicTask({
    taskType: input.taskType,
    expectedAnswer: input.expectedAnswer,
    learnerAnswer: input.learnerAnswer,
    payload,
    structuredResponse,
  });

  const shouldUseAi = OPEN_ENDED_TASKS.has(input.taskType) && (input.gradingMode === 'ai' || input.gradingMode === 'hybrid');
  if (!shouldUseAi) return deterministic;

  try {
    return await evaluateWithAi({
      taskType: input.taskType,
      expectedAnswer: input.expectedAnswer,
      learnerAnswer: input.learnerAnswer,
      payload,
      structuredResponse,
    });
  } catch {
    return deterministic;
  }
}
