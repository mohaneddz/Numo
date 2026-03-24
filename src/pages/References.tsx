import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronDown,
    Search,
    Lock,
    Layers3,
    Download,
} from 'lucide-react';
import { PageContent } from '../components/layout/PageLayout';

type ReferenceTab = 'Characters' | 'Sounds' | 'Words';

type StatTone = 'amber' | 'cyan' | 'violet';

interface CharacterCard {
    id: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
    locked?: boolean;
}

interface SectionData {
    title: string;
    progressLabel?: string;
    cards: CharacterCard[];
}

const tabs: ReferenceTab[] = ['Characters', 'Sounds', 'Words'];

const recentlyDiscovered: CharacterCard[] = [
    { id: '1', hanzi: '妈', pinyin: 'ma', meaning: 'mother', locked: true },
    { id: '2', hanzi: '车', pinyin: 'che', meaning: 'car' },
    { id: '3', hanzi: '牛', pinyin: 'niu', meaning: 'cow', locked: true },
    { id: '4', hanzi: '来', pinyin: 'lai', meaning: 'come', locked: true },
    { id: '5', hanzi: '睡觉', pinyin: 'shuijiao', meaning: 'sleep', locked: true },
    { id: '6', hanzi: '玻', pinyin: 'bo', meaning: 'glass', locked: true },
];

const soundsData: CharacterCard[] = [
    { id: 's1', hanzi: 'a', pinyin: 'a', meaning: 'vowel' },
    { id: 's2', hanzi: 'o', pinyin: 'o', meaning: 'vowel', locked: true },
    { id: 's3', hanzi: 'b', pinyin: 'b', meaning: 'consonant', locked: true },
    { id: 's4', hanzi: 'p', pinyin: 'p', meaning: 'consonant', locked: true },
    { id: 's5', hanzi: 'm', pinyin: 'm', meaning: 'consonant' },
    { id: 's6', hanzi: 'f', pinyin: 'f', meaning: 'consonant', locked: true },
];

const wordsData: CharacterCard[] = [
    { id: 'w1', hanzi: '你好', pinyin: 'nihao', meaning: 'hello' },
    { id: 'w2', hanzi: '谢谢', pinyin: 'xiexie', meaning: 'thanks', locked: true },
    { id: 'w3', hanzi: '再见', pinyin: 'zaijian', meaning: 'goodbye' },
    { id: 'w4', hanzi: '对不起', pinyin: 'duibuqi', meaning: 'sorry', locked: true },
    { id: 'w5', hanzi: '没关系', pinyin: 'meiguanxi', meaning: 'never mind', locked: true },
    { id: 'w6', hanzi: '早上好', pinyin: 'zaoshang hao', meaning: 'good morning', locked: true },
];

const sections: SectionData[] = [
    { title: 'Recently Discovered', cards: recentlyDiscovered },
    {
        title: 'HSK 1',
        progressLabel: '32 / 150 discovered',
        cards: [
            { id: '7', hanzi: '白', pinyin: 'bai', meaning: 'white' },
            { id: '8', hanzi: '因', pinyin: 'yin', meaning: 'cause', locked: true },
            { id: '9', hanzi: '文', pinyin: 'wen', meaning: 'language', locked: true },
            { id: '10', hanzi: '牛', pinyin: 'niu', meaning: 'cow' },
            { id: '11', hanzi: '役', pinyin: 'yi', meaning: 'service', locked: true },
            { id: '12', hanzi: '姐', pinyin: 'jie', meaning: 'older sister' },
        ],
    },
    {
        title: 'HSK 2',
        progressLabel: '28 / 150 discovered',
        cards: [
            { id: '13', hanzi: '近', pinyin: 'jin', meaning: 'near', locked: true },
            { id: '14', hanzi: '客', pinyin: 'ke', meaning: 'guest', locked: true },
            { id: '15', hanzi: '家', pinyin: 'jia', meaning: 'home', locked: true },
            { id: '16', hanzi: '鹿', pinyin: 'lu', meaning: 'deer', locked: true },
            { id: '17', hanzi: '写', pinyin: 'xie', meaning: 'write', locked: true },
            { id: '18', hanzi: '齐', pinyin: 'qi', meaning: 'together' },
        ],
    },
];

const allSections: Record<ReferenceTab, SectionData[]> = {
    Characters: sections,
    Sounds: [
        { title: 'Recently Mastered Sounds', cards: soundsData },
        { title: 'Consonants', progressLabel: '21 / 23 discovered', cards: soundsData.filter((h) => h.meaning === 'consonant') },
        { title: 'Vowels', progressLabel: '13 / 39 discovered', cards: soundsData.filter((h) => h.meaning === 'vowel') },
    ],
    Words: [
        { title: 'Recently Discovered Words', cards: wordsData },
        { title: 'HSK 1 Words', progressLabel: '32 / 150 discovered', cards: wordsData.slice(0, 3) },
        { title: 'HSK 2 Words', progressLabel: '15 / 150 discovered', cards: wordsData.slice(3) },
    ],
};

const lockToneClasses = [
    'text-[#f8c15e]',
    'text-[#39d9de]',
    'text-[#a98bff]',
    'text-[#f8c15e]',
];

const statToneClasses: Record<StatTone, { fill: string; glow: string }> = {
    amber: {
        fill: 'bg-[linear-gradient(90deg,#f3b54e,#e39e2e)]',
        glow: 'shadow-[0_0_16px_rgba(243,181,78,0.55)]',
    },
    cyan: {
        fill: 'bg-[linear-gradient(90deg,#57dbe7,#35b8e3)]',
        glow: 'shadow-[0_0_16px_rgba(76,216,229,0.5)]',
    },
    violet: {
        fill: 'bg-[linear-gradient(90deg,#9b7dfd,#7c5eff)]',
        glow: 'shadow-[0_0_16px_rgba(143,118,255,0.5)]',
    },
};

function CharacterCardTile({ card, index }: { card: CharacterCard; index: number }) {
    return (
        <article className="group relative min-h-[168px] rounded-[18px] border border-white/8 bg-[linear-gradient(150deg,rgba(15,22,49,0.86),rgba(7,11,28,0.9))] p-4 shadow-[0_12px_28px_rgba(2,6,20,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#6d5ff8]/45 hover:shadow-[0_12px_32px_rgba(87,68,214,0.28)]">
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_80%_20%,rgba(99,106,255,0.18),transparent_52%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-[52px] leading-[0.95] font-light text-[#ecf3ff]">{card.hanzi}</p>
                    {card.locked ? (
                        <Lock size={16} className={`mt-1 ${lockToneClasses[index % lockToneClasses.length]}`} />
                    ) : (
                        <span className="mt-1 inline-block h-4 w-4 rounded-full border border-white/15" />
                    )}
                </div>
                <div className="mt-auto space-y-1">
                    <p className="text-[24px] leading-none text-white/96">{card.pinyin}</p>
                    <p className="text-[18px] leading-none text-dim/88">{card.meaning}</p>
                </div>
            </div>
        </article>
    );
}

function StatBlock({
    value,
    suffix,
    width,
    tone,
}: {
    value: string;
    suffix?: string;
    width: string;
    tone: StatTone;
}) {
    const toneClass = statToneClasses[tone];

    return (
        <div className="space-y-3 pr-4">
            <p className="text-[18px] font-medium text-white">
                {value}
                {suffix ? <span className="text-dim"> {suffix}</span> : null}
            </p>
            <div className="h-1.5 rounded-full bg-white/8">
                <div className={`h-full rounded-full ${toneClass.fill} ${toneClass.glow}`} style={{ width }} />
            </div>
        </div>
    );
}

function SectionHeader({
    title,
    rightLabel,
    isFirst,
}: {
    title: string;
    rightLabel?: string;
    isFirst: boolean;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-end gap-3">
                <h3 className="text-[34px] leading-none font-medium tracking-tight text-white">{title}</h3>
                {rightLabel ? <p className="pb-1 text-[18px] text-dim">{rightLabel}</p> : null}
            </div>
            <div className="inline-flex items-center gap-4 rounded-full border border-white/8 bg-[#0c1538]/70 px-4 py-1.5 text-[15px] text-dim">
                {isFirst ? (
                    <>
                        <span className="inline-flex items-center gap-1.5">
                            <Layers3 size={14} /> A..
                        </span>
                        <span>227</span>
                    </>
                ) : (
                    <>
                        <span className="inline-flex items-center gap-1.5">
                            <Layers3 size={14} /> 12
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Download size={14} /> 150
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ReferencesPage() {
    const [activeTab, setActiveTab] = useState<ReferenceTab>('Characters');
    const [subTab, setSubTab] = useState<ReferenceTab>('Characters');
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);

    const filteredSections = useMemo(() => {
        const currentSections = allSections[subTab];
        if (!search.trim()) return currentSections;

        const query = search.toLowerCase();
        return currentSections
            .map((section) => ({
                ...section,
                cards: section.cards.filter(
                    (card) =>
                        card.hanzi.includes(search) ||
                        card.pinyin.toLowerCase().includes(query) ||
                        card.meaning.toLowerCase().includes(query),
                ),
            }))
            .filter((section) => section.cards.length > 0);
    }, [search, subTab]);

    return (
        <PageContent width="wide" className="pb-16">
            <div className="space-y-5">
                <section className="space-y-5">
                    <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,13,33,0.76),rgba(8,12,31,0.92))] p-4 shadow-[0_18px_40px_rgba(5,10,25,0.55)]">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                            <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-[#111b46]/70 px-4 text-[26px] font-medium text-white">
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#de4a2e] px-1 text-[10px] font-semibold uppercase">CN</span>
                                Chinese
                                <ChevronDown size={18} className="ml-1 text-dim" />
                            </button>

                            <label className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1537]/70 px-4 text-dim transition-colors focus-within:border-[#6f6dff]/60">
                                <Search size={18} className="text-dim" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search characters, sounds, words..."
                                    className="h-full w-full bg-transparent text-[17px] text-white placeholder:text-dim/60 outline-none"
                                />
                            </label>

                            <div className="ml-auto inline-flex items-center gap-3 pr-2">
                                <span className="text-[17px] text-white/95">Show All</span>
                                <button
                                    onClick={() => setShowAll((prev) => !prev)}
                                    className={`flex h-7 w-14 items-center rounded-full border px-[3px] transition-colors ${showAll
                                        ? 'border-[#7f79ff]/70 bg-[#151f4a]'
                                        : 'border-white/12 bg-[#10172f]'
                                        }`}
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full transition-transform ${showAll
                                            ? 'translate-x-7 bg-[linear-gradient(120deg,#c5c7ff,#796bff)]'
                                            : 'translate-x-0 bg-white/75'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setSubTab(tab);
                                    }}
                                    className={`h-11 rounded-full px-9 text-[28px] transition-all ${activeTab === tab
                                        ? 'border border-[#6781ff]/45 bg-[linear-gradient(120deg,rgba(46,65,152,0.75),rgba(27,39,94,0.8))] text-white shadow-[inset_0_0_16px_rgba(100,119,255,0.35)]'
                                        : 'border border-white/10 bg-[#0d1535]/45 text-dim hover:text-white/90'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="relative mt-4 overflow-hidden rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(9,15,37,0.92),rgba(8,13,30,0.95))] p-4">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_50%,rgba(93,116,255,0.2),transparent_40%)]" />
                            <div className="grid grid-cols-1 gap-4 pr-0 xl:grid-cols-[1fr_1fr_1fr_200px] xl:items-end">
                                <StatBlock value="120" suffix="/ 3,000" width="78%" tone="amber" />
                                <StatBlock value="34" suffix="/ 62" width="71%" tone="cyan" />
                                <StatBlock value="784" width="84%" tone="violet" />
                                <div className="hidden justify-center xl:flex">
                                    <img
                                        src="/figure/excited.png"
                                        alt="Echo"
                                        className="h-[132px] w-[132px] object-contain drop-shadow-[0_0_22px_rgba(101,117,255,0.58)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,13,34,0.8),rgba(6,10,24,0.92))] p-5 shadow-[0_18px_40px_rgba(4,8,20,0.52)]">
                        <div className="mb-5 flex items-center gap-6 border-b border-white/8 pb-3">
                            {tabs.map((tab) => (
                                <button
                                    key={`sub-${tab}`}
                                    onClick={() => setSubTab(tab)}
                                    className={`relative pb-1 text-[36px] leading-none transition-colors ${subTab === tab
                                        ? 'text-white'
                                        : 'text-dim hover:text-white/90'
                                        }`}
                                >
                                    {tab}
                                    {subTab === tab ? (
                                        <span className="absolute -bottom-[7px] left-0 h-[3px] w-14 rounded-full bg-[linear-gradient(90deg,#4f7dff,#92a4ff)]" />
                                    ) : null}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-10">
                            {filteredSections.map((section, sectionIndex) => (
                                <section key={section.title} className="space-y-4">
                                    <SectionHeader title={section.title} rightLabel={section.progressLabel} isFirst={sectionIndex === 0} />

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                                        {(showAll ? section.cards : section.cards.slice(0, 6)).map((card, cardIndex) => (
                                            <motion.div
                                                key={card.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: cardIndex * 0.03, duration: 0.24 }}
                                            >
                                                <CharacterCardTile card={card} index={cardIndex} />
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </PageContent>
    );
}
