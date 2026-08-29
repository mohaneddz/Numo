/**
 * Writing-system and pronunciation reference content.
 *
 * The reference hub used to fabricate its cards for most languages — slicing a
 * Latin alphabet up and labelling each letter `"<Language> core symbol"`, with
 * an `index % 4 !== 0` rule standing in for whether the learner had unlocked
 * it. Everything here is real: actual alphabets with their actual letter names,
 * and the sound distinctions each language genuinely trips learners up on.
 *
 * A language with no entry here shows an honest empty state. Chinese and
 * Japanese characters are not listed — those come from the stroke-order dataset
 * in `scriptModels`, which already holds several hundred real characters.
 */

export interface ReferenceEntry {
  /** The letter, character, or sound as written. */
  symbol: string;
  /** How it is named or transliterated. */
  reading: string;
  /** What it is, or how it is pronounced. */
  meaning: string;
}

export interface ReferenceGroup {
  title: string;
  subtitle?: string;
  entries: ReferenceEntry[];
}

const SPANISH_LETTERS: ReferenceEntry[] = [
  { symbol: 'a', reading: 'a', meaning: 'Open "ah", always the same' },
  { symbol: 'b', reading: 'be', meaning: 'Soft between vowels' },
  { symbol: 'c', reading: 'ce', meaning: '"k" before a/o/u, "s" before e/i' },
  { symbol: 'd', reading: 'de', meaning: 'Soft "th" between vowels' },
  { symbol: 'e', reading: 'e', meaning: 'Like "e" in "bet"' },
  { symbol: 'f', reading: 'efe', meaning: 'As in English' },
  { symbol: 'g', reading: 'ge', meaning: 'Hard before a/o/u, throaty before e/i' },
  { symbol: 'h', reading: 'hache', meaning: 'Always silent' },
  { symbol: 'i', reading: 'i', meaning: 'Like "ee" in "see"' },
  { symbol: 'j', reading: 'jota', meaning: 'Throaty "h"' },
  { symbol: 'k', reading: 'ka', meaning: 'Only in loanwords' },
  { symbol: 'l', reading: 'ele', meaning: 'As in English' },
  { symbol: 'm', reading: 'eme', meaning: 'As in English' },
  { symbol: 'n', reading: 'ene', meaning: 'As in English' },
  { symbol: 'ñ', reading: 'eñe', meaning: '"ny" as in "canyon"' },
  { symbol: 'o', reading: 'o', meaning: 'Pure "oh", no glide' },
  { symbol: 'p', reading: 'pe', meaning: 'Unaspirated' },
  { symbol: 'q', reading: 'cu', meaning: 'Always written "qu"' },
  { symbol: 'r', reading: 'erre', meaning: 'Tapped; rolled at word start' },
  { symbol: 's', reading: 'ese', meaning: 'As in English' },
  { symbol: 't', reading: 'te', meaning: 'Unaspirated, tongue on teeth' },
  { symbol: 'u', reading: 'u', meaning: 'Like "oo"; silent in "que"/"gui"' },
  { symbol: 'v', reading: 'uve', meaning: 'Same sound as "b"' },
  { symbol: 'w', reading: 'uve doble', meaning: 'Only in loanwords' },
  { symbol: 'x', reading: 'equis', meaning: '"ks", or "h" in some names' },
  { symbol: 'y', reading: 'ye', meaning: 'Like "y"; "ee" when alone' },
  { symbol: 'z', reading: 'zeta', meaning: '"s" in Latin America, "th" in Spain' },
];

const SPANISH_SOUNDS: ReferenceEntry[] = [
  { symbol: 'rr', reading: 'erre doble', meaning: 'Rolled r — "pero" vs "perro"' },
  { symbol: 'll', reading: 'elle', meaning: 'Like "y" in most regions' },
  { symbol: 'ch', reading: 'che', meaning: 'As in "church"' },
  { symbol: 'ñ', reading: 'eñe', meaning: '"ny" as in "canyon"' },
  { symbol: 'gue', reading: 'gue', meaning: 'Hard g — the u is silent' },
  { symbol: 'güe', reading: 'güe', meaning: 'The diaeresis makes the u sound' },
  { symbol: 'que', reading: 'que', meaning: '"ke" — the u is silent' },
  { symbol: 'j / ge / gi', reading: 'jota', meaning: 'Throaty h sound' },
];

const FRENCH_SOUNDS: ReferenceEntry[] = [
  { symbol: 'an / en', reading: 'nasal a', meaning: 'Nasal vowel, n not pronounced' },
  { symbol: 'on', reading: 'nasal o', meaning: 'Nasal vowel, as in "bon"' },
  { symbol: 'in / ain', reading: 'nasal e', meaning: 'Nasal vowel, as in "pain"' },
  { symbol: 'un', reading: 'nasal u', meaning: 'Nasal vowel, as in "brun"' },
  { symbol: 'ou', reading: 'ou', meaning: 'Like "oo" in "food"' },
  { symbol: 'u', reading: 'u', meaning: 'Rounded lips, tongue on "ee"' },
  { symbol: 'eu', reading: 'eu', meaning: 'As in "deux"' },
  { symbol: 'oi', reading: 'oi', meaning: 'Sounds like "wa"' },
  { symbol: 'r', reading: 'r', meaning: 'Produced at the back of the throat' },
  { symbol: 'é', reading: 'e accent aigu', meaning: 'Closed e, as in "café"' },
  { symbol: 'è / ê', reading: 'e accent grave', meaning: 'Open e, as in "père"' },
  { symbol: 'ç', reading: 'c cédille', meaning: 'Forces a soft "s"' },
  { symbol: 'gn', reading: 'gn', meaning: '"ny" as in "montagne"' },
  { symbol: '-ent', reading: 'silent ending', meaning: 'Silent on third-person plural verbs' },
];

const GERMAN_SOUNDS: ReferenceEntry[] = [
  { symbol: 'ä', reading: 'a-Umlaut', meaning: 'Like "e" in "bet"' },
  { symbol: 'ö', reading: 'o-Umlaut', meaning: 'Rounded lips on an "e"' },
  { symbol: 'ü', reading: 'u-Umlaut', meaning: 'Rounded lips on an "ee"' },
  { symbol: 'ß', reading: 'Eszett', meaning: 'Sharp "s" after a long vowel' },
  { symbol: 'ch', reading: 'ich-Laut', meaning: 'Soft, after e/i — as in "ich"' },
  { symbol: 'ch', reading: 'ach-Laut', meaning: 'Throaty, after a/o/u — as in "Bach"' },
  { symbol: 'sch', reading: 'sch', meaning: 'Like English "sh"' },
  { symbol: 'sp- / st-', reading: 'shp / sht', meaning: '"sh" sound at the start of a word' },
  { symbol: 'z', reading: 'zett', meaning: 'Always "ts"' },
  { symbol: 'v', reading: 'vau', meaning: 'Usually "f"' },
  { symbol: 'w', reading: 'weh', meaning: 'Like English "v"' },
  { symbol: 'ei / ie', reading: 'ei / ie', meaning: '"eye" vs "ee" — say the second letter' },
];

const ITALIAN_SOUNDS: ReferenceEntry[] = [
  { symbol: 'gn', reading: 'gn', meaning: '"ny" as in "gnocchi"' },
  { symbol: 'gl', reading: 'gli', meaning: '"ly" as in "famiglia"' },
  { symbol: 'ce / ci', reading: 'che / chi', meaning: 'Soft "ch" sound' },
  { symbol: 'che / chi', reading: 'ke / ki', meaning: 'Hard "k" sound' },
  { symbol: 'ge / gi', reading: 'je / ji', meaning: 'Soft "j" sound' },
  { symbol: 'ghe / ghi', reading: 'ge / gi', meaning: 'Hard "g" sound' },
  { symbol: 'sc + e/i', reading: 'sh', meaning: 'As in "pesce"' },
  { symbol: 'z', reading: 'zeta', meaning: '"ts" or "dz"' },
  { symbol: 'double consonants', reading: 'doppie', meaning: 'Held longer — "nono" vs "nonno"' },
  { symbol: 'r', reading: 'erre', meaning: 'Tapped or rolled' },
];

const PORTUGUESE_SOUNDS: ReferenceEntry[] = [
  { symbol: 'ã', reading: 'a nasal', meaning: 'Nasal a, as in "irmã"' },
  { symbol: 'õ', reading: 'o nasal', meaning: 'Nasal o, as in "põe"' },
  { symbol: 'ão', reading: 'ão', meaning: 'Nasal diphthong, as in "não"' },
  { symbol: 'nh', reading: 'nh', meaning: '"ny" as in "banho"' },
  { symbol: 'lh', reading: 'lh', meaning: '"ly" as in "filho"' },
  { symbol: 'ç', reading: 'c cedilha', meaning: 'Always an "s" sound' },
  { symbol: 'rr / r-', reading: 'r forte', meaning: 'Throaty h in Brazilian Portuguese' },
  { symbol: 'x', reading: 'xis', meaning: 'Often "sh", as in "caixa"' },
  { symbol: '-em / -im', reading: 'nasal ending', meaning: 'Nasalised word endings' },
];

const RUSSIAN_LETTERS: ReferenceEntry[] = [
  { symbol: 'А а', reading: 'a', meaning: 'Like "a" in "father"' },
  { symbol: 'Б б', reading: 'be', meaning: 'Like "b"' },
  { symbol: 'В в', reading: 've', meaning: 'Like "v"' },
  { symbol: 'Г г', reading: 'ge', meaning: 'Like "g" in "go"' },
  { symbol: 'Д д', reading: 'de', meaning: 'Like "d"' },
  { symbol: 'Е е', reading: 'ye', meaning: 'Like "ye" in "yes"' },
  { symbol: 'Ё ё', reading: 'yo', meaning: 'Like "yo"; always stressed' },
  { symbol: 'Ж ж', reading: 'zhe', meaning: 'Like "s" in "measure"' },
  { symbol: 'З з', reading: 'ze', meaning: 'Like "z"' },
  { symbol: 'И и', reading: 'i', meaning: 'Like "ee"' },
  { symbol: 'Й й', reading: 'i kratkoye', meaning: 'Short "y" glide' },
  { symbol: 'К к', reading: 'ka', meaning: 'Like "k", unaspirated' },
  { symbol: 'Л л', reading: 'el', meaning: 'Like "l"' },
  { symbol: 'М м', reading: 'em', meaning: 'Like "m"' },
  { symbol: 'Н н', reading: 'en', meaning: 'Like "n"' },
  { symbol: 'О о', reading: 'o', meaning: '"o" when stressed, "a" when not' },
  { symbol: 'П п', reading: 'pe', meaning: 'Like "p", unaspirated' },
  { symbol: 'Р р', reading: 'er', meaning: 'Rolled "r"' },
  { symbol: 'С с', reading: 'es', meaning: 'Like "s"' },
  { symbol: 'Т т', reading: 'te', meaning: 'Like "t", unaspirated' },
  { symbol: 'У у', reading: 'u', meaning: 'Like "oo"' },
  { symbol: 'Ф ф', reading: 'ef', meaning: 'Like "f"' },
  { symbol: 'Х х', reading: 'kha', meaning: 'Throaty "h", as in "Bach"' },
  { symbol: 'Ц ц', reading: 'tse', meaning: 'Like "ts"' },
  { symbol: 'Ч ч', reading: 'che', meaning: 'Like "ch" in "chair"' },
  { symbol: 'Ш ш', reading: 'sha', meaning: 'Like "sh", tongue pulled back' },
  { symbol: 'Щ щ', reading: 'shcha', meaning: 'Softer, longer "sh"' },
  { symbol: 'Ъ ъ', reading: 'tvyordy znak', meaning: 'Hard sign — separates, no sound' },
  { symbol: 'Ы ы', reading: 'y', meaning: 'Tongue back "i", no English match' },
  { symbol: 'Ь ь', reading: 'myagky znak', meaning: 'Soft sign — softens the letter before' },
  { symbol: 'Э э', reading: 'e', meaning: 'Like "e" in "bet"' },
  { symbol: 'Ю ю', reading: 'yu', meaning: 'Like "you"' },
  { symbol: 'Я я', reading: 'ya', meaning: 'Like "ya"' },
];

const ARABIC_LETTERS: ReferenceEntry[] = [
  { symbol: 'ا', reading: 'alif', meaning: 'Long "aa"' },
  { symbol: 'ب', reading: 'baa', meaning: 'Like "b"' },
  { symbol: 'ت', reading: 'taa', meaning: 'Like "t"' },
  { symbol: 'ث', reading: 'thaa', meaning: 'Like "th" in "think"' },
  { symbol: 'ج', reading: 'jiim', meaning: 'Like "j"' },
  { symbol: 'ح', reading: 'Haa', meaning: 'Breathy h from the throat' },
  { symbol: 'خ', reading: 'khaa', meaning: 'Like "ch" in "Bach"' },
  { symbol: 'د', reading: 'daal', meaning: 'Like "d"' },
  { symbol: 'ذ', reading: 'dhaal', meaning: 'Like "th" in "this"' },
  { symbol: 'ر', reading: 'raa', meaning: 'Rolled "r"' },
  { symbol: 'ز', reading: 'zaay', meaning: 'Like "z"' },
  { symbol: 'س', reading: 'siin', meaning: 'Like "s"' },
  { symbol: 'ش', reading: 'shiin', meaning: 'Like "sh"' },
  { symbol: 'ص', reading: 'Saad', meaning: 'Emphatic "s"' },
  { symbol: 'ض', reading: 'Daad', meaning: 'Emphatic "d"' },
  { symbol: 'ط', reading: 'Taa', meaning: 'Emphatic "t"' },
  { symbol: 'ظ', reading: 'DHaa', meaning: 'Emphatic "th"' },
  { symbol: 'ع', reading: 'ayn', meaning: 'Voiced throat constriction' },
  { symbol: 'غ', reading: 'ghayn', meaning: 'Like a French "r"' },
  { symbol: 'ف', reading: 'faa', meaning: 'Like "f"' },
  { symbol: 'ق', reading: 'qaaf', meaning: 'Deep "k" from the throat' },
  { symbol: 'ك', reading: 'kaaf', meaning: 'Like "k"' },
  { symbol: 'ل', reading: 'laam', meaning: 'Like "l"' },
  { symbol: 'م', reading: 'miim', meaning: 'Like "m"' },
  { symbol: 'ن', reading: 'nuun', meaning: 'Like "n"' },
  { symbol: 'ه', reading: 'haa', meaning: 'Like "h" in "hat"' },
  { symbol: 'و', reading: 'waaw', meaning: '"w", or long "uu"' },
  { symbol: 'ي', reading: 'yaa', meaning: '"y", or long "ii"' },
];

const ARABIC_SOUNDS: ReferenceEntry[] = [
  { symbol: 'َ', reading: 'fatha', meaning: 'Short "a" above the letter' },
  { symbol: 'ِ', reading: 'kasra', meaning: 'Short "i" below the letter' },
  { symbol: 'ُ', reading: 'damma', meaning: 'Short "u" above the letter' },
  { symbol: 'ْ', reading: 'sukuun', meaning: 'No vowel on this letter' },
  { symbol: 'ّ', reading: 'shadda', meaning: 'Doubles the consonant' },
  { symbol: 'ال', reading: 'al-', meaning: 'The definite article "the"' },
  { symbol: 'ة', reading: 'taa marbuuta', meaning: 'Feminine ending' },
  { symbol: 'ً', reading: 'tanwiin', meaning: '"-an" ending, often adverbial' },
];

const KOREAN_CONSONANTS: ReferenceEntry[] = [
  { symbol: 'ㄱ', reading: 'giyeok', meaning: 'Between "g" and "k"' },
  { symbol: 'ㄴ', reading: 'nieun', meaning: 'Like "n"' },
  { symbol: 'ㄷ', reading: 'digeut', meaning: 'Between "d" and "t"' },
  { symbol: 'ㄹ', reading: 'rieul', meaning: 'Between "r" and "l"' },
  { symbol: 'ㅁ', reading: 'mieum', meaning: 'Like "m"' },
  { symbol: 'ㅂ', reading: 'bieup', meaning: 'Between "b" and "p"' },
  { symbol: 'ㅅ', reading: 'siot', meaning: 'Like "s"' },
  { symbol: 'ㅇ', reading: 'ieung', meaning: 'Silent at the start, "ng" at the end' },
  { symbol: 'ㅈ', reading: 'jieut', meaning: 'Like "j"' },
  { symbol: 'ㅊ', reading: 'chieut', meaning: 'Aspirated "ch"' },
  { symbol: 'ㅋ', reading: 'kieuk', meaning: 'Aspirated "k"' },
  { symbol: 'ㅌ', reading: 'tieut', meaning: 'Aspirated "t"' },
  { symbol: 'ㅍ', reading: 'pieup', meaning: 'Aspirated "p"' },
  { symbol: 'ㅎ', reading: 'hieut', meaning: 'Like "h"' },
];

const KOREAN_VOWELS: ReferenceEntry[] = [
  { symbol: 'ㅏ', reading: 'a', meaning: 'Like "a" in "father"' },
  { symbol: 'ㅑ', reading: 'ya', meaning: 'Like "ya"' },
  { symbol: 'ㅓ', reading: 'eo', meaning: 'Like "u" in "but"' },
  { symbol: 'ㅕ', reading: 'yeo', meaning: 'Like "yu" in "yum"' },
  { symbol: 'ㅗ', reading: 'o', meaning: 'Like "o" in "go"' },
  { symbol: 'ㅛ', reading: 'yo', meaning: 'Like "yo"' },
  { symbol: 'ㅜ', reading: 'u', meaning: 'Like "oo"' },
  { symbol: 'ㅠ', reading: 'yu', meaning: 'Like "you"' },
  { symbol: 'ㅡ', reading: 'eu', meaning: 'Lips flat, tongue back' },
  { symbol: 'ㅣ', reading: 'i', meaning: 'Like "ee"' },
];

const CHINESE_INITIALS: ReferenceEntry[] = [
  { symbol: 'b', reading: 'bo', meaning: 'Unaspirated "p"' },
  { symbol: 'p', reading: 'po', meaning: 'Aspirated "p"' },
  { symbol: 'm', reading: 'mo', meaning: 'Like "m"' },
  { symbol: 'f', reading: 'fo', meaning: 'Like "f"' },
  { symbol: 'd', reading: 'de', meaning: 'Unaspirated "t"' },
  { symbol: 't', reading: 'te', meaning: 'Aspirated "t"' },
  { symbol: 'n', reading: 'ne', meaning: 'Like "n"' },
  { symbol: 'l', reading: 'le', meaning: 'Like "l"' },
  { symbol: 'g', reading: 'ge', meaning: 'Unaspirated "k"' },
  { symbol: 'k', reading: 'ke', meaning: 'Aspirated "k"' },
  { symbol: 'h', reading: 'he', meaning: 'Throaty "h"' },
  { symbol: 'j', reading: 'ji', meaning: 'Like "j" in "jeep", tongue flat' },
  { symbol: 'q', reading: 'qi', meaning: 'Aspirated "ch", tongue flat' },
  { symbol: 'x', reading: 'xi', meaning: 'Between "s" and "sh"' },
  { symbol: 'zh', reading: 'zhi', meaning: '"j" with the tongue curled back' },
  { symbol: 'ch', reading: 'chi', meaning: '"ch" with the tongue curled back' },
  { symbol: 'sh', reading: 'shi', meaning: '"sh" with the tongue curled back' },
  { symbol: 'r', reading: 'ri', meaning: 'Between "r" and "zh"' },
  { symbol: 'z', reading: 'zi', meaning: 'Like "ds" in "kids"' },
  { symbol: 'c', reading: 'ci', meaning: 'Like "ts" in "cats", aspirated' },
  { symbol: 's', reading: 'si', meaning: 'Like "s"' },
];

const CHINESE_TONES: ReferenceEntry[] = [
  { symbol: 'mā 妈', reading: 'first tone', meaning: 'High and level — "mother"' },
  { symbol: 'má 麻', reading: 'second tone', meaning: 'Rising, like a question — "hemp"' },
  { symbol: 'mǎ 马', reading: 'third tone', meaning: 'Dips then rises — "horse"' },
  { symbol: 'mà 骂', reading: 'fourth tone', meaning: 'Sharp fall — "scold"' },
  { symbol: 'ma 吗', reading: 'neutral tone', meaning: 'Light and short — question particle' },
];

const CHINESE_FINALS: ReferenceEntry[] = [
  { symbol: 'a', reading: 'a', meaning: 'Open "ah"' },
  { symbol: 'o', reading: 'o', meaning: 'Like "aw"' },
  { symbol: 'e', reading: 'e', meaning: 'Like "uh"' },
  { symbol: 'i', reading: 'i', meaning: 'Like "ee"' },
  { symbol: 'u', reading: 'u', meaning: 'Like "oo"' },
  { symbol: 'ü', reading: 'v', meaning: 'Rounded lips on "ee"' },
  { symbol: 'ai', reading: 'ai', meaning: 'Like "eye"' },
  { symbol: 'ei', reading: 'ei', meaning: 'Like "ay"' },
  { symbol: 'ao', reading: 'ao', meaning: 'Like "ow" in "cow"' },
  { symbol: 'ou', reading: 'ou', meaning: 'Like "oh"' },
  { symbol: 'an', reading: 'an', meaning: 'Like "ahn"' },
  { symbol: 'en', reading: 'en', meaning: 'Like "un"' },
  { symbol: 'ang', reading: 'ang', meaning: 'Nasal "ahng"' },
  { symbol: 'eng', reading: 'eng', meaning: 'Nasal "ung"' },
  { symbol: 'ong', reading: 'ong', meaning: 'Nasal "oong"' },
  { symbol: 'er', reading: 'er', meaning: 'Like "are"' },
];

const JAPANESE_SOUNDS: ReferenceEntry[] = [
  { symbol: 'が ぎ ぐ げ ご', reading: 'ga gi gu ge go', meaning: 'Dakuten voices k into g' },
  { symbol: 'ざ じ ず ぜ ぞ', reading: 'za ji zu ze zo', meaning: 'Dakuten voices s into z' },
  { symbol: 'だ ぢ づ で ど', reading: 'da ji zu de do', meaning: 'Dakuten voices t into d' },
  { symbol: 'ば び ぶ べ ぼ', reading: 'ba bi bu be bo', meaning: 'Dakuten voices h into b' },
  { symbol: 'ぱ ぴ ぷ ぺ ぽ', reading: 'pa pi pu pe po', meaning: 'Handakuten turns h into p' },
  { symbol: 'きゃ きゅ きょ', reading: 'kya kyu kyo', meaning: 'Small ya/yu/yo combine sounds' },
  { symbol: 'っ', reading: 'sokuon', meaning: 'Small tsu doubles the next consonant' },
  { symbol: 'ー', reading: 'chōonpu', meaning: 'Lengthens a vowel in katakana' },
  { symbol: 'ん', reading: 'n', meaning: 'The only standalone consonant' },
  { symbol: 'は / へ', reading: 'wa / e', meaning: 'Read "wa" and "e" as particles' },
];

interface LanguageReference {
  /** The writing system itself: an alphabet, or an abjad. */
  letters?: ReferenceGroup[];
  /** Pronunciation distinctions worth drilling. */
  sounds?: ReferenceGroup[];
}

export const referenceByLanguage: Record<string, LanguageReference> = {
  es: {
    letters: [{ title: 'The Spanish alphabet', entries: SPANISH_LETTERS }],
    sounds: [{ title: 'Sounds and letter pairs', entries: SPANISH_SOUNDS }],
  },
  fr: {
    sounds: [{ title: 'Sounds and spellings', entries: FRENCH_SOUNDS }],
  },
  de: {
    sounds: [{ title: 'Sounds and spellings', entries: GERMAN_SOUNDS }],
  },
  it: {
    sounds: [{ title: 'Sounds and spellings', entries: ITALIAN_SOUNDS }],
  },
  pt: {
    sounds: [{ title: 'Sounds and spellings', entries: PORTUGUESE_SOUNDS }],
  },
  ru: {
    letters: [{ title: 'The Cyrillic alphabet', subtitle: '33 letters', entries: RUSSIAN_LETTERS }],
  },
  ar: {
    letters: [{ title: 'The Arabic alphabet', subtitle: '28 letters', entries: ARABIC_LETTERS }],
    sounds: [{ title: 'Vowel marks and spelling', entries: ARABIC_SOUNDS }],
  },
  ko: {
    letters: [
      { title: 'Hangul consonants', entries: KOREAN_CONSONANTS },
      { title: 'Hangul vowels', entries: KOREAN_VOWELS },
    ],
  },
  zh: {
    sounds: [
      { title: 'Tones', subtitle: 'The same syllable, five meanings', entries: CHINESE_TONES },
      { title: 'Pinyin initials', entries: CHINESE_INITIALS },
      { title: 'Pinyin finals', entries: CHINESE_FINALS },
    ],
  },
  ja: {
    sounds: [{ title: 'Sound marks and combinations', entries: JAPANESE_SOUNDS }],
  },
};
