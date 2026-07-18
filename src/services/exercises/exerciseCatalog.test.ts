import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG, getExerciseCategories, getExercisesByCategory } from './exerciseCatalog';

describe('exerciseCatalog', () => {
  it('matches the exact user-facing exercise list and order', () => {
    const labels = EXERCISE_CATALOG.map((entry) => entry.displayName);
    expect(labels).toEqual([
      'Multiple Choice',
      'True / False',
      'Best Response',
      'Image Choice',
      'Audio Choice',
      'Matching',
      'Word ? Meaning Match',
      'Sentence ? Translation Match',
      'Audio ? Text Match',
      'Image ? Word Match',
      'Group by Topic',
      'Sort by Grammar',
      'Sort by Meaning',
      'Sort by Register',
      'Phrase Assembly',
      'Sentence Reordering',
      'Dialogue Ordering',
      'Fill in the Blank',
      'Cloze Passage',
      'Finish Sentence',
      'Complete Dialogue',
      'Replace with Synonym',
      'Statement ? Question',
      'Verb / Form Change',
      'Grammar Correction',
      'Paraphrase',
      'Translate to Target Language',
      'Translate to Native Language',
      'Flashcard Reveal',
      'Typed Recall',
      'Build Recall',
      'Dictation Recall',
      'Read and Answer',
      'Meaning in Context',
      'Main Idea',
      'Detail Finding',
      'Listen and Choose',
      'Listen and Type',
      'Sound Identification',
      'Pronunciation Rule',
      'Guided Repeat',
      'Read Aloud',
      'Shadowing',
      'Picture Response',
      'Open Spoken Answer',
      'Guided Sentence Writing',
      'Short Composition',
      'Free Composition',
      'Roleplay',
      'Branching Dialogue',
      'Goal-Based Chat',
      'Stroke Order',
      'Trace',
      'Guided Draw',
      'Free Draw',
      'Timed Recall Draw',
      'Mixed Review',
      'Weak-Point Review',
      'Timed Review',
      'Cumulative Review',
    ]);
  });

  it('has stable category grouping and no duplicate keys', () => {
    const categories = getExerciseCategories();
    expect(categories).toEqual([
      'Selection',
      'Matching',
      'Sorting',
      'Ordering',
      'Completion',
      'Transformation',
      'Translation',
      'Recall',
      'Reading',
      'Listening',
      'Speaking',
      'Writing',
      'Conversation',
      'Script',
      'Review',
    ]);

    const keys = EXERCISE_CATALOG.map((entry) => entry.userKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain('greeting_response');
    expect(keys).not.toContain('context_meaning');
    expect(keys).not.toContain('tfj');

    const selection = getExercisesByCategory('Selection').map((entry) => entry.displayName);
    expect(selection).toEqual(['Multiple Choice', 'True / False', 'Best Response', 'Image Choice', 'Audio Choice']);
  });
});
