import type { NotebookEntry } from './types';

export const vocabularyItems: NotebookEntry[] = [
  { id: 'v1', term: 'de nada', translation: "you're welcome", type: 'phrase', context: '"De nada," she smiled.', notes: 'Common response to gracias', tags: ['basic', 'politeness'], createdAt: '2026-03-20', mastery: 85 },
  { id: 'v2', term: 'mercado', translation: 'market', type: 'word', context: 'Vamos al mercado por fruta.', notes: 'Both physical market and stock market', tags: ['shopping', 'places'], createdAt: '2026-03-21', mastery: 70 },
  { id: 'v3', term: '¡claro!', translation: 'of course!', type: 'phrase', context: '¡Claro que sí! — Of course!', tags: ['expressions', 'informal'], createdAt: '2026-03-22', mastery: 90 },
  { id: 'v4', term: 'sin embargo', translation: 'however / nevertheless', type: 'phrase', context: 'Es caro, sin embargo vale la pena.', tags: ['connectors', 'formal'], createdAt: '2026-03-18', mastery: 55 },
  { id: 'v5', term: 'ojalá', translation: 'hopefully / I wish', type: 'word', context: 'Ojalá que llueva mañana.', notes: 'Triggers subjunctive', tags: ['expressions', 'subjunctive'], createdAt: '2026-03-19', mastery: 45 },
  { id: 'v6', term: 'mientras tanto', translation: 'meanwhile', type: 'phrase', context: 'Mientras tanto, yo preparo la cena.', tags: ['time', 'connectors'], createdAt: '2026-03-22', mastery: 60 },
  { id: 'v7', term: 'tener que', translation: 'to have to / must', type: 'phrase', context: 'Tengo que estudiar para el examen.', tags: ['obligation', 'basic'], createdAt: '2026-03-15', mastery: 95 },
  { id: 'v8', term: 'despacio', translation: 'slowly', type: 'word', context: 'Habla más despacio, por favor.', tags: ['adverbs', 'basic'], createdAt: '2026-03-17', mastery: 80 },
  { id: 'v9', term: 'la propina', translation: 'the tip (money)', type: 'word', context: '¿Cuánto dejo de propina?', tags: ['restaurant', 'money'], createdAt: '2026-03-21', mastery: 65 },
  { id: 'v10', term: 'echar de menos', translation: 'to miss (someone/something)', type: 'phrase', context: 'Te echo de menos.', notes: 'Used in Spain. In Latin America, extrañar is more common.', tags: ['emotions', 'regional'], createdAt: '2026-03-20', mastery: 40 },
];

export const grammarNotes: NotebookEntry[] = [
  { id: 'g1', term: 'Ser vs Estar', translation: 'Two forms of "to be"', type: 'grammar', notes: 'Ser = permanent/essential. Estar = temporary/location/state.', tags: ['fundamental', 'verbs'], createdAt: '2026-03-10', mastery: 75 },
  { id: 'g2', term: 'Subjunctive Triggers', translation: 'When to use subjunctive mood', type: 'grammar', notes: 'WEIRDO: Wishes, Emotions, Impersonal, Recommendations, Doubt, Ojalá', tags: ['subjunctive', 'intermediate'], createdAt: '2026-03-18', mastery: 35 },
  { id: 'g3', term: 'Por vs Para', translation: 'Two translations of "for"', type: 'grammar', notes: 'Por = reason, exchange, through. Para = purpose, destination, deadline.', tags: ['prepositions', 'intermediate'], createdAt: '2026-03-12', mastery: 60 },
  { id: 'g4', term: 'Preterite vs Imperfect', translation: 'Past tense contrast', type: 'grammar', notes: 'Preterite = completed action. Imperfect = ongoing/habitual past.', tags: ['past-tense', 'intermediate'], createdAt: '2026-03-14', mastery: 50 },
];

export const mistakeEntries: NotebookEntry[] = [
  { id: 'm1', term: 'estoy vs soy', translation: 'Used soy when estar was needed', type: 'mistake', context: 'Said "Soy cansado" instead of "Estoy cansado"', notes: 'Remember: temporary states use estar', tags: ['ser-estar', 'common-error'], createdAt: '2026-03-22', mastery: 0 },
  { id: 'm2', term: 'Past tense selection', translation: 'Used preterite when imperfect was needed', type: 'mistake', context: 'Said "Fui feliz" instead of "Era feliz" for habitual state', tags: ['past-tense', 'common-error'], createdAt: '2026-03-21', mastery: 0 },
  { id: 'm3', term: 'Gender agreement', translation: 'Wrong article gender', type: 'mistake', context: 'Said "el problema" ✓ but said "el mapa" ✓ — these are exceptions!', notes: 'Words ending in -ma from Greek are masculine', tags: ['gender', 'exceptions'], createdAt: '2026-03-20', mastery: 0 },
];
