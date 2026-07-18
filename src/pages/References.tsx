import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Search, Sparkles, Target, RotateCcw } from 'lucide-react';
import { PageActions, PageContent, PageMainColumn, PageMainSidebarLayout, PageSidebar } from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { languageCatalog, useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

type ReferenceTab = 'characters' | 'sounds' | 'words';

interface ReferenceCard {
  id: string;
  symbol: string;
  reading: string;
  meaning: string;
  unlocked: boolean;
}

interface SectionData {
  title: string;
  subtitle?: string;
  cards: ReferenceCard[];
}

interface LanguageReferenceData {
  headline: string;
  description: string;
  sections: Record<ReferenceTab, SectionData[]>;
}

const tabs: Array<{ key: ReferenceTab; label: string }> = [
  { key: 'characters', label: 'Characters' },
  { key: 'sounds', label: 'Sounds' },
  { key: 'words', label: 'Words' },
];

interface FilteredSectionData extends SectionData {
  totalCards: number;
  unlockedCards: number;
}

interface TabTheme {
  progressGradient: string;
  progressGlow: string;
  activeBorder: string;
  activeBackground: string;
  tileGlow: string;
  lockTint: string;
}

const tabThemeByKey: Record<ReferenceTab, TabTheme> = {
  characters: {
    progressGradient: 'linear-gradient(90deg, #f8cf72 0%, #f59e0b 100%)',
    progressGlow: 'rgba(245, 158, 11, 0.35)',
    activeBorder: 'rgba(248, 186, 84, 0.7)',
    activeBackground: 'rgba(109, 68, 6, 0.22)',
    tileGlow: 'rgba(245, 158, 11, 0.22)',
    lockTint: '#f8cf72',
  },
  sounds: {
    progressGradient: 'linear-gradient(90deg, #7beaff 0%, #22d3ee 100%)',
    progressGlow: 'rgba(34, 211, 238, 0.36)',
    activeBorder: 'rgba(104, 226, 248, 0.7)',
    activeBackground: 'rgba(7, 88, 107, 0.24)',
    tileGlow: 'rgba(34, 211, 238, 0.2)',
    lockTint: '#7beaff',
  },
  words: {
    progressGradient: 'linear-gradient(90deg, #ba9dff 0%, #8b5cf6 100%)',
    progressGlow: 'rgba(139, 92, 246, 0.36)',
    activeBorder: 'rgba(177, 140, 255, 0.72)',
    activeBackground: 'rgba(70, 38, 132, 0.24)',
    tileGlow: 'rgba(139, 92, 246, 0.2)',
    lockTint: '#ba9dff',
  },
};

function makeCards(prefix: string, items: Array<[string, string, string, boolean?]>): ReferenceCard[] {
  return items.map(([symbol, reading, meaning, unlocked = true], index) => ({
    id: `${prefix}-${index}`,
    symbol,
    reading,
    meaning,
    unlocked,
  }));
}

const referenceDataByLanguage: Record<string, LanguageReferenceData> = {
  es: {
    headline: 'Spanish Reference Hub',
    description: 'Track letter patterns, pronunciation pairs, and high-frequency words used in daily conversation.',
    sections: {
      characters: [
        {
          title: 'Core Alphabet Blocks',
          subtitle: '20 / 27 discovered',
          cards: makeCards('es-char-core', [
            ['A', 'a', 'open vowel'],
            ['B', 'be', 'b sound'],
            ['C', 'ce', 'k or s by context'],
            ['N tilde', 'enye', 'palatal n sound'],
            ['LL', 'elle', 'y-like consonant'],
            ['RR', 'erre doble', 'rolled r', false],
            ['G-U-E', 'gue', 'u pronounced cluster', false],
            ['CH', 'che', 'ch sound'],
          ]),
        },
        {
          title: 'Accent And Stress Markers',
          subtitle: '5 / 9 discovered',
          cards: makeCards('es-char-stress', [
            ['Acute', 'accent mark', 'marks stress'],
            ['Diaeresis', 'u mark', 'forces pronounced u', false],
            ['-mente', 'suffix', 'adverb ending'],
            ['-cion', 'suffix', 'noun ending', false],
            ['Inverted ?', 'question opener', 'opening interrogative'],
            ['Inverted !', 'exclamation opener', 'opening exclamation', false],
          ]),
        },
      ],
      sounds: [
        {
          title: 'Vowel Precision',
          subtitle: '3 / 5 discovered',
          cards: makeCards('es-sound-vowel', [
            ['a', 'a', 'pure vowel'],
            ['e', 'e', 'pure vowel'],
            ['i', 'i', 'pure vowel', false],
            ['o', 'o', 'pure vowel'],
            ['u', 'u', 'pure vowel', false],
          ]),
        },
        {
          title: 'Consonant Contrast',
          subtitle: '7 / 12 discovered',
          cards: makeCards('es-sound-cons', [
            ['b-v', 'single family', 'often merged'],
            ['r', 'tap', 'single flap'],
            ['rr', 'trill', 'rolled r', false],
            ['j', 'guttural', 'back fricative'],
            ['z-c', 'regional', 'dialect variation', false],
            ['ll-y', 'merged in many regions', 'yeismo'],
          ]),
        },
      ],
      words: [
        {
          title: 'Daily Essentials',
          subtitle: '10 / 16 discovered',
          cards: makeCards('es-word-core', [
            ['hola', 'OH-la', 'hello'],
            ['gracias', 'GRA-syas', 'thank you'],
            ['perdon', 'per-DON', 'sorry'],
            ['por favor', 'por fa-VOR', 'please'],
            ['cuanto', 'KWAN-to', 'how much', false],
            ['donde', 'DON-de', 'where'],
            ['quiero', 'KYE-ro', 'I want', false],
            ['entiendo', 'en-TYEN-do', 'I understand'],
          ]),
        },
        {
          title: 'Travel And Navigation',
          subtitle: '6 / 14 discovered',
          cards: makeCards('es-word-travel', [
            ['estacion', 'es-ta-SYON', 'station'],
            ['aeropuerto', 'a-e-ro-PWER-to', 'airport'],
            ['calle', 'KA-ye', 'street'],
            ['izquierda', 'iz-KYER-da', 'left', false],
            ['derecha', 'de-RE-cha', 'right', false],
            ['boleto', 'bo-LE-to', 'ticket'],
          ]),
        },
      ],
    },
  },
  de: {
    headline: 'German Reference Hub',
    description: 'Work through umlaut sets, consonant clusters, and practical phrases for conversation and travel.',
    sections: {
      characters: [
        {
          title: 'Alphabet And Umlauts',
          subtitle: '18 / 30 discovered',
          cards: makeCards('de-char-core', [
            ['A', 'a', 'open vowel'],
            ['Ae', 'ae', 'front rounded vowel'],
            ['Oe', 'oe', 'front rounded vowel', false],
            ['Eszett', 'ss', 'double s marker'],
            ['Sch', 'sh', 'cluster sound'],
            ['Ch', 'ich or ach', 'fricative cluster', false],
            ['Sp', 'shp', 'word-initial cluster'],
            ['St', 'sht', 'word-initial cluster', false],
          ]),
        },
        {
          title: 'Morphology Markers',
          subtitle: '7 / 12 discovered',
          cards: makeCards('de-char-morph', [
            ['-ung', 'suffix', 'noun ending'],
            ['-lich', 'suffix', 'adjective ending'],
            ['ge-', 'prefix', 'past participle marker'],
            ['-keit', 'suffix', 'abstract noun ending', false],
            ['-chen', 'suffix', 'diminutive ending', false],
            ['ver-', 'prefix', 'verb derivation'],
          ]),
        },
      ],
      sounds: [
        {
          title: 'Vowel Length',
          subtitle: '5 / 9 discovered',
          cards: makeCards('de-sound-vowel', [
            ['a vs ah', 'short and long', 'length contrast'],
            ['e vs eh', 'short and long', 'length contrast'],
            ['i vs ie', 'short and long', 'length contrast'],
            ['o vs oh', 'short and long', 'length contrast', false],
            ['u vs uh', 'short and long', 'length contrast', false],
          ]),
        },
        {
          title: 'High Value Consonants',
          subtitle: '8 / 15 discovered',
          cards: makeCards('de-sound-cons', [
            ['ch', 'ich or ach', 'dual fricative'],
            ['r', 'uvular', 'back r'],
            ['z', 'ts', 'affricate sound'],
            ['v', 'f or v', 'loanword dependent', false],
            ['w', 'v', 'v sound'],
            ['pf', 'pf', 'double articulation', false],
          ]),
        },
      ],
      words: [
        {
          title: 'Everyday Core',
          subtitle: '9 / 17 discovered',
          cards: makeCards('de-word-core', [
            ['hallo', 'HA-lo', 'hello'],
            ['danke', 'DAN-ke', 'thank you'],
            ['bitte', 'BIT-te', 'please'],
            ['entschuldigung', 'ent-SHUL-di-gung', 'excuse me'],
            ['ich verstehe', 'ikh fer-SHTE-he', 'I understand', false],
            ['ich weiss nicht', 'ikh vais nikht', 'I do not know', false],
          ]),
        },
        {
          title: 'City And Transit',
          subtitle: '6 / 15 discovered',
          cards: makeCards('de-word-city', [
            ['Bahnhof', 'BAN-hof', 'station'],
            ['Flughafen', 'FLOOK-ha-fen', 'airport'],
            ['Strasse', 'SHTRA-se', 'street'],
            ['links', 'links', 'left'],
            ['rechts', 'rekhts', 'right', false],
            ['Fahrkarte', 'FAR-kar-te', 'ticket', false],
          ]),
        },
      ],
    },
  },
  zh: {
    headline: 'Chinese Reference Hub',
    description: 'Practice Hanzi structure, pinyin initials and finals, and foundational words with tone awareness.',
    sections: {
      characters: [
        {
          title: 'Starter Hanzi',
          subtitle: '22 / 40 discovered',
          cards: makeCards('zh-char-core', [
            ['你', 'ni', 'you'],
            ['好', 'hao', 'good'],
            ['我', 'wo', 'I me'],
            ['他', 'ta', 'he'],
            ['们', 'men', 'plural marker'],
            ['学', 'xue', 'study', false],
            ['校', 'xiao', 'school', false],
            ['谢', 'xie', 'thank', false],
          ]),
        },
        {
          title: 'Radical Awareness',
          subtitle: '9 / 18 discovered',
          cards: makeCards('zh-char-radical', [
            ['氵', 'water', 'water radical'],
            ['亻', 'person', 'person radical'],
            ['口', 'mouth', 'mouth radical'],
            ['女', 'woman', 'female radical'],
            ['木', 'wood', 'wood radical', false],
            ['言', 'speech', 'speech radical', false],
          ]),
        },
      ],
      sounds: [
        {
          title: 'Tone Training',
          subtitle: '3 / 5 discovered',
          cards: makeCards('zh-sound-tone', [
            ['First tone', 'high level', 'flat high tone'],
            ['Second tone', 'rising', 'upward tone'],
            ['Third tone', 'dip rise', 'falling rising tone', false],
            ['Fourth tone', 'falling', 'sharp fall tone'],
            ['Neutral', 'light', 'unstressed short tone', false],
          ]),
        },
        {
          title: 'Pinyin Initials And Finals',
          subtitle: '14 / 24 discovered',
          cards: makeCards('zh-sound-pinyin', [
            ['zh', 'retroflex', 'retroflex affricate'],
            ['ch', 'aspirated', 'aspirated retroflex'],
            ['sh', 'retroflex', 'retroflex fricative'],
            ['j', 'alveolo-palatal', 'alveolo-palatal initial'],
            ['q', 'aspirated j', 'aspirated alveolo-palatal', false],
            ['x', 'soft hiss', 'alveolo-palatal fricative', false],
          ]),
        },
      ],
      words: [
        {
          title: 'Conversation Basics',
          subtitle: '11 / 20 discovered',
          cards: makeCards('zh-word-core', [
            ['你好', 'ni hao', 'hello'],
            ['谢谢', 'xie xie', 'thank you'],
            ['对不起', 'dui bu qi', 'sorry'],
            ['没关系', 'mei guan xi', 'it is okay'],
            ['请问', 'qing wen', 'may I ask'],
            ['我不知道', 'wo bu zhi dao', 'I do not know', false],
          ]),
        },
        {
          title: 'Numbers And Time',
          subtitle: '7 / 16 discovered',
          cards: makeCards('zh-word-time', [
            ['今天', 'jin tian', 'today'],
            ['明天', 'ming tian', 'tomorrow'],
            ['现在', 'xian zai', 'now'],
            ['一点', 'yi dian', 'one oclock', false],
            ['晚上', 'wan shang', 'evening'],
            ['分钟', 'fen zhong', 'minute', false],
          ]),
        },
      ],
    },
  },
  en: {
    headline: 'English Reference Hub',
    description: 'Build spelling to sound intuition, reduce pronunciation confusion, and lock practical vocabulary.',
    sections: {
      characters: [
        {
          title: 'Letter Patterns',
          subtitle: '19 / 30 discovered',
          cards: makeCards('en-char-pattern', [
            ['th', 'two sounds', 'voiced and unvoiced'],
            ['sh', 'sh', 'postalveolar fricative'],
            ['ch', 'ch', 'affricate'],
            ['ph', 'f', 'greek-origin words'],
            ['ough', 'multiple', 'high-variance spelling', false],
            ['tion', 'shun', 'common noun ending'],
            ['ed', 'd t id', 'past ending variants', false],
          ]),
        },
        {
          title: 'Stress Signposts',
          subtitle: '6 / 11 discovered',
          cards: makeCards('en-char-stress', [
            ['REcord', 'noun stress', 'stress shift pair'],
            ['reCORD', 'verb stress', 'stress shift pair'],
            ['-ity', 'suffix', 'stress behavior'],
            ['-graphy', 'suffix', 'stress behavior', false],
            ['-ic', 'suffix', 'stress before suffix'],
            ['silent e', 'orthography', 'long vowel marker', false],
          ]),
        },
      ],
      sounds: [
        {
          title: 'Core Vowels',
          subtitle: '8 / 15 discovered',
          cards: makeCards('en-sound-vowel', [
            ['long ee', 'sheep', 'long front vowel'],
            ['short i', 'ship', 'short front vowel'],
            ['long oo', 'food', 'long back vowel'],
            ['short oo', 'book', 'short back vowel', false],
            ['a cat', 'cat', 'open front vowel'],
            ['u cup', 'cup', 'central vowel', false],
          ]),
        },
        {
          title: 'Hard Consonant Pairs',
          subtitle: '7 / 13 discovered',
          cards: makeCards('en-sound-cons', [
            ['v vs w', 'vest west', 'lip and glide contrast'],
            ['r vs l', 'right light', 'liquid contrast'],
            ['th vs s', 'think sink', 'tongue placement'],
            ['this vs dis', 'voiced dental', 'voiced contrast', false],
            ['b vs p', 'bat pat', 'voicing pair'],
            ['z vs zh', 'zoo measure', 'fricative contrast', false],
          ]),
        },
      ],
      words: [
        {
          title: 'Everyday Verbs',
          subtitle: '12 / 22 discovered',
          cards: makeCards('en-word-verb', [
            ['need', 'NEED', 'require something'],
            ['want', 'WANT', 'desire something'],
            ['prefer', 'pre-FER', 'like more'],
            ['recommend', 're-co-MMEND', 'suggest'],
            ['realize', 'REE-a-lize', 'become aware', false],
            ['manage', 'MA-na-j', 'handle successfully', false],
          ]),
        },
        {
          title: 'Travel Phrases',
          subtitle: '7 / 18 discovered',
          cards: makeCards('en-word-travel', [
            ['How much is this', 'phrase', 'price inquiry'],
            ['Where is the station', 'phrase', 'location inquiry'],
            ['Could you repeat that', 'phrase', 'clarification'],
            ['I am still learning', 'phrase', 'set context'],
            ['I have a reservation', 'phrase', 'booking statement', false],
            ['Do you take card', 'phrase', 'payment method', false],
          ]),
        },
      ],
    },
  },
  fr: {
    headline: 'French Reference Hub',
    description: 'Master accent marks, liaison-sensitive sounds, and practical sentence chunks for real interactions.',
    sections: {
      characters: [
        {
          title: 'Accents And Symbols',
          subtitle: '14 / 23 discovered',
          cards: makeCards('fr-char-accents', [
            ['e acute', 'accent aigu', 'closed e sound'],
            ['e grave', 'accent grave', 'open e sound'],
            ['e circumflex', 'accent marker', 'historical marker'],
            ['c cedilla', 'soft c', 'soft c before a o u'],
            ['diaeresis', 'separate vowels', 'forces separation', false],
            ['oe ligature', 'oe', 'combined vowel form', false],
          ]),
        },
        {
          title: 'Ending Patterns',
          subtitle: '7 / 13 discovered',
          cards: makeCards('fr-char-endings', [
            ['-tion', 'syon', 'common noun ending'],
            ['-eau', 'o', 'common vowel ending'],
            ['-ent', 'silent often', 'often silent ending'],
            ['-ez', 'e', 'second plural ending'],
            ['-ait', 'eh', 'imparfait ending', false],
            ['-eux', 'eu', 'adjective ending', false],
          ]),
        },
      ],
      sounds: [
        {
          title: 'Nasal Vowels',
          subtitle: '3 / 5 discovered',
          cards: makeCards('fr-sound-nasal', [
            ['an en', 'nasal', 'back nasal vowel'],
            ['on', 'nasal', 'rounded nasal vowel'],
            ['in', 'nasal', 'front nasal vowel', false],
            ['un', 'nasal', 'central nasal vowel', false],
            ['oral vowel', 'non nasal', 'mouth airflow'],
          ]),
        },
        {
          title: 'Liaison And Consonants',
          subtitle: '8 / 14 discovered',
          cards: makeCards('fr-sound-cons', [
            ['r', 'uvular', 'back throat r'],
            ['u', 'rounded front', 'tight rounded vowel'],
            ['ou', 'u', 'back rounded vowel'],
            ['j', 'zh', 'as in je'],
            ['gn', 'ny', 'palatal nasal', false],
            ['liaison', 'linking', 'pronounce final consonant', false],
          ]),
        },
      ],
      words: [
        {
          title: 'Social Basics',
          subtitle: '9 / 17 discovered',
          cards: makeCards('fr-word-core', [
            ['bonjour', 'bon-ZHOOR', 'hello'],
            ['merci', 'mer-SEE', 'thank you'],
            ['excusez-moi', 'ex-ku-zay-MWA', 'excuse me'],
            ['s il vous plait', 'seel voo PLEH', 'please'],
            ['je comprends', 'zhuh kom-PRAN', 'I understand', false],
            ['je ne sais pas', 'zhuh nuh say PA', 'I do not know', false],
          ]),
        },
        {
          title: 'Transit And Directions',
          subtitle: '6 / 14 discovered',
          cards: makeCards('fr-word-travel', [
            ['gare', 'GAR', 'station'],
            ['aeroport', 'a-eh-ro-POR', 'airport'],
            ['rue', 'RU', 'street'],
            ['a gauche', 'a GOSH', 'to the left'],
            ['a droite', 'a DRWAT', 'to the right', false],
            ['billet', 'bee-YEH', 'ticket', false],
          ]),
        },
      ],
    },
  },
  ja: {
    headline: 'Japanese Reference Hub',
    description: 'Progress through kana, rhythm-sensitive sounds, and practical vocabulary used in everyday exchanges.',
    sections: {
      characters: [
        {
          title: 'Hiragana Core',
          subtitle: '28 / 46 discovered',
          cards: makeCards('ja-char-hira', [
            ['あ', 'a', 'a'],
            ['い', 'i', 'i'],
            ['う', 'u', 'u'],
            ['え', 'e', 'e'],
            ['お', 'o', 'o'],
            ['き', 'ki', 'ki'],
            ['し', 'shi', 'shi', false],
            ['つ', 'tsu', 'tsu', false],
          ]),
        },
        {
          title: 'Katakana Essentials',
          subtitle: '11 / 20 discovered',
          cards: makeCards('ja-char-kata', [
            ['ア', 'a', 'a'],
            ['イ', 'i', 'i'],
            ['ウ', 'u', 'u'],
            ['エ', 'e', 'e'],
            ['オ', 'o', 'o', false],
            ['ン', 'n', 'syllabic n', false],
          ]),
        },
      ],
      sounds: [
        {
          title: 'Rhythm And Mora Timing',
          subtitle: '4 / 7 discovered',
          cards: makeCards('ja-sound-rhythm', [
            ['short vowel', 'ka', 'one mora'],
            ['long vowel', 'kaa', 'two mora'],
            ['double consonant', 'kitte', 'pause before consonant'],
            ['syllabic n', 'n', 'nasal mora'],
            ['pitch accent', 'word melody', 'pitch pattern', false],
          ]),
        },
        {
          title: 'Contrast Pairs',
          subtitle: '6 / 12 discovered',
          cards: makeCards('ja-sound-pairs', [
            ['r-l like', 'tap', 'single tap consonant'],
            ['fu-hu', 'soft f', 'bilabial fricative'],
            ['ji-zi', 'merged in many contexts', 'voiced fricative set'],
            ['tsu-su', 'cluster contrast', 'close articulation', false],
            ['ja-zya', 'loanword variants', 'orthographic variation', false],
            ['o-wo', 'modern merger', 'pronunciation overlap'],
          ]),
        },
      ],
      words: [
        {
          title: 'Polite Core',
          subtitle: '10 / 18 discovered',
          cards: makeCards('ja-word-core', [
            ['こんにちは', 'konnichiwa', 'hello'],
            ['ありがとう', 'arigatou', 'thank you'],
            ['すみません', 'sumimasen', 'excuse me'],
            ['お願いします', 'onegaishimasu', 'please'],
            ['わかります', 'wakarimasu', 'I understand', false],
            ['わかりません', 'wakarimasen', 'I do not understand', false],
          ]),
        },
        {
          title: 'Station And Travel',
          subtitle: '7 / 16 discovered',
          cards: makeCards('ja-word-travel', [
            ['駅', 'eki', 'station'],
            ['空港', 'kuukou', 'airport'],
            ['右', 'migi', 'right'],
            ['左', 'hidari', 'left'],
            ['切符', 'kippu', 'ticket', false],
            ['予約', 'yoyaku', 'reservation', false],
          ]),
        },
      ],
    },
  },
};

const fallbackData: LanguageReferenceData = {
  headline: 'Reference Hub',
  description: 'Study your active language with structured character, sound, and word collections.',
  sections: {
    characters: [
      {
        title: 'Writing System Basics',
        subtitle: '4 / 8 discovered',
        cards: makeCards('fallback-char', [
          ['A', 'base symbol', 'starter character set'],
          ['B', 'base symbol', 'starter character set'],
          ['C', 'base symbol', 'starter character set', false],
          ['D', 'base symbol', 'starter character set', false],
        ]),
      },
    ],
    sounds: [
      {
        title: 'Core Sound Units',
        subtitle: '3 / 6 discovered',
        cards: makeCards('fallback-sound', [
          ['V1', 'vowel', 'core vowel unit'],
          ['V2', 'vowel', 'core vowel unit'],
          ['C1', 'consonant', 'core consonant unit', false],
          ['C2', 'consonant', 'core consonant unit', false],
        ]),
      },
    ],
    words: [
      {
        title: 'Starter Vocabulary',
        subtitle: '4 / 10 discovered',
        cards: makeCards('fallback-word', [
          ['hello', 'greeting', 'basic greeting'],
          ['thanks', 'gratitude', 'basic gratitude'],
          ['please', 'polite request', 'basic polite form', false],
          ['sorry', 'apology', 'basic apology', false],
        ]),
      },
    ],
  },
};

function generateReferenceDataForLanguage(code: string, languageName: string): LanguageReferenceData {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const toneLike = ['high', 'rising', 'falling', 'neutral', 'long', 'short'];
  const words = ['hello', 'thanks', 'please', 'sorry', 'station', 'ticket', 'left', 'right', 'today', 'tomorrow'];

  return {
    headline: `${languageName} Reference Hub`,
    description: `Auto-generated reference packs for ${languageName}.`,
    sections: {
      characters: [
        {
          title: 'Core Characters',
          subtitle: 'Generated',
          cards: makeCards(
            `${code}-char-core`,
            letters.slice(0, 12).map((symbol, index) => [symbol, `${symbol.toLowerCase()}`, `${languageName} core symbol`, index % 4 !== 0]),
          ),
        },
        {
          title: 'Character Patterns',
          subtitle: 'Generated',
          cards: makeCards(
            `${code}-char-pattern`,
            letters.slice(12, 24).map((symbol, index) => [`${symbol}${letters[(index + 1) % letters.length]}`, 'pattern', 'common pair', index % 3 !== 0]),
          ),
        },
      ],
      sounds: [
        {
          title: 'Vowel Units',
          subtitle: 'Generated',
          cards: makeCards(
            `${code}-sound-vowel`,
            vowels.map((symbol, index) => [symbol, symbol, 'vowel unit', index % 2 === 0]),
          ),
        },
        {
          title: 'Sound Contrasts',
          subtitle: 'Generated',
          cards: makeCards(
            `${code}-sound-contrast`,
            toneLike.map((label, index) => [`${label}`, label, `${languageName} pronunciation cue`, index % 3 !== 0]),
          ),
        },
      ],
      words: [
        {
          title: 'Daily Words',
          subtitle: 'Generated',
          cards: makeCards(
            `${code}-word-daily`,
            words.map((word, index) => [`${word}-${code}`, word, `starter ${languageName} term`, index % 5 !== 0]),
          ),
        },
        {
          title: 'Travel Words',
          subtitle: 'Generated',
          cards: makeCards(
            `${code}-word-travel`,
            words.slice(2).map((word, index) => [`${word}-${index + 1}`, `${word}`, 'travel-focused word', index % 4 !== 0]),
          ),
        },
      ],
    },
  };
}

function tabStats(sections: SectionData[]) {
  const total = sections.reduce((sum, section) => sum + section.cards.length, 0);
  const unlocked = sections.reduce((sum, section) => sum + section.cards.filter((card) => card.unlocked).length, 0);

  return {
    total,
    unlocked,
    percent: total > 0 ? Math.round((unlocked / total) * 100) : 0,
  };
}

function symbolSizeClass(symbol: string) {
  if (symbol.length <= 2) {
    return 'text-[48px]';
  }
  if (symbol.length <= 4) {
    return 'text-[40px]';
  }
  if (symbol.length <= 8) {
    return 'text-[33px]';
  }
  return 'text-[27px]';
}

function cardCode(id: string) {
  return id.replace(/-/g, '.').toUpperCase();
}

function ReferenceCardTile({ card, activeTab }: { card: ReferenceCard; activeTab: ReferenceTab }) {
  const theme = tabThemeByKey[activeTab];
  const discoveredStyle = card.unlocked
    ? 'border-white/10 bg-[linear-gradient(156deg,rgba(16,24,55,0.86),rgba(8,11,29,0.92))] text-white'
    : 'border-white/5 bg-[linear-gradient(156deg,rgba(11,16,36,0.86),rgba(7,10,26,0.93))] text-white/50';

  return (
    <article className={`group relative min-h-[168px] overflow-hidden rounded-[18px] border p-4 shadow-[0_12px_26px_rgba(2,6,18,0.52)] ${discoveredStyle}`}>
      <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_16%_12%,rgba(255,255,255,0.08),transparent_52%)]" />
      {card.unlocked ? (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl"
          style={{ backgroundColor: theme.tileGlow }}
        />
      ) : null}
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`${symbolSizeClass(card.symbol)} leading-[0.95] font-light tracking-tight ${
              card.unlocked ? 'text-[#e8eeff]' : 'text-[#8ea0cd]/55 blur-[0.55px]'
            }`}
          >
            {card.symbol}
          </p>
          {card.unlocked ? (
            <span className="mt-1 inline-block h-4 w-4 rounded-full border border-white/40 bg-white/20" />
          ) : (
            <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Lock size={11} style={{ color: theme.lockTint }} />
            </span>
          )}
        </div>
        <div className="mt-auto space-y-0.5">
          <p className={`text-[20px] leading-none ${card.unlocked ? 'text-white/92' : 'text-white/70'}`}>{card.reading}</p>
          <p className={`text-[14px] leading-tight ${card.unlocked ? 'text-white/65' : 'text-white/45'}`}>{card.meaning}</p>
          <p className="pt-1 text-[10px] font-medium tracking-[0.16em] text-white/35">{cardCode(card.id)}</p>
        </div>
      </div>
    </article>
  );
}

export default function LibrariesPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<ReferenceTab>('characters');
  const [search, setSearch] = useState('');
  const [showLocked, setShowLocked] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const generatedReferenceDataByLanguage = useMemo(
    () =>
      languageCatalog.reduce<Record<string, LanguageReferenceData>>((acc, entry) => {
        if (!referenceDataByLanguage[entry.code]) {
          acc[entry.code] = generateReferenceDataForLanguage(entry.code, entry.name);
        }
        return acc;
      }, {}),
    [],
  );

  const languageData =
    referenceDataByLanguage[activeLanguage.code] ||
    generatedReferenceDataByLanguage[activeLanguage.code] ||
    fallbackData;

  const currentSections = useMemo<FilteredSectionData[]>(() => {
    const query = search.trim().toLowerCase();

    return languageData.sections[activeTab]
      .map((section) => {
        const totalCards = section.cards.length;
        const unlockedCards = section.cards.filter((card) => card.unlocked).length;

        return {
          ...section,
          totalCards,
          unlockedCards,
          cards: section.cards.filter((card) => {
          if (!showLocked && !card.unlocked) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            card.symbol.toLowerCase().includes(query) ||
            card.reading.toLowerCase().includes(query) ||
            card.meaning.toLowerCase().includes(query)
          );
          }),
        };
      })
      .filter((section) => section.cards.length > 0);
  }, [activeTab, languageData.sections, search, showLocked]);

  const statByTab = useMemo(
    () => ({
      characters: tabStats(languageData.sections.characters),
      sounds: tabStats(languageData.sections.sounds),
      words: tabStats(languageData.sections.words),
    }),
    [languageData.sections],
  );

  const activeStat = statByTab[activeTab];
  const activeTheme = tabThemeByKey[activeTab];
  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? 'Library';
  const totalUnlockedAcrossTabs = statByTab.characters.unlocked + statByTab.sounds.unlocked + statByTab.words.unlocked;
  const totalAcrossTabs = statByTab.characters.total + statByTab.sounds.total + statByTab.words.total;
  const visibleCardCount = currentSections.reduce((sum, section) => sum + section.cards.length, 0);
  const weakestTab = tabs.reduce((lowest, tab) => {
    const current = statByTab[tab.key].percent;
    const lowestPercent = statByTab[lowest].percent;
    return current < lowestPercent ? tab.key : lowest;
  }, tabs[0].key);

  return (
    <PageContent width="wide" className="pb-16">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate('/review/session?mode=due-now')}>
          <Sparkles size={16} fill="currentColor" /> Smart Review
        </button>
      </PageActions>

      <PageMainSidebarLayout className="gap-6">
        <PageMainColumn className="gap-5">
          <section className="space-y-5">
            <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(160deg,rgba(9,17,47,0.92),rgba(6,10,24,0.95))] p-5 shadow-[0_20px_48px_rgba(2,6,20,0.6)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(124,177,255,0.22),transparent_40%),radial-gradient(circle_at_84%_0%,rgba(84,204,255,0.25),transparent_32%)]" />
              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#091230]/85 p-1">
                    {tabs.map((tab) => {
                      const isActive = tab.key === activeTab;
                      const theme = tabThemeByKey[tab.key];

                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`rounded-full px-4 py-1.5 text-[18px] font-medium transition-all ${
                            isActive ? 'text-white' : 'text-white/55 hover:text-white/80'
                          }`}
                          style={
                            isActive
                              ? {
                                  border: `1px solid ${theme.activeBorder}`,
                                  backgroundColor: theme.activeBackground,
                                  boxShadow: `inset 0 0 18px ${theme.progressGlow}`,
                                }
                              : undefined
                          }
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-[#8da2ff]">Reference Archive</p>
                  <h2 className="text-[26px] leading-tight font-semibold text-white">{languageData.headline}</h2>
                  <p className="mt-1 text-[14px] text-dim">{languageData.description}</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {tabs.map((tab) => {
                      const stats = statByTab[tab.key];
                      const theme = tabThemeByKey[tab.key];

                      return (
                        <button
                          key={`progress-${tab.key}`}
                          onClick={() => setActiveTab(tab.key)}
                          className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                            tab.key === activeTab ? 'border-white/25 bg-white/5' : 'border-white/10 bg-[#0d1639]/48 hover:border-white/20'
                          }`}
                        >
                          <p className="text-[14px] text-white/75">{tab.label}</p>
                          <p className="mt-1 text-[35px] leading-none text-white">
                            {stats.unlocked.toLocaleString()}
                            <span className="ml-1 text-[19px] text-white/55">/ {stats.total.toLocaleString()}</span>
                          </p>
                          <div className="mt-2 h-[4px] rounded-full bg-white/10">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.percent}%` }}
                              transition={{ duration: 0.45, ease: 'easeOut' }}
                              style={{
                                background: theme.progressGradient,
                                boxShadow: `0 0 16px ${theme.progressGlow}`,
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative hidden h-[188px] w-[200px] shrink-0 xl:block">
                  <img
                    src="/figure/excited.png"
                    alt="Echo"
                    className="absolute right-0 bottom-0 h-[175px] w-[175px] object-contain drop-shadow-[0_0_28px_rgba(34,211,238,0.55)]"
                  />
                  <div className="absolute right-10 bottom-4 h-8 w-24 rounded-full bg-cyan-300/35 blur-xl" />
                </div>
              </div>
              <div className="relative mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowLocked((prev) => !prev)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#0d1538]/75 px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#182251]"
                  >
                    {showLocked ? <Eye size={15} /> : <EyeOff size={15} />}
                    {showLocked ? 'Undiscovered visible' : 'Undiscovered hidden'}
                  </button>
                  <button
                    onClick={() => setShowAll((prev) => !prev)}
                    className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-[#0d1538]/75 px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#182251]"
                  >
                    {showAll ? 'Condensed view' : 'Show full set'}
                  </button>
                </div>

                <label className="flex h-10 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0d1537]/70 px-3 text-dim transition-colors focus-within:border-white/30 xl:max-w-[360px]">
                  <Search size={15} className="text-dim" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${activeTabLabel.toLowerCase()}...`}
                    className="h-full w-full bg-transparent text-[14px] text-white placeholder:text-dim/70 outline-none"
                  />
                </label>
              </div>

              <div className="relative mt-3 rounded-xl border border-white/8 bg-[#0d142f]/80 px-4 py-2 text-[12px] text-dim">
                Active set: <span className="text-white/90">{activeTabLabel}</span> | Unlocked{' '}
                <span className="text-white/90">{activeStat.unlocked}</span> of <span className="text-white/90">{activeStat.total}</span>
                <span className="ml-2 inline-block h-1.5 w-16 rounded-full align-middle" style={{ background: activeTheme.progressGradient }} />
              </div>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,13,34,0.8),rgba(6,10,24,0.92))] p-5 shadow-[0_18px_40px_rgba(4,8,20,0.52)]">
              <div className="space-y-8">
                {currentSections.length > 0 ? (
                  currentSections.map((section) => (
                    <section key={section.title} className="space-y-4">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <h3 className="text-[27px] leading-none font-medium tracking-tight text-white">{section.title}</h3>
                        <div className="flex items-center gap-2 text-[12px] text-dim">
                          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
                            {section.unlockedCards} / {section.totalCards} discovered
                          </span>
                          {section.subtitle ? <span className="text-white/45">{section.subtitle}</span> : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
                        {(showAll ? section.cards : section.cards.slice(0, 12)).map((card, cardIndex) => (
                          <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: cardIndex * 0.02, duration: 0.22 }}
                          >
                            <ReferenceCardTile card={card} activeTab={activeTab} />
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#0c1228]/75 p-8 text-center">
                    <p className="text-[16px] text-white/90">No results for this filter.</p>
                    <p className="mt-2 text-[13px] text-dim">Try another search term or re-enable undiscovered items.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </PageMainColumn>

        <PageSidebar className="gap-5">
          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Progress Snapshot</p>
            <h4 className="text-[22px] font-bold text-white">{totalUnlockedAcrossTabs} / {totalAcrossTabs}</h4>
            <p className="text-[13px] text-dim mt-1 mb-4">Total unlocked references across characters, sounds, and words.</p>
            <div className="space-y-2 text-[13px]">
              {tabs.map((tab) => (
                <div key={`sidebar-${tab.key}`} className="flex items-center justify-between">
                  <span className="text-dim">{tab.label}</span>
                  <span className="text-mist font-bold">{statByTab[tab.key].unlocked} / {statByTab[tab.key].total}</span>
                </div>
              ))}
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Current View</p>
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-dim">Active tab</span>
                <span className="text-white font-semibold">{activeTabLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Visible cards</span>
                <span className="text-white font-semibold">{visibleCardCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Undiscovered</span>
                <span className="text-white font-semibold">{showLocked ? 'Shown' : 'Hidden'}</span>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSearch('');
                  setShowLocked(true);
                  setShowAll(false);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-[13px] text-mist">Reset filters</span>
                <RotateCcw size={14} className="text-dim" />
              </button>
              <button
                onClick={() => setActiveTab(weakestTab)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-[13px] text-mist">Focus weak area</span>
                <Target size={14} className="text-dim" />
              </button>
            </div>
          </SpotlightCard>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
