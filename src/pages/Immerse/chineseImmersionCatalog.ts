import type { ImmersionResource } from './immersionCatalog';

const CHINESE = 'zh';

const accentFor = (index: number) => (index % 3 === 0
  ? 'from-rose-500/40 via-red-800/25 to-[#0B1020]'
  : index % 3 === 1
    ? 'from-amber-500/40 via-orange-800/25 to-[#0B1020]'
    : 'from-emerald-500/40 via-teal-700/25 to-[#0B1020]');

/**
 * Each reading is pinned to a Project Gutenberg ebook id. Searching Gutenberg by
 * title does not work for these: the catalog lists them under their traditional
 * titles (西遊記, not 西游记), and the search service is often unavailable.
 */
const readingSeeds: Array<{
  slug: string;
  title: string;
  searchTitle: string;
  author: string;
  year: number;
  category: string;
  level: string;
  duration: string;
  subtitle: string;
  gutenbergId: number;
}> = [
  {
    slug: 'journey-to-the-west',
    title: '西遊記 · Journey to the West',
    searchTitle: 'Journey to the West',
    author: 'Wu Cheng’en',
    year: 1592,
    category: 'Classic Novels',
    level: 'C1',
    duration: '40h',
    subtitle: 'A monk and his unruly disciples travel west in search of scripture.',
    gutenbergId: 23962,
  },
  {
    slug: 'dream-of-the-red-chamber',
    title: '紅樓夢 · Dream of the Red Chamber',
    searchTitle: 'Dream of the Red Chamber',
    author: 'Cao Xueqin',
    year: 1791,
    category: 'Classic Novels',
    level: 'C1',
    duration: '60h',
    subtitle: 'The rise and decline of a great household, told through its young heirs.',
    gutenbergId: 24264,
  },
  {
    slug: 'romance-of-the-three-kingdoms',
    title: '三國志演義 · Romance of the Three Kingdoms',
    searchTitle: 'Romance of the Three Kingdoms',
    author: 'Luo Guanzhong',
    year: 1522,
    category: 'Classic Novels',
    level: 'C1',
    duration: '55h',
    subtitle: 'Warlords, strategists and sworn brothers at the end of the Han dynasty.',
    gutenbergId: 23950,
  },
  {
    slug: 'water-margin',
    title: '水滸傳 · Water Margin',
    searchTitle: 'Water Margin',
    author: 'Shi Nai’an',
    year: 1589,
    category: 'Classic Novels',
    level: 'C1',
    duration: '48h',
    subtitle: 'One hundred and eight outlaws gather at Liangshan Marsh.',
    gutenbergId: 23863,
  },
  {
    slug: 'call-to-arms',
    title: '吶喊 · Call to Arms',
    searchTitle: 'Call to Arms',
    author: 'Lu Xun',
    year: 1923,
    category: 'Modern Stories',
    level: 'B2',
    duration: '4h',
    subtitle: 'Lu Xun’s first collection, opening with “Diary of a Madman”.',
    gutenbergId: 27166,
  },
  {
    slug: 'true-story-of-ah-q',
    title: '阿Q正傳 · The True Story of Ah Q',
    searchTitle: 'The True Story of Ah Q',
    author: 'Lu Xun',
    year: 1921,
    category: 'Modern Stories',
    level: 'B2',
    duration: '2h',
    subtitle: 'A sharp satire of a village laborer who never admits defeat.',
    gutenbergId: 25332,
  },
];

/** Every show below resolves in the Apple Podcasts directory under this exact title and publisher. */
const audioSeeds: Array<[string, string, string, string, string, string, string]> = [
  ['coffee-break-chinese', 'Coffee Break Chinese', 'Coffee Break Languages', 'Learner Podcasts', 'A2', '20 min', 'Short guided lessons that build a beginner’s Mandarin step by step.'],
  ['slow-chinese', 'Slow Chinese Podcast - 慢速汉语 Learn Chinese 学中文', 'Learn Chinese with Mei', 'Learner Podcasts', 'A2', '10 min', 'Everyday topics read slowly and clearly in Mandarin.'],
  ['chinesepod-intermediate', 'ChinesePod - Intermediate', 'ChinesePod LLC', 'Learner Podcasts', 'B1', '15 min', 'Dialogues about real situations, unpacked line by line.'],
  ['teatime-chinese', 'TeaTime Chinese 茶歇中文', 'Nathan Rao', 'Conversations', 'B1', '20 min', 'Relaxed chats about culture, food and daily life in Mandarin.'],
  ['learning-chinese-through-stories', 'Learning Chinese through Stories', 'Rui & Simeng', 'Conversations', 'B1', '15 min', 'Stories told in natural Mandarin, pitched for intermediate listeners.'],
  ['mandarin-monkey', 'Mandarin Monkey Podcast', 'Mandarin Monkey', 'Conversations', 'B2', '45 min', 'Long, unscripted conversations between a Taiwanese and a British host.'],
  ['dashu-mandarin', 'Dashu Mandarin Podcast', '李璨理查BEN', 'Conversations', 'B2', '30 min', 'Upper-intermediate talk about work, cities and growing up in China.'],
];

/** Videos are resolved by category through the YouTube search for Chinese. */
const videoSeeds: Array<[string, string, string, string, string]> = [
  ['Food & Culture', 'Street Food in Chengdu', 'A night market walk through 成都’s snack stalls.', 'A2', '14 min'],
  ['Food & Culture', 'Making Dumplings at Home', 'Folding 饺子 with a family in Xi’an.', 'A2', '11 min'],
  ['Food & Culture', 'Tea Houses of Hangzhou', 'How 龙井 tea is grown, picked and poured.', 'B1', '18 min'],
  ['City Life', 'A Day on the Beijing Subway', 'Commuters talk about life underground.', 'B1', '16 min'],
  ['City Life', 'Shanghai After Dark', 'The Bund, small bars and late-night noodles.', 'B1', '20 min'],
  ['City Life', 'Old Hutongs, New Neighbors', 'Long-time residents and new shop owners share a lane.', 'B2', '22 min'],
];

const readings: ImmersionResource[] = readingSeeds.map((seed, index) => ({
  id: `reading-zh-${seed.slug}`,
  kind: 'reading',
  category: seed.category,
  languageCode: CHINESE,
  title: seed.title,
  searchTitle: seed.searchTitle,
  author: seed.author,
  publicationYear: seed.year,
  subtitle: seed.subtitle,
  level: seed.level,
  duration: seed.duration,
  accent: accentFor(index),
  tags: [seed.category, 'Public domain', 'Traditional characters'],
  sourceLabel: 'Project Gutenberg',
  sourceUrl: `https://www.gutenberg.org/ebooks/${seed.gutenbergId}`,
  gutenbergId: seed.gutenbergId,
}));

const audio: ImmersionResource[] = audioSeeds.map(
  ([slug, title, author, category, level, duration, subtitle], index) => ({
    id: `audio-zh-${slug}`,
    kind: 'audio',
    category,
    languageCode: CHINESE,
    title,
    author,
    subtitle,
    level,
    duration,
    accent: accentFor(index + 1),
    tags: [category, 'Chinese audio'],
    sourceLabel: 'Apple Podcasts',
    sourceUrl: `https://podcasts.apple.com/us/search?term=${encodeURIComponent(title)}`,
  }),
);

const videos: ImmersionResource[] = videoSeeds.map(([category, title, subtitle, level, duration], index) => ({
  id: `video-zh-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index + 1}`,
  kind: 'video',
  category,
  languageCode: CHINESE,
  title,
  subtitle,
  level,
  duration,
  accent: accentFor(index + 2),
  tags: category.split(/\s|&/).filter(Boolean),
}));

export const chineseImmersionResources: ImmersionResource[] = [...videos, ...readings, ...audio];
