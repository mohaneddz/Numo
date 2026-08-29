import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Check, PenTool, Search } from 'lucide-react';
import { PageActions, PageContent } from '../components/layout/PageLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import {
  availableTabs,
  buildReferenceSections,
  summarizeProgress,
  type ReferenceCard,
  type ReferenceSource,
  type ReferenceTab,
} from '../services/reference/referenceLibrary';

const TAB_LABELS: Record<ReferenceTab, string> = {
  characters: 'Writing',
  sounds: 'Sounds',
  words: 'Your Words',
};

const TAB_ACCENTS: Record<ReferenceTab, string> = {
  characters: 'var(--color-amber)',
  sounds: 'var(--color-cyan)',
  words: 'var(--color-violet)',
};

/**
 * The reference hub.
 *
 * Every card here comes from real data: the stroke-order dataset, hand-authored
 * alphabet and pronunciation content, or the learner's own saved vocabulary. A
 * card is marked familiar only when the learner has genuinely met that symbol,
 * and a language with nothing real to show says so rather than being padded
 * with generated filler.
 */
export default function LibrariesPage() {
  const { activeLanguage } = useLanguage();
  const { state } = useAppData();
  const [query, setQuery] = useState('');
  const [onlyNew, setOnlyNew] = useState(false);
  const [tab, setTab] = useState<ReferenceTab>('characters');

  const source = useMemo<ReferenceSource>(
    () => ({
      languageCode: activeLanguage.code,
      languageName: activeLanguage.name,
      vocabulary: [
        ...state.notebookEntries.map((entry) => ({
          term: entry.term,
          translation: entry.translation ?? '',
          mastery: entry.mastery,
        })),
        ...state.reviewItems.map((item) => ({
          term: item.term,
          translation: item.translation,
        })),
      ],
    }),
    [activeLanguage.code, activeLanguage.name, state.notebookEntries, state.reviewItems],
  );

  const tabs = useMemo(() => availableTabs(source), [source]);
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  const sections = useMemo(
    () => (activeTab ? buildReferenceSections(activeTab, source) : []),
    [activeTab, source],
  );

  const progress = useMemo(() => summarizeProgress(sections), [sections]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        cards: section.cards.filter((card) => {
          if (onlyNew && card.familiar) return false;
          if (!search) return true;
          return (
            card.symbol.toLowerCase().includes(search)
            || card.reading.toLowerCase().includes(search)
            || card.meaning.toLowerCase().includes(search)
          );
        }),
      }))
      .filter((section) => section.cards.length > 0);
  }, [onlyNew, query, sections]);

  if (tabs.length === 0) {
    return (
      <PageContent width="wide" className="pb-16">
        <Header languageName={activeLanguage.name} />
        <div className="rounded-xl border border-white/5 bg-graphite p-8 text-center">
          <BookOpen size={28} className="mx-auto mb-3 text-dim" />
          <p className="text-mist">No reference material for {activeLanguage.name} yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-dim">
            Words you save while learning will show up here. Start a lesson, or add words from
            reading and listening, and this page fills in with your own vocabulary.
          </p>
          <Link to="/learn" className="no-underline">
            <button className="page-primary-action mt-4">Go to Learning</button>
          </Link>
        </div>
      </PageContent>
    );
  }

  const accent = activeTab ? TAB_ACCENTS[activeTab] : 'var(--color-violet)';

  return (
    <PageContent width="wide" className="pb-16">
      <PageActions hideSettingsButton />
      <Header languageName={activeLanguage.name} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-white/5 bg-graphite p-1">
          {tabs.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                activeTab === option ? 'text-mist' : 'text-dim hover:text-mist'
              }`}
              style={activeTab === option ? { background: 'rgba(255,255,255,0.06)' } : undefined}
            >
              {TAB_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this reference"
            className="w-full rounded-full border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-mist placeholder:text-dim/70"
          />
        </div>

        <button
          type="button"
          onClick={() => setOnlyNew((on) => !on)}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
            onlyNew
              ? 'border-violet/40 bg-violet-dim text-violet'
              : 'border-white/10 text-dim hover:text-mist'
          }`}
        >
          Not yet met
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-white/5 bg-graphite p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-dim">
            {progress.familiar} of {progress.total} met through your own study
          </span>
          <span style={{ color: accent }}>{progress.percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-white/5 bg-graphite px-4 py-8 text-center text-sm text-dim">
          {onlyNew
            ? 'You have met everything here already.'
            : `Nothing in this reference matches “${query}”.`}
        </p>
      ) : (
        <div className="space-y-6">
          {filtered.map((section) => (
            <section key={section.title}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-lg text-mist">{section.title}</h2>
                {section.subtitle && <p className="text-xs text-dim">{section.subtitle}</p>}
                <span className="ml-auto text-xs text-dim">{section.cards.length}</span>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                {section.cards.map((card) => (
                  <ReferenceTile key={card.id} card={card} accent={accent} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageContent>
  );
}

function Header({ languageName }: { languageName: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-heading text-3xl text-mist">{languageName} Reference</h1>
      <p className="mt-1 text-sm text-dim">
        The writing system, the sounds, and the words you have collected so far.
      </p>
    </header>
  );
}

function ReferenceTile({ card, accent }: { card: ReferenceCard; accent: string }) {
  const body = (
    <div
      className={`flex h-full flex-col justify-between rounded-lg border p-3 transition-colors ${
        card.familiar
          ? 'border-white/10 bg-white/[0.04]'
          : 'border-white/5 bg-black/20'
      } ${card.practiceTo ? 'hover:border-white/25' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-xl leading-tight text-mist"
          style={card.familiar ? { color: accent } : undefined}
        >
          {card.symbol}
        </span>
        {card.familiar && <Check size={13} className="mt-1 shrink-0 text-mint" />}
        {card.practiceTo && !card.familiar && (
          <PenTool size={12} className="mt-1 shrink-0 text-dim" />
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xs text-dim" title={card.reading}>
          {card.reading}
        </p>
        <p className="truncate text-[11px] text-dim/70" title={card.meaning}>
          {card.meaning}
        </p>
      </div>
    </div>
  );

  if (!card.practiceTo) return body;

  return (
    <Link to={card.practiceTo} className="no-underline" title={`Practise writing ${card.symbol}`}>
      {body}
    </Link>
  );
}
