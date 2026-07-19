export type ImmersionKind = 'video' | 'reading' | 'audio';

export interface TranscriptLine {
  id: string;
  start: number;
  time: string;
  source: string;
  translation: string;
  explanation: string;
  vocabulary: Array<{ term: string; meaning: string }>;
}

export interface ReadingLine {
  id: string;
  source: string;
  translation: string;
}

export interface ImmersionResource {
  id: string;
  kind: ImmersionKind;
  category: string;
  title: string;
  subtitle: string;
  level: string;
  duration: string;
  accent: string;
  progress: number;
  tags: string[];
  author?: string;
  publicationYear?: number;
  sourceLabel?: string;
  sourceUrl?: string;
  localPath?: string;
  localFormat?: 'epub' | 'txt';
}

const makeResources = (
  kind: ImmersionKind,
  category: string,
  accent: string,
  items: Array<[string, string, string, string, number]>,
): ImmersionResource[] =>
  items.map(([title, subtitle, level, duration, progress], index) => ({
    id: `${kind}-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index + 1}`,
    kind,
    category,
    title,
    subtitle,
    level,
    duration,
    accent,
    progress,
    tags: category.split(/\s|&/).filter(Boolean),
  }));

const realReadingSeeds: Array<[string, string, string, number, string, string, string, string]> = [
  ['don-quijote', 'Don Quijote de la Mancha', 'Miguel de Cervantes', 1605, 'Classic Novels', 'C1', '18h', 'The foundational Spanish novel: idealism, friendship, and the stories people tell themselves.'],
  ['lazarillo-de-tormes', 'Lazarillo de Tormes', 'Anonymous', 1554, 'Classic Novels', 'B2', '3h 20m', 'A sharp picaresque account of survival and social hypocrisy in sixteenth-century Spain.'],
  ['la-regenta', 'La Regenta', 'Leopoldo Alas “Clarín”', 1884, 'Classic Novels', 'C1', '16h', 'A psychologically rich portrait of provincial life, reputation, and frustrated desire.'],
  ['fortunata-y-jacinta', 'Fortunata y Jacinta', 'Benito Pérez Galdós', 1887, 'Classic Novels', 'C1', '19h', 'Two women and one complicated social world in nineteenth-century Madrid.'],
  ['marianela', 'Marianela', 'Benito Pérez Galdós', 1878, 'Classic Novels', 'B2', '4h 30m', 'A moving novel about perception, beauty, class, and unreturned devotion.'],
  ['niebla', 'Niebla', 'Miguel de Unamuno', 1914, 'Classic Novels', 'C1', '5h 10m', 'A playful philosophical novel whose protagonist confronts his own author.'],
  ['rimas-y-leyendas', 'Rimas y leyendas', 'Gustavo Adolfo Bécquer', 1871, 'Stories & Poetry', 'B2', '4h', 'Romantic poems and supernatural legends written in vivid, musical Spanish.'],
  ['cuentos-de-la-selva', 'Cuentos de la selva', 'Horacio Quiroga', 1918, 'Stories & Poetry', 'B1', '2h 20m', 'Memorable jungle stories combining danger, tenderness, and the natural world.'],
  ['tradiciones-peruanas', 'Tradiciones peruanas', 'Ricardo Palma', 1872, 'Stories & Poetry', 'C1', '8h', 'Historical anecdotes that blend archival detail, humor, and popular storytelling.'],
  ['el-conde-lucanor', 'El Conde Lucanor', 'Don Juan Manuel', 1335, 'Stories & Poetry', 'C1', '6h', 'Moral tales framed as advice between a nobleman and his counselor.'],
  ['martin-fierro', 'El gaucho Martín Fierro', 'José Hernández', 1872, 'Stories & Poetry', 'C1', '3h 40m', 'Argentina’s landmark narrative poem about freedom, injustice, and gaucho life.'],
  ['azul', 'Azul…', 'Rubén Darío', 1888, 'Stories & Poetry', 'C1', '3h', 'Modernist stories and poems that transformed literary Spanish.'],
  ['la-vida-es-sueno', 'La vida es sueño', 'Pedro Calderón de la Barca', 1635, 'Plays & Ideas', 'C1', '2h 45m', 'A philosophical drama about freedom, destiny, power, and the instability of reality.'],
  ['fuenteovejuna', 'Fuenteovejuna', 'Lope de Vega', 1619, 'Plays & Ideas', 'B2', '2h 10m', 'A community stands together against abuse in one of Spain’s essential plays.'],
  ['el-si-de-las-ninas', 'El sí de las niñas', 'Leandro Fernández de Moratín', 1806, 'Plays & Ideas', 'B2', '2h', 'A comedy criticizing forced marriage and defending honest communication.'],
  ['facundo', 'Facundo', 'Domingo F. Sarmiento', 1845, 'Plays & Ideas', 'C1', '9h', 'A foundational argument about politics, geography, civilization, and power in Argentina.'],
  ['maria', 'María', 'Jorge Isaacs', 1867, 'Plays & Ideas', 'B2', '7h', 'A Colombian romantic novel remembered for its landscape and emotional intensity.'],
  ['pepita-jimenez', 'Pepita Jiménez', 'Juan Valera', 1874, 'Plays & Ideas', 'B2', '5h', 'An epistolary novel about vocation, self-knowledge, and unexpected love.'],
];

const realReadingResources: ImmersionResource[] = realReadingSeeds.map(
  ([slug, title, author, publicationYear, category, level, duration, subtitle], index) => ({
  id: `reading-${slug}`,
  kind: 'reading',
  category,
  title,
  author,
  publicationYear,
  subtitle,
  level,
  duration,
  accent: index % 3 === 0
    ? 'from-emerald-500/40 via-teal-700/25 to-[#0B1020]'
    : index % 3 === 1
      ? 'from-indigo-500/40 via-blue-700/25 to-[#0B1020]'
      : 'from-amber-500/40 via-orange-800/25 to-[#0B1020]',
  progress: index === 0 ? 12 : 0,
  tags: [category, 'Public domain', 'Spanish literature'],
  sourceLabel: 'Project Gutenberg',
  sourceUrl: `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(`${title} ${author}`)}`,
  }),
);

const realAudioSeeds: Array<[string, string, string, string, string, string, string]> = [
  ['radio-ambulante', 'Radio Ambulante', 'NPR', 'Narrative Podcasts', 'B2', '35 min', 'Award-winning stories from across Latin America.'],
  ['duolingo-spanish-podcast', 'Duolingo Spanish Podcast', 'Duolingo', 'Narrative Podcasts', 'B1', '24 min', 'True stories told in intermediate Spanish with English context.'],
  ['hoy-hablamos', 'Hoy Hablamos', 'Hoy Hablamos', 'Narrative Podcasts', 'B1', '18 min', 'Natural conversations about daily life, culture, and current topics.'],
  ['easy-spanish-podcast', 'Easy Spanish Podcast', 'Easy Languages', 'Narrative Podcasts', 'B1', '26 min', 'Real conversations with speakers from across the Spanish-speaking world.'],
  ['espanol-automatico', 'Español Automático', 'Karo Martínez', 'Narrative Podcasts', 'B2', '22 min', 'Fluency-focused listening about natural expressions and learning habits.'],
  ['no-hay-tos', 'No Hay Tos', 'Roberto Andrade & Héctor Libreros', 'Narrative Podcasts', 'B2', '31 min', 'Mexican Spanish, expressions, culture, and unscripted conversation.'],
  ['don-quijote-audio', 'Don Quijote de la Mancha', 'Miguel de Cervantes', 'Public-Domain Audiobooks', 'C1', '36h', 'A public-domain Spanish reading of Cervantes’s landmark novel.'],
  ['lazarillo-audio', 'Lazarillo de Tormes', 'Anonymous', 'Public-Domain Audiobooks', 'B2', '3h 20m', 'The anonymous picaresque classic in an unabridged Spanish recording.'],
  ['cuentos-selva-audio', 'Cuentos de la selva', 'Horacio Quiroga', 'Public-Domain Audiobooks', 'B1', '2h 30m', 'Horacio Quiroga’s jungle stories read in Spanish.'],
  ['vida-sueno-audio', 'La vida es sueño', 'Pedro Calderón de la Barca', 'Public-Domain Audiobooks', 'C1', '2h 45m', 'Calderón de la Barca’s philosophical drama in audio form.'],
  ['marianela-audio', 'Marianela', 'Benito Pérez Galdós', 'Public-Domain Audiobooks', 'B2', '4h 40m', 'Galdós’s moving novel presented as a Spanish public-domain audiobook.'],
  ['rimas-leyendas-audio', 'Rimas y leyendas', 'Gustavo Adolfo Bécquer', 'Public-Domain Audiobooks', 'B2', '4h', 'Selected poems and legends by Gustavo Adolfo Bécquer.'],
  ['el-hilo', 'El hilo', 'Radio Ambulante Studios', 'Ideas & Interviews', 'B2', '38 min', 'A weekly documentary podcast explaining one major Latin American story.'],
  ['las-raras', 'Las Raras', 'Catalina May & Martín Cruz', 'Ideas & Interviews', 'C1', '32 min', 'Independent sound-rich nonfiction stories from Latin America.'],
  ['entiende-tu-mente', 'Entiende Tu Mente', 'Spotify Studios', 'Ideas & Interviews', 'B1', '20 min', 'Short conversations about psychology and everyday emotional life.'],
  ['ted-espanol', 'TED en Español', 'TED', 'Ideas & Interviews', 'B2', '28 min', 'Ideas and interviews from thinkers across the Spanish-speaking world.'],
  ['nomadas-rne', 'Nómadas', 'Radio Nacional de España', 'Ideas & Interviews', 'B2', '55 min', 'Immersive radio journeys through cities, landscapes, and cultures.'],
  ['documentos-rne', 'Documentos RNE', 'Radio Nacional de España', 'Ideas & Interviews', 'C1', '54 min', 'Long-form historical and cultural radio documentaries.'],
];

const realAudioResources: ImmersionResource[] = realAudioSeeds.map(
  ([slug, title, author, category, level, duration, subtitle], index) => ({
    id: `audio-${slug}`,
    kind: 'audio',
    category,
    title,
    author,
    subtitle,
    level,
    duration,
    accent: index % 3 === 0
      ? 'from-violet-500/45 via-indigo-700/25 to-[#0B1020]'
      : index % 3 === 1
        ? 'from-pink-500/40 via-purple-700/25 to-[#0B1020]'
        : 'from-orange-400/40 via-rose-700/20 to-[#0B1020]',
    progress: index === 0 ? 38 : 0,
    tags: [category, 'Spanish audio'],
    sourceLabel: category === 'Public-Domain Audiobooks' ? 'LibriVox' : 'Apple Podcasts',
    sourceUrl: category === 'Public-Domain Audiobooks'
      ? `https://librivox.org/search?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&status=all&project_type=either&recorded_language=es&sort_order=catalog_date&search_page=1&search_form=advanced`
      : `https://podcasts.apple.com/us/search?term=${encodeURIComponent(title)}`,
  }),
);

export const immersionResources: ImmersionResource[] = [
  ...makeResources('video', 'Documentaries', 'from-cyan-500/45 via-blue-600/25 to-[#0B1020]', [
    ['The City Beneath the City', 'A guided look at forgotten tunnels and the people preserving them.', 'B1', '18 min', 34],
    ['A River Returns', 'How one community brought life back to its river.', 'A2', '12 min', 0],
    ['Night Trains of Europe', 'A quiet journey across borders after sunset.', 'B1', '24 min', 0],
    ['The Last Traditional Bakery', 'Three generations keeping a neighborhood ritual alive.', 'A2', '14 min', 72],
    ['Inside the Weather Station', 'Scientists explain how local forecasts are made.', 'B2', '21 min', 0],
    ['Living with the Desert', 'Daily routines in one of the driest regions on Earth.', 'B1', '16 min', 0],
  ]),
  ...makeResources('video', 'Drama Series', 'from-fuchsia-500/45 via-violet-600/25 to-[#0B1020]', [
    ['The Apartment Upstairs', 'A missing key brings four neighbors together.', 'A2', '22 min', 48],
    ['Second Platform', 'Two strangers keep meeting at the same train station.', 'B1', '26 min', 0],
    ['Sunday Lunch', 'A family announcement changes the whole afternoon.', 'B1', '19 min', 0],
    ['The New Colleague', 'A first day at work full of small misunderstandings.', 'A2', '17 min', 0],
    ['Letters from April', 'Old letters reveal a friendship nobody knew about.', 'B2', '31 min', 0],
    ['Room for One More', 'A shared house tries to choose its newest resident.', 'B1', '23 min', 0],
  ]),
  ...makeResources('video', 'Travel & Culture', 'from-amber-400/45 via-orange-600/25 to-[#0B1020]', [
    ['Breakfast Across the Coast', 'Five cities, five mornings, five local traditions.', 'A2', '15 min', 0],
    ['A Weekend in Seville', 'Markets, neighborhoods, and conversations with locals.', 'A2', '13 min', 10],
    ['Why This Festival Matters', 'Residents tell the story behind their annual celebration.', 'B1', '20 min', 0],
    ['The Etiquette of Coffee', 'How ordering and sharing coffee changes by region.', 'B1', '11 min', 0],
    ['Small Museums, Big Stories', 'Unexpected collections and their passionate curators.', 'B2', '27 min', 0],
    ['On Foot Through the Old Town', 'A language-rich walking tour through local history.', 'A2', '16 min', 0],
  ]),
  ...makeResources('video', 'Short Films', 'from-rose-500/45 via-red-700/20 to-[#0B1020]', [
    ['The Blue Umbrella', 'A tiny decision changes a rainy afternoon.', 'A2', '8 min', 0],
    ['Five Minutes Late', 'A missed bus creates an unexpected opportunity.', 'B1', '11 min', 0],
    ['The Quiet Table', 'Two people communicate without saying what they mean.', 'B2', '14 min', 0],
    ['Borrowed Shoes', 'A comic story about identity and first impressions.', 'B1', '10 min', 0],
    ['One Last Photograph', 'A photographer returns to an important place.', 'B2', '16 min', 0],
    ['The Window Seat', 'A child invents stories about passing strangers.', 'A2', '9 min', 0],
  ]),
  ...realReadingResources,
  ...realAudioResources,
];

export const demoTranscript: TranscriptLine[] = [
  {
    id: 'line-1',
    start: 0,
    time: '0:00',
    source: 'Esta ciudad parece tranquila, pero debajo de nosotros existe otro mundo.',
    translation: 'This city seems quiet, but beneath us another world exists.',
    explanation: '“Debajo de nosotros” expresses physical position: “beneath us.” The sentence contrasts appearance with a hidden reality.',
    vocabulary: [
      { term: 'parece', meaning: 'seems / appears' },
      { term: 'debajo de', meaning: 'under / beneath' },
    ],
  },
  {
    id: 'line-2',
    start: 7,
    time: '0:07',
    source: 'Durante siglos, estos túneles llevaron agua a todos los barrios.',
    translation: 'For centuries, these tunnels carried water to every neighborhood.',
    explanation: 'The preterite “llevaron” presents the tunnels’ historical function as a completed period.',
    vocabulary: [
      { term: 'durante siglos', meaning: 'for centuries' },
      { term: 'barrios', meaning: 'neighborhoods' },
    ],
  },
  {
    id: 'line-3',
    start: 15,
    time: '0:15',
    source: 'Hoy, un pequeño equipo trabaja para conservarlos.',
    translation: 'Today, a small team works to preserve them.',
    explanation: 'The object pronoun “los” refers back to “los túneles.” It attaches to the infinitive “conservar.”',
    vocabulary: [
      { term: 'equipo', meaning: 'team' },
      { term: 'conservar', meaning: 'to preserve' },
    ],
  },
  {
    id: 'line-4',
    start: 23,
    time: '0:23',
    source: 'No es un trabajo fácil: la humedad cambia cada día.',
    translation: 'It is not easy work: the humidity changes every day.',
    explanation: '“No es un trabajo fácil” uses a noun phrase where English often uses “It isn’t easy work.”',
    vocabulary: [
      { term: 'humedad', meaning: 'humidity / dampness' },
      { term: 'cada día', meaning: 'every day' },
    ],
  },
  {
    id: 'line-5',
    start: 31,
    time: '0:31',
    source: 'Sin embargo, cada pared guarda una parte de la historia.',
    translation: 'However, every wall holds a part of history.',
    explanation: '“Sin embargo” marks contrast and commonly starts a new sentence or clause.',
    vocabulary: [
      { term: 'sin embargo', meaning: 'however / nevertheless' },
      { term: 'guarda', meaning: 'keeps / holds' },
    ],
  },
  {
    id: 'line-6',
    start: 39,
    time: '0:39',
    source: 'Vamos a seguir el recorrido que hacían los antiguos trabajadores.',
    translation: 'We are going to follow the route the former workers used to take.',
    explanation: '“Ir a + infinitive” forms the near future. “Hacían” describes a repeated past action.',
    vocabulary: [
      { term: 'recorrido', meaning: 'route / journey' },
      { term: 'antiguos', meaning: 'former / old' },
    ],
  },
  {
    id: 'line-7',
    start: 48,
    time: '0:48',
    source: 'Primero tenemos que bajar más de treinta metros.',
    translation: 'First we have to descend more than thirty meters.',
    explanation: '“Tener que + infinitive” expresses obligation or necessity.',
    vocabulary: [
      { term: 'bajar', meaning: 'to go down / descend' },
      { term: 'más de', meaning: 'more than' },
    ],
  },
  {
    id: 'line-8',
    start: 56,
    time: '0:56',
    source: 'A partir de aquí, la luz natural desaparece por completo.',
    translation: 'From here on, natural light disappears completely.',
    explanation: '“A partir de aquí” means a change begins at this point and continues afterward.',
    vocabulary: [
      { term: 'a partir de aquí', meaning: 'from here on' },
      { term: 'por completo', meaning: 'completely' },
    ],
  },
];

export const demoReading: ReadingLine[] = [
  {
    id: 'reading-1',
    source: 'Diecinueve años antes de decidir morir, Nora Seed llegó a la pequeña biblioteca de su barrio. Afuera llovía con una paciencia casi humana.',
    translation: 'Nineteen years before she decided to die, Nora Seed arrived at the small library in her neighborhood. Outside, the rain fell with an almost human patience.',
  },
  {
    id: 'reading-2',
    source: 'La señora Elm levantó la mirada del tablero de ajedrez y sonrió como si hubiera estado esperando exactamente ese momento.',
    translation: 'Mrs. Elm looked up from the chessboard and smiled as though she had been waiting for exactly that moment.',
  },
  {
    id: 'reading-3',
    source: '—Llegas tarde —dijo—, aunque quizá todavía estés a tiempo para descubrir algo importante.',
    translation: '“You are late,” she said, “although perhaps you still have time to discover something important.”',
  },
  {
    id: 'reading-4',
    source: 'Nora dejó la mochila junto a la puerta. No sabía qué responder, así que observó las estanterías interminables.',
    translation: 'Nora left her backpack beside the door. She did not know how to respond, so she studied the endless shelves.',
  },
  {
    id: 'reading-5',
    source: 'Cada libro parecía emitir una luz tenue. Algunos eran gruesos y solemnes; otros, pequeños como cartas que nunca habían sido enviadas.',
    translation: 'Each book seemed to give off a faint light. Some were thick and solemn; others were small like letters that had never been sent.',
  },
  {
    id: 'reading-6',
    source: '—Aquí guardamos las vidas que pudiste haber vivido —explicó la bibliotecaria con absoluta calma.',
    translation: '“Here we keep the lives you might have lived,” the librarian explained with complete calm.',
  },
  {
    id: 'reading-7',
    source: 'Por primera vez aquella noche, Nora olvidó el sonido de la lluvia y dio un paso hacia los libros.',
    translation: 'For the first time that night, Nora forgot the sound of the rain and took a step toward the books.',
  },
];

export function getImmersionResource(resourceId?: string): ImmersionResource {
  return (
    immersionResources.find((resource) => resource.id === resourceId) ??
    immersionResources[0]
  );
}
