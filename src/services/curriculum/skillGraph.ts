/**
 * The skill graph is the spine of the curriculum.
 *
 * `defaultThemes.json` lists 30 themes, each with an `embeddedConceptFocus` array,
 * and `conceptCatalog.json` lists 90 global concepts in 12 categories. The two
 * files shared zero identifiers, so neither could be used to track what a learner
 * actually knows. This module turns the 120 theme focus tokens into addressable
 * *skills*, gives each one a kind and a catalog category, and exposes the ordering
 * and prerequisite information the planner needs.
 *
 * A skill is the unit of mastery: everything the learner does is attributed to one
 * or more skills, and everything the planner schedules is chosen by skill.
 */

import conceptCatalog from '../../data/main/conceptCatalog.json';
import defaultThemes from '../../data/main/defaultThemes.json';

/**
 * What kind of practice a skill responds to. This is the single most important
 * input to exercise selection: a pronunciation skill must not be drilled with a
 * silent multiple-choice question, and a vocabulary skill should not be assessed
 * with a free-writing prompt.
 */
export type SkillKind = 'sound' | 'script' | 'vocabulary' | 'grammar' | 'function' | 'discourse';

export type SkillCategory = (typeof conceptCatalog.categories)[number]['id'];

export interface Skill {
  id: string;
  title: string;
  kind: SkillKind;
  category: SkillCategory;
  /** Themes this skill appears in, by theme id. Skills can be shared across themes. */
  themeIds: string[];
  /** 1-based order of the earliest theme that introduces this skill. */
  introducedAtTheme: number;
  /** 1 (easiest) to 5, derived from introduction order. Drives task difficulty. */
  difficulty: number;
}

export interface Theme {
  id: string;
  order: number;
  phase: string;
  title: string;
  shortDescription: string;
  /** Designed session count range for this theme, from the theme data. */
  coreSessionRange: [number, number];
  everdarkEnabled: boolean;
  skillIds: string[];
}

interface SkillDefinition {
  kind: SkillKind;
  category: SkillCategory;
}

/**
 * Explicit classification for every focus token in `defaultThemes.json`.
 * Kept as data rather than inferred from the token name so that a rename in the
 * theme file surfaces as a build error instead of silently reclassifying a skill.
 */
const SKILL_DEFINITIONS: Record<string, SkillDefinition> = {
  // Theme 1 — Starter Survival
  pronunciation_basics: { kind: 'sound', category: 'sound_system' },
  yes_no: { kind: 'function', category: 'communication_functions' },
  politeness: { kind: 'function', category: 'meaning_register_and_usage' },
  simple_recognition: { kind: 'vocabulary', category: 'thematic_language' },

  // Theme 2 — Greetings & Introductions
  self_introduction: { kind: 'function', category: 'communication_functions' },
  basic_questions: { kind: 'grammar', category: 'sentence_architecture' },
  name_forms: { kind: 'vocabulary', category: 'nominal_system' },
  courtesy_patterns: { kind: 'function', category: 'meaning_register_and_usage' },

  // Theme 3 — People & Identity
  pronouns: { kind: 'grammar', category: 'nominal_system' },
  identity_statements: { kind: 'grammar', category: 'sentence_architecture' },
  age: { kind: 'vocabulary', category: 'thematic_language' },
  nationality: { kind: 'vocabulary', category: 'thematic_language' },
  languages: { kind: 'vocabulary', category: 'thematic_language' },

  // Theme 4 — Questions & Requests
  question_words: { kind: 'grammar', category: 'sentence_architecture' },
  request_patterns: { kind: 'function', category: 'communication_functions' },
  need_want: { kind: 'grammar', category: 'verbal_system' },
  negation_basics: { kind: 'grammar', category: 'sentence_architecture' },

  // Theme 5 — Daily Actions & Objects
  common_verbs: { kind: 'vocabulary', category: 'verbal_system' },
  object_words: { kind: 'vocabulary', category: 'nominal_system' },
  simple_commands: { kind: 'grammar', category: 'verbal_system' },
  basic_sentence_order: { kind: 'grammar', category: 'sentence_architecture' },

  // Theme 6 — Home & Daily Routine
  routine_patterns: { kind: 'grammar', category: 'verbal_system' },
  time_frequency: { kind: 'vocabulary', category: 'discourse_and_fluency' },
  possession_basics: { kind: 'grammar', category: 'nominal_system' },
  ongoing_actions: { kind: 'grammar', category: 'verbal_system' },

  // Theme 7 — Family & Relationships
  kinship_terms: { kind: 'vocabulary', category: 'thematic_language' },
  possessives: { kind: 'grammar', category: 'nominal_system' },
  describing_people: { kind: 'function', category: 'communication_functions' },
  simple_comparisons: { kind: 'grammar', category: 'sentence_architecture' },

  // Theme 8 — Food & Drink
  preferences: { kind: 'function', category: 'communication_functions' },
  quantities: { kind: 'vocabulary', category: 'word_formation' },
  ordering_patterns: { kind: 'function', category: 'communication_functions' },
  countable_usage: { kind: 'grammar', category: 'nominal_system' },

  // Theme 9 — Shopping & Money
  numbers: { kind: 'vocabulary', category: 'nominal_system' },
  currency: { kind: 'vocabulary', category: 'thematic_language' },
  price_questions: { kind: 'function', category: 'communication_functions' },
  quantity_patterns: { kind: 'grammar', category: 'word_formation' },

  // Theme 10 — Time, Dates & Planning
  clock_time: { kind: 'vocabulary', category: 'thematic_language' },
  calendar_terms: { kind: 'vocabulary', category: 'thematic_language' },
  future_intent_basics: { kind: 'grammar', category: 'verbal_system' },
  sequencing: { kind: 'discourse', category: 'discourse_and_fluency' },

  // Theme 11 — Places & Directions
  location_words: { kind: 'vocabulary', category: 'function_words_and_particles' },
  movement_verbs: { kind: 'vocabulary', category: 'verbal_system' },
  prepositions_or_particles: { kind: 'grammar', category: 'function_words_and_particles' },
  imperatives: { kind: 'grammar', category: 'verbal_system' },

  // Theme 12 — Travel & Transport
  destination_patterns: { kind: 'grammar', category: 'sentence_architecture' },
  movement_direction: { kind: 'grammar', category: 'function_words_and_particles' },
  travel_requests: { kind: 'function', category: 'communication_functions' },
  time_planning: { kind: 'function', category: 'communication_functions' },

  // Theme 13 — Health & Body
  state_descriptions: { kind: 'grammar', category: 'sentence_architecture' },
  pain_expressions: { kind: 'vocabulary', category: 'thematic_language' },
  necessity: { kind: 'grammar', category: 'verbal_system' },
  help_seeking: { kind: 'function', category: 'communication_functions' },

  // Theme 14 — Weather & Nature
  descriptive_adjectives: { kind: 'vocabulary', category: 'nominal_system' },
  condition_statements: { kind: 'grammar', category: 'sentence_architecture' },
  time_seasons: { kind: 'vocabulary', category: 'thematic_language' },
  comparisons: { kind: 'grammar', category: 'sentence_architecture' },

  // Theme 15 — Technology & Digital Life
  tech_verbs: { kind: 'vocabulary', category: 'thematic_language' },
  instruction_patterns: { kind: 'grammar', category: 'verbal_system' },
  problem_reporting: { kind: 'function', category: 'communication_functions' },
  modern_everyday_vocab: { kind: 'vocabulary', category: 'thematic_language' },

  // Theme 16 — School & Learning
  learning_verbs: { kind: 'vocabulary', category: 'verbal_system' },
  clarification_requests: { kind: 'function', category: 'communication_functions' },
  instruction_following: { kind: 'function', category: 'communication_functions' },
  ability_patterns: { kind: 'grammar', category: 'verbal_system' },

  // Theme 17 — Work & Career
  responsibility_patterns: { kind: 'grammar', category: 'verbal_system' },
  formal_register_basics: { kind: 'function', category: 'meaning_register_and_usage' },
  scheduling: { kind: 'function', category: 'communication_functions' },
  task_language: { kind: 'vocabulary', category: 'thematic_language' },

  // Theme 18 — Social Life & Small Talk
  social_register: { kind: 'function', category: 'meaning_register_and_usage' },
  invitation_patterns: { kind: 'function', category: 'communication_functions' },
  conversation_fillers: { kind: 'discourse', category: 'discourse_and_fluency' },
  politeness_expansion: { kind: 'function', category: 'meaning_register_and_usage' },

  // Theme 19 — Hobbies & Entertainment
  preference_patterns: { kind: 'grammar', category: 'sentence_architecture' },
  frequency: { kind: 'vocabulary', category: 'discourse_and_fluency' },
  ability: { kind: 'grammar', category: 'verbal_system' },
  sharing_opinions: { kind: 'function', category: 'communication_functions' },

  // Theme 20 — Emotions, Preferences & Opinions
  emotion_words: { kind: 'vocabulary', category: 'thematic_language' },
  subjective_language: { kind: 'function', category: 'meaning_register_and_usage' },
  reasons_basics: { kind: 'discourse', category: 'discourse_and_fluency' },
  intensity: { kind: 'grammar', category: 'function_words_and_particles' },

  // Theme 21 — Describing People, Things & Situations
  adjectives: { kind: 'grammar', category: 'nominal_system' },
  comparison_patterns: { kind: 'grammar', category: 'sentence_architecture' },
  degree: { kind: 'grammar', category: 'function_words_and_particles' },
  relative_detail: { kind: 'grammar', category: 'sentence_architecture' },

  // Theme 22 — Past Events & Experiences
  past_reference: { kind: 'grammar', category: 'verbal_system' },
  completed_actions: { kind: 'grammar', category: 'verbal_system' },
  time_markers: { kind: 'vocabulary', category: 'discourse_and_fluency' },
  sequence_of_events: { kind: 'discourse', category: 'discourse_and_fluency' },

  // Theme 23 — Future Plans & Intentions
  future_reference: { kind: 'grammar', category: 'verbal_system' },
  intentions: { kind: 'function', category: 'communication_functions' },
  planning_patterns: { kind: 'function', category: 'communication_functions' },
  conditional_basics: { kind: 'grammar', category: 'verbal_system' },

  // Theme 24 — Problems & Emergencies
  urgency: { kind: 'function', category: 'meaning_register_and_usage' },
  requests_for_help: { kind: 'function', category: 'communication_functions' },
  clear_instruction_language: { kind: 'discourse', category: 'discourse_and_fluency' },

  // Theme 25 — Services & Administration
  formal_requests: { kind: 'function', category: 'meaning_register_and_usage' },
  document_language: { kind: 'vocabulary', category: 'thematic_language' },
  institution_interaction: { kind: 'function', category: 'communication_functions' },
  confirmation_patterns: { kind: 'function', category: 'communication_functions' },

  // Theme 26 — Culture & Traditions
  cultural_context: { kind: 'vocabulary', category: 'thematic_language' },
  social_norms: { kind: 'function', category: 'meaning_register_and_usage' },
  register_sensitivity: { kind: 'function', category: 'meaning_register_and_usage' },
  contextual_vocab: { kind: 'vocabulary', category: 'thematic_language' },

  // Theme 27 — Storytelling & Narration
  narrative_sequence: { kind: 'discourse', category: 'discourse_and_fluency' },
  linking_words: { kind: 'grammar', category: 'function_words_and_particles' },
  scene_description: { kind: 'function', category: 'communication_functions' },
  retelling: { kind: 'discourse', category: 'discourse_and_fluency' },

  // Theme 28 — Explaining, Comparing & Reasoning
  because_but_if: { kind: 'grammar', category: 'sentence_architecture' },
  comparison: { kind: 'function', category: 'communication_functions' },
  cause_effect: { kind: 'discourse', category: 'discourse_and_fluency' },
  structured_explanations: { kind: 'discourse', category: 'discourse_and_fluency' },

  // Theme 29 — Discussion, Persuasion & Nuance
  argument_patterns: { kind: 'discourse', category: 'discourse_and_fluency' },
  softening: { kind: 'function', category: 'meaning_register_and_usage' },
  nuance_markers: { kind: 'function', category: 'meaning_register_and_usage' },
  positioning_opinions: { kind: 'discourse', category: 'discourse_and_fluency' },

  // Theme 30 — Real-World Fluency
  mixed_registers: { kind: 'function', category: 'meaning_register_and_usage' },
  repair_strategies: { kind: 'discourse', category: 'discourse_and_fluency' },
  natural_flow: { kind: 'discourse', category: 'discourse_and_fluency' },
  open_world_application: { kind: 'function', category: 'communication_functions' },
};

/**
 * Script skills are injected per language rather than coming from the theme file,
 * because only some languages need them. They are appended to the early themes of
 * the languages that use a non-Latin writing system.
 */
const SCRIPT_SKILLS: Record<string, SkillDefinition> = {
  script_recognition: { kind: 'script', category: 'writing_system' },
  stroke_order: { kind: 'script', category: 'writing_system' },
  character_components: { kind: 'script', category: 'writing_system' },
  reading_pronunciation_link: { kind: 'script', category: 'writing_system' },
};

/** Languages whose learners need explicit script instruction. */
const NON_LATIN_SCRIPT_LANGUAGES = new Set([
  'zh', 'ja', 'ko', 'ar', 'he', 'ru', 'uk', 'el', 'hi', 'bn', 'ta', 'th', 'fa', 'ur', 'am', 'ka', 'hy',
]);

function titleize(token: string): string {
  return token
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Maps 1..30 theme order onto a 1..5 difficulty band. */
function difficultyForThemeOrder(order: number): number {
  return Math.min(5, Math.max(1, Math.ceil(order / 6)));
}

function buildGraph() {
  const skills = new Map<string, Skill>();
  const themes: Theme[] = [];

  for (const unit of defaultThemes.units) {
    const skillIds: string[] = [];

    for (const token of unit.embeddedConceptFocus) {
      const definition = SKILL_DEFINITIONS[token];
      if (!definition) {
        // A theme token with no classification would be untrackable. Fail loudly
        // in development rather than silently dropping it from the curriculum.
        throw new Error(
          `skillGraph: theme "${unit.id}" references unclassified focus token "${token}". ` +
            'Add it to SKILL_DEFINITIONS.',
        );
      }

      const existing = skills.get(token);
      if (existing) {
        existing.themeIds.push(unit.id);
      } else {
        skills.set(token, {
          id: token,
          title: titleize(token),
          kind: definition.kind,
          category: definition.category,
          themeIds: [unit.id],
          introducedAtTheme: unit.order,
          difficulty: difficultyForThemeOrder(unit.order),
        });
      }
      skillIds.push(token);
    }

    themes.push({
      id: unit.id,
      order: unit.order,
      phase: unit.phase,
      title: unit.title,
      shortDescription: unit.shortDescription,
      coreSessionRange: unit.coreSessionRange as [number, number],
      everdarkEnabled: unit.everdarkEnabled,
      skillIds,
    });
  }

  for (const [token, definition] of Object.entries(SCRIPT_SKILLS)) {
    skills.set(token, {
      id: token,
      title: titleize(token),
      kind: definition.kind,
      category: definition.category,
      themeIds: [],
      introducedAtTheme: 1,
      difficulty: 1,
    });
  }

  return { skills, themes };
}

const GRAPH = buildGraph();

export const THEMES: readonly Theme[] = GRAPH.themes;

export const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(
  conceptCatalog.categories.map((category) => [category.id, category.title]),
);

export function getSkill(skillId: string): Skill | null {
  return GRAPH.skills.get(skillId) ?? null;
}

export function listSkills(): Skill[] {
  return [...GRAPH.skills.values()];
}

export function getTheme(themeId: string): Theme | null {
  return GRAPH.themes.find((theme) => theme.id === themeId) ?? null;
}

export function getThemeByOrder(order: number): Theme | null {
  return GRAPH.themes.find((theme) => theme.order === order) ?? null;
}

export function requiresScriptSkills(languageCode: string): boolean {
  return NON_LATIN_SCRIPT_LANGUAGES.has(languageCode);
}

/**
 * Skills taught by a theme for a given language. Script skills are woven into the
 * first themes of non-Latin languages so the learner meets the writing system
 * alongside their first useful phrases rather than as a separate track.
 */
export function getThemeSkills(themeId: string, languageCode: string): Skill[] {
  const theme = getTheme(themeId);
  if (!theme) return [];

  const base = theme.skillIds
    .map((id) => getSkill(id))
    .filter((skill): skill is Skill => Boolean(skill));

  if (!requiresScriptSkills(languageCode) || theme.order > 6) return base;

  // Introduce one script skill per early theme, in order.
  const scriptIds = Object.keys(SCRIPT_SKILLS);
  const scriptSkill = getSkill(scriptIds[(theme.order - 1) % scriptIds.length]);
  return scriptSkill ? [...base, scriptSkill] : base;
}

/**
 * Skills a learner should already have met before starting a theme: everything
 * introduced by earlier themes. Used to interleave review and to decide whether a
 * skill counts as "new" for the learner.
 */
export function getPriorSkills(themeId: string, languageCode: string): Skill[] {
  const theme = getTheme(themeId);
  if (!theme) return [];
  return GRAPH.themes
    .filter((candidate) => candidate.order < theme.order)
    .flatMap((candidate) => getThemeSkills(candidate.id, languageCode));
}

/** Groups skills by their catalog category, for progress rollups. */
export function groupSkillsByCategory(skills: Skill[]): Map<SkillCategory, Skill[]> {
  const grouped = new Map<SkillCategory, Skill[]>();
  for (const skill of skills) {
    const bucket = grouped.get(skill.category);
    if (bucket) bucket.push(skill);
    else grouped.set(skill.category, [skill]);
  }
  return grouped;
}
