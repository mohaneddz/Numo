import { RepositoryError } from './errors';
import { makeId, nowIso, stringifyJson } from './utils';
import type { PersistenceContext } from './types';

interface UnitSeed {
  unitKey: string;
  title: string;
  description: string;
}

interface TaskTemplateSeed {
  taskType: string;
  instruction: string;
  promptTemplate: string;
  answerTemplate: string;
  distractors?: string[];
  gradingMode?: 'deterministic' | 'ai' | 'hybrid';
}

const UNIT_SEEDS: UnitSeed[] = [
  {
    unitKey: 'greetings_introductions',
    title: 'Greetings and Introductions',
    description: 'Start conversations politely and introduce yourself clearly.',
  },
  {
    unitKey: 'food_drink',
    title: 'Food and Drink',
    description: 'Order, describe preferences, and handle simple restaurant interactions.',
  },
  {
    unitKey: 'daily_routine',
    title: 'Daily Routine',
    description: 'Talk about habits, schedule, and everyday actions.',
  },
  {
    unitKey: 'transportation',
    title: 'Transportation',
    description: 'Ask for directions and use transport-related language confidently.',
  },
  {
    unitKey: 'shopping',
    title: 'Shopping',
    description: 'Ask about prices, quantities, and product details.',
  },
  {
    unitKey: 'family',
    title: 'Family',
    description: 'Describe family members and relationships naturally.',
  },
  {
    unitKey: 'time_dates',
    title: 'Time and Dates',
    description: 'Discuss dates, time, appointments, and sequencing.',
  },
];

const TASK_TEMPLATE_SEEDS: TaskTemplateSeed[] = [
  { taskType: 'match_word_meaning', instruction: 'Match each target word to the correct meaning.', promptTemplate: 'Match the highlighted word in this {{unitTitle}} set.', answerTemplate: 'Correct pair mapping for the target words.', distractors: ['Wrong meaning A', 'Wrong meaning B'], gradingMode: 'deterministic' },
  { taskType: 'match_sentence_translation', instruction: 'Choose the best translation for each sentence.', promptTemplate: 'Pick the best translation for this sentence from {{unitTitle}}.', answerTemplate: 'Most natural translation for the sentence.', gradingMode: 'deterministic' },
  { taskType: 'group_words_topic', instruction: 'Group words by topic and role.', promptTemplate: 'Sort these words into the right {{unitTitle}} categories.', answerTemplate: 'Correct category assignments.', gradingMode: 'deterministic' },
  { taskType: 'replace_synonym', instruction: 'Replace the highlighted word with a suitable synonym.', promptTemplate: 'Rewrite using a simpler synonym in a {{unitTitle}} context.', answerTemplate: 'Equivalent sentence using a valid synonym.' },
  { taskType: 'identify_context_meaning', instruction: 'Infer meaning from context.', promptTemplate: 'Read the context and choose what the phrase means.', answerTemplate: 'Context-appropriate interpretation.', gradingMode: 'deterministic' },
  { taskType: 'reorder_sentence', instruction: 'Reorder the chunks to form a correct sentence.', promptTemplate: 'Reorder these chunks into a valid {{unitTitle}} sentence.', answerTemplate: 'Correct sentence order.', gradingMode: 'deterministic' },
  { taskType: 'fill_missing_word', instruction: 'Fill in the missing word.', promptTemplate: 'Complete the sentence with the best missing word.', answerTemplate: 'Correct missing word.' },
  { taskType: 'finish_sentence_starter', instruction: 'Complete the starter naturally.', promptTemplate: 'Finish this sentence starter using {{unitTitle}} vocabulary.', answerTemplate: 'Natural complete sentence.' },
  { taskType: 'build_from_chunks', instruction: 'Build a sentence from given chunks.', promptTemplate: 'Build a sentence using all chunks exactly once.', answerTemplate: 'Correct sentence using the full chunk set.', gradingMode: 'deterministic' },
  { taskType: 'complete_dialogue', instruction: 'Complete the dialogue turn.', promptTemplate: 'Choose the best reply for this short dialogue.', answerTemplate: 'Most appropriate next line.' },
  { taskType: 'read_answer_questions', instruction: 'Read and answer comprehension questions.', promptTemplate: 'Read the short text and answer the question.', answerTemplate: 'Accurate short answer based on the text.' },
  { taskType: 'choose_response', instruction: 'Choose the correct conversational response.', promptTemplate: 'Select the response that best fits the situation.', answerTemplate: 'Best contextual response.', gradingMode: 'deterministic' },
  { taskType: 'choose_verb_form', instruction: 'Select the correct verb form.', promptTemplate: 'Choose the correct verb form for this sentence.', answerTemplate: 'Grammatically correct verb form.', gradingMode: 'deterministic' },
  { taskType: 'transform_statement_question', instruction: 'Transform statement to question.', promptTemplate: 'Rewrite this statement as a natural question.', answerTemplate: 'Correct question form.' },
  { taskType: 'correct_grammar', instruction: 'Find and correct grammar mistakes.', promptTemplate: 'Correct the grammar mistake in this sentence.', answerTemplate: 'Corrected sentence.' },
  { taskType: 'compare_structures', instruction: 'Choose the better structure and explain briefly.', promptTemplate: 'Compare two structures and select the natural one.', answerTemplate: 'Preferred structure with brief reason.' },
  { taskType: 'listen_repeat', instruction: 'Listen and repeat the phrase accurately.', promptTemplate: 'Repeat this target phrase clearly and naturally.', answerTemplate: 'Faithful repetition of the phrase.' },
  { taskType: 'identify_sounds', instruction: 'Identify sound differences.', promptTemplate: 'Identify whether the sound pair is same or different.', answerTemplate: 'Correct sound discrimination outcome.', gradingMode: 'deterministic' },
  { taskType: 'listen_choose_written', instruction: 'Listen and choose the correct written form.', promptTemplate: 'Choose the written form that matches the audio.', answerTemplate: 'Correct written form.', gradingMode: 'deterministic' },
  { taskType: 'explain_pronunciation_rule', instruction: 'Explain the pronunciation rule in one line.', promptTemplate: 'Explain why this word is pronounced this way.', answerTemplate: 'Short accurate pronunciation explanation.' },
  { taskType: 'greeting_response_select', instruction: 'Choose the best greeting response.', promptTemplate: 'Select the best response in this {{unitTitle}} exchange.', answerTemplate: 'Most natural response.', gradingMode: 'deterministic' },
  { taskType: 'single_slot_fill', instruction: 'Fill one missing slot with the target word.', promptTemplate: 'Complete the sentence by filling one missing slot.', answerTemplate: 'Correct slot fill.' },
  { taskType: 'image_word_recognition', instruction: 'Recognize the target word from image context.', promptTemplate: 'Choose the word that matches this image cue.', answerTemplate: 'Correct image-linked word.', gradingMode: 'deterministic' },
  { taskType: 'sound_word_recognition', instruction: 'Recognize spoken word and choose written form.', promptTemplate: 'Listen and pick the written form you hear.', answerTemplate: 'Correct sound-linked word.', gradingMode: 'deterministic' },
  { taskType: 'character_reading_match', instruction: 'Match character and reading.', promptTemplate: 'Match each character to its reading.', answerTemplate: 'Correct character-reading mapping.', gradingMode: 'deterministic' },
  { taskType: 'reading_character_match', instruction: 'Match reading and character.', promptTemplate: 'Match each reading to the correct character.', answerTemplate: 'Correct reading-character mapping.', gradingMode: 'deterministic' },
  { taskType: 'radical_component_identify', instruction: 'Identify key radical or component.', promptTemplate: 'Choose the correct radical/component for this character.', answerTemplate: 'Correct radical/component.', gradingMode: 'deterministic' },
  { taskType: 'missing_character_choice', instruction: 'Choose missing character in context.', promptTemplate: 'Pick the missing character that completes the phrase.', answerTemplate: 'Correct missing character.', gradingMode: 'deterministic' },
  { taskType: 'replace_wrong_character', instruction: 'Replace the wrong character with the correct one.', promptTemplate: 'Correct this phrase by replacing one wrong character.', answerTemplate: 'Corrected phrase.' },
  { taskType: 'tone_pair_identify', instruction: 'Identify the correct tone pair.', promptTemplate: 'Choose the option with the correct tone pattern.', answerTemplate: 'Correct tone pair.', gradingMode: 'deterministic' },
  { taskType: 'kana_confusion_select', instruction: 'Resolve kana confusion by selecting correct kana.', promptTemplate: 'Choose the correct kana among close confusions.', answerTemplate: 'Correct kana choice.', gradingMode: 'deterministic' },
  { taskType: 'particle_choice', instruction: 'Choose the correct particle for the sentence.', promptTemplate: 'Select the particle that best fits this sentence.', answerTemplate: 'Correct particle.', gradingMode: 'deterministic' },
  { taskType: 'classifier_choice', instruction: 'Choose the correct classifier.', promptTemplate: 'Select the right classifier for this noun phrase.', answerTemplate: 'Correct classifier.', gradingMode: 'deterministic' },
  { taskType: 'okurigana_fill', instruction: 'Fill missing okurigana.', promptTemplate: 'Complete the word by filling the missing okurigana.', answerTemplate: 'Correct okurigana.' },
];

const SUPPORTED_LANGUAGE_CODES = ['es', 'fr', 'de', 'zh', 'ja'] as const;

function defaultPayload(task: TaskTemplateSeed): Record<string, unknown> {
  const distractors = task.distractors ?? [];
  const options = [task.answerTemplate, ...distractors].slice(0, 4);
  if (task.taskType === 'match_word_meaning' || task.taskType === 'match_sentence_translation') {
    return {
      pairs: [
        { left: 'Item 1', right: task.answerTemplate },
        { left: 'Item 2', right: distractors[0] ?? 'Meaning 2' },
      ],
    };
  }
  if (task.taskType === 'group_words_topic') {
    return {
      groups: [
        { name: 'Category A', items: options.slice(0, 2) },
        { name: 'Category B', items: options.slice(2, 4) },
      ],
      options,
    };
  }
  if (task.taskType === 'reorder_sentence' || task.taskType === 'build_from_chunks') {
    return { tokens: task.answerTemplate.split(/\s+/).filter(Boolean) };
  }
  if (
    task.taskType === 'choose_response'
    || task.taskType === 'choose_verb_form'
    || task.taskType === 'identify_context_meaning'
    || task.taskType === 'identify_sounds'
    || task.taskType === 'listen_choose_written'
    || task.taskType === 'greeting_response_select'
    || task.taskType === 'image_word_recognition'
    || task.taskType === 'sound_word_recognition'
    || task.taskType === 'radical_component_identify'
    || task.taskType === 'missing_character_choice'
    || task.taskType === 'tone_pair_identify'
    || task.taskType === 'kana_confusion_select'
    || task.taskType === 'particle_choice'
    || task.taskType === 'classifier_choice'
  ) {
    return { options, correctOption: task.answerTemplate };
  }
  if (task.taskType === 'character_reading_match' || task.taskType === 'reading_character_match') {
    return {
      pairs: [
        { left: 'A', right: task.answerTemplate },
        { left: 'B', right: task.distractors?.[0] ?? 'Alternative' },
      ],
    };
  }
  return {
    promptText: task.promptTemplate,
    expectedText: task.answerTemplate,
    distractors,
  };
}

interface UnitKeyRow {
  unit_key: string;
}

/**
 * Seeds the starter learning plan, once per language.
 *
 * This used to delete every unit for the language and rebuild the whole tree
 * with fresh random ids on every single launch. `task_attempts` references
 * units, lessons, objectives and templates with ON DELETE SET NULL, so the
 * rows survived but every attempt older than the current session lost the
 * record of what it was an attempt at — progress history was silently
 * orphaned each time the app started.
 *
 * Units are now inserted only when their key is missing, so ids stay put and
 * attempt history stays attributable.
 */
export async function seedLearningPlan(context: PersistenceContext): Promise<void> {
  try {
    for (const languageCode of SUPPORTED_LANGUAGE_CODES) {
      const language = await context.repositories.languages.getLanguageByCode(languageCode);
      if (!language) continue;

      const existingRows = await context.db.select<UnitKeyRow>(
        'SELECT unit_key FROM learning_units WHERE language_id = ?;',
        [language.id],
      );
      const existingKeys = new Set(existingRows.map((row) => row.unit_key));

      for (let unitIndex = 0; unitIndex < UNIT_SEEDS.length; unitIndex += 1) {
        const unit = UNIT_SEEDS[unitIndex];
        if (existingKeys.has(unit.unitKey)) continue;

        const unitId = makeId('unit');
        const lessonId = makeId('lesson');
        const objectiveId = makeId('objective');
        const timestamp = nowIso();

        await context.db.execute(
          `
          INSERT INTO learning_units (
            id, language_id, unit_key, title, description, level_band, order_index, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'beginner', ?, ?, ?);
          `,
          [
            unitId,
            language.id,
            unit.unitKey,
            unit.title,
            unit.description,
            unitIndex + 1,
            timestamp,
            timestamp,
          ],
        );

        await context.db.execute(
          `
          INSERT INTO learning_lessons (
            id, language_id, unit_id, lesson_key, title, description, communication_goal, level_band,
            order_index, estimated_duration_min, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'beginner', 1, 12, ?, ?);
          `,
          [
            lessonId,
            language.id,
            unitId,
            `${unit.unitKey}_lesson_1`,
            `${unit.title}: Core Practice`,
            `Core beginner lesson for ${unit.title.toLowerCase()}.`,
            `Use ${unit.title.toLowerCase()} language in short practical interactions.`,
            timestamp,
            timestamp,
          ],
        );

        await context.db.execute(
          `
          INSERT INTO lesson_objectives (
            id, language_id, unit_id, lesson_id, objective_key, title, practical_goal,
            vocabulary_focus_json, grammar_focus_json, pronunciation_focus_json, order_index, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
          `,
          [
            objectiveId,
            language.id,
            unitId,
            lessonId,
            `${unit.unitKey}_objective_core`,
            `${unit.title} Communication Objective`,
            `Complete practical ${unit.title.toLowerCase()} tasks in real context.`,
            stringifyJson([unit.title.toLowerCase(), 'high-frequency expressions']),
            stringifyJson(['core sentence pattern', 'basic verb agreement']),
            stringifyJson(['stress and rhythm', 'clear vowel production']),
            timestamp,
            timestamp,
          ],
        );

        for (let taskIndex = 0; taskIndex < TASK_TEMPLATE_SEEDS.length; taskIndex += 1) {
          const task = TASK_TEMPLATE_SEEDS[taskIndex];
          await context.db.execute(
            `
            INSERT INTO lesson_task_templates (
              id, language_id, unit_id, lesson_id, objective_id, task_type, difficulty, instruction,
              prompt_template, answer_template, distractors_json, metadata_json, order_index, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'beginner', ?, ?, ?, ?, ?, ?, 1, ?, ?);
            `,
            [
              makeId('template'),
              language.id,
              unitId,
              lessonId,
              objectiveId,
              task.taskType,
              task.instruction,
              task.promptTemplate.replace('{{unitTitle}}', unit.title),
              task.answerTemplate,
              stringifyJson(task.distractors ?? []),
              stringifyJson({
                unitKey: unit.unitKey,
                languageCode,
                catalogTask: task.taskType,
                payload: defaultPayload(task),
                gradingMode: task.gradingMode ?? 'hybrid',
              }),
              taskIndex + 1,
              timestamp,
              timestamp,
            ],
          );
        }
      }
    }
  } catch (error) {
    throw new RepositoryError('learning', 'seedLearningPlan', error);
  }
}
