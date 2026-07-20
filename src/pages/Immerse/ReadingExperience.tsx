import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import type { Location } from 'epubjs/types/rendition';
import {
  ArrowLeft,
  Bookmark,
  BookmarkPlus,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Expand,
  Languages,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Settings2,
  Shrink,
  Keyboard,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ImmersionResource, ReadingLine } from './immersionCatalog';
import { demoReading } from './immersionCatalog';
import { loadBookText, type ResolvedBook } from '../../services/bookContentService';
import { readLocalBookBytes } from '../../services/localBookService';
import { runtimeKernel } from '../../runtime/runtimeKernel';

const READER_STATE_KEY = 'numo_reader_state_v1';

type ReaderLayout = 'parallel' | 'stacked' | 'original' | 'translation';
type ReaderFont = 'literary' | 'clean' | 'accessible';
type PageWidth = 'focused' | 'comfortable' | 'wide';
type HighlightColor = 'violet' | 'cyan' | 'amber';
type ReaderBackground = 'warm' | 'stone' | 'sage' | 'night';

interface ReaderBookmark {
  id: string;
  location: string;
  label: string;
  createdAt: string;
}

interface StoredBookState {
  position?: string;
  bookmarks?: ReaderBookmark[];
  fontSize?: number;
  lineHeight?: number;
  readerFont?: ReaderFont;
  pageWidth?: PageWidth;
  layout?: ReaderLayout;
  background?: ReaderBackground;
}

interface ReaderStore {
  [bookId: string]: StoredBookState;
}

const fontFamilies: Record<ReaderFont, string> = {
  literary: 'Georgia, Cambria, "Times New Roman", serif',
  clean: 'Inter, ui-sans-serif, system-ui, sans-serif',
  accessible: 'Arial, Verdana, ui-sans-serif, sans-serif',
};

const highlightColors: Record<HighlightColor, string> = {
  violet: '#c4b5fd',
  cyan: '#a5f3fc',
  amber: '#fde68a',
};

const readerBackgrounds: Record<ReaderBackground, { label: string; color: string }> = {
  warm: { label: 'Warm paper', color: '#ebe8e1' },
  stone: { label: 'Soft stone', color: '#d9dde3' },
  sage: { label: 'Quiet sage', color: '#dce4dc' },
  night: { label: 'Night desk', color: '#171b24' },
};

const TEXT_PAGE_SIZE = 4;

function readStore(): ReaderStore {
  try {
    return JSON.parse(localStorage.getItem(READER_STATE_KEY) ?? '{}') as ReaderStore;
  } catch {
    return {};
  }
}

function readBookState(bookId: string): StoredBookState {
  return readStore()[bookId] ?? {};
}

function writeBookState(bookId: string, patch: Partial<StoredBookState>) {
  const store = readStore();
  store[bookId] = { ...store[bookId], ...patch };
  localStorage.setItem(READER_STATE_KEY, JSON.stringify(store));
}

function textLines(bytes: Uint8Array): ReadingLine[] {
  const text = new TextDecoder('utf-8').decode(bytes);
  return text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 20)
    .map((source, index) => ({ id: `local-${index + 1}`, source, translation: '' }));
}

function ReaderSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-[150px]">
      <span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-[13px] font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-violet-400"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

function EpubCanvas({
  resource,
  fontSize,
  lineHeight,
  fontFamily,
  highlightColor,
  initialLocation,
  onLocation,
  onReady,
}: {
  resource: ImmersionResource;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  highlightColor: string;
  initialLocation?: string;
  onLocation: (location: Location) => void;
  onReady: (controls: { previous: () => void; next: () => void; display: (target: string) => void }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [status, setStatus] = useState('Opening EPUB…');

  useEffect(() => {
    let cancelled = false;
    let book: Book | null = null;
    let rendition: Rendition | null = null;

    const openBook = async () => {
      if (!resource.localPath || !containerRef.current) return;
      try {
        const bytes = await readLocalBookBytes(resource.localPath);
        if (cancelled) return;
        const data = bytes.slice().buffer;
        const { default: ePub } = await import('epubjs');
        if (cancelled) return;
        book = ePub(data);
        bookRef.current = book;
        await book.ready;
        if (cancelled || !containerRef.current) return;
        rendition = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'auto',
          minSpreadWidth: 1000,
        });
        renditionRef.current = rendition;
        rendition.themes.default({
          body: {
            background: '#ffffff !important',
            color: '#1f2937 !important',
            padding: '18px !important',
          },
          p: {
            'font-family': `${fontFamily} !important`,
            'font-size': `${fontSize}px !important`,
            'line-height': `${lineHeight} !important`,
          },
          '::selection': { background: `${highlightColor} !important` },
        });
        rendition.on('relocated', onLocation);
        rendition.on('selected', (cfiRange: string) => {
          rendition?.annotations.highlight(
            cfiRange,
            {},
            undefined,
            'numo-highlight',
            { fill: highlightColor, 'fill-opacity': '0.48', 'mix-blend-mode': 'multiply' },
          );
        });
        await rendition.display(initialLocation);
        onReady({
          previous: () => void rendition?.prev(),
          next: () => void rendition?.next(),
          display: (target) => void rendition?.display(target),
        });
        setStatus('');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Could not open this EPUB.');
      }
    };

    void openBook();
    return () => {
      cancelled = true;
      rendition?.destroy();
      book?.destroy();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [resource.localPath]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.themes.fontSize(`${fontSize}px`);
    rendition.themes.font(fontFamily);
    rendition.themes.override('line-height', String(lineHeight));
  }, [fontFamily, fontSize, lineHeight]);

  return (
    <div className="relative h-full min-h-[520px] bg-white">
      <div ref={containerRef} className="h-full min-h-[520px] w-full" />
      {status && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-sm font-semibold text-slate-500">
          {status}
        </div>
      )}
    </div>
  );
}

export default function ReadingExperience({ resource }: { resource: ImmersionResource }) {
  const stored = useMemo(() => readBookState(resource.id), [resource.id]);
  const [readingLines, setReadingLines] = useState<ReadingLine[]>(demoReading);
  const [resolvedBook, setResolvedBook] = useState<ResolvedBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLineId, setSelectedLineId] = useState(stored.position || demoReading[0].id);
  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize] = useState(stored.fontSize ?? 18);
  const [lineHeight, setLineHeight] = useState(stored.lineHeight ?? 1.8);
  const [readerFont, setReaderFont] = useState<ReaderFont>(stored.readerFont ?? 'literary');
  const [pageWidth, setPageWidth] = useState<PageWidth>(stored.pageWidth ?? 'wide');
  const [layout, setLayout] = useState<ReaderLayout>(stored.layout ?? 'parallel');
  const [background, setBackground] = useState<ReaderBackground>(stored.background ?? 'warm');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('violet');
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>(stored.bookmarks ?? []);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [generatedTranslations, setGeneratedTranslations] = useState<Record<string, string>>({});
  const [translationBusy, setTranslationBusy] = useState(false);
  const [epubLocation, setEpubLocation] = useState<Location | null>(null);
  const [epubControls, setEpubControls] = useState<{
    previous: () => void;
    next: () => void;
    display: (target: string) => void;
  } | null>(null);
  const [textPage, setTextPage] = useState(0);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const isEpub = resource.localFormat === 'epub';

  const selectedLine = readingLines.find((line) => line.id === selectedLineId) ?? readingLines[0];
  const widthClass = pageWidth === 'focused' ? 'max-w-[720px]' : pageWidth === 'comfortable' ? 'max-w-[980px]' : 'max-w-[1320px]';
  const showOriginal = layout !== 'translation';
  const showTranslated = layout !== 'original' && showTranslation;
  const sideBySide = layout === 'parallel' && showOriginal && showTranslated;
  const totalTextPages = Math.max(1, Math.ceil(readingLines.length / TEXT_PAGE_SIZE));
  const visibleReadingLines = readingLines.slice(
    textPage * TEXT_PAGE_SIZE,
    (textPage + 1) * TEXT_PAGE_SIZE,
  );
  const progress = isEpub
    ? Math.round((epubLocation?.start?.percentage ?? 0) * 100)
    : Math.round(((textPage + 1) / totalTextPages) * 100);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    if ('__TAURI_INTERNALS__' in window) {
      void getCurrentWindow().isFullscreen().then(setFullscreen);
    }
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (isEpub) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = resource.localFormat === 'txt' && resource.localPath
      ? readLocalBookBytes(resource.localPath).then((bytes) => ({ lines: textLines(bytes) } as ResolvedBook))
      : loadBookText(resource);
    void load
      .then((book) => {
        if (cancelled) return;
        setResolvedBook(book);
        if (book.lines?.length) {
          setReadingLines(book.lines);
          const requested = readBookState(resource.id).position;
          const requestedIndex = book.lines.findIndex((line) => line.id === requested);
          const nextIndex = requestedIndex >= 0 ? requestedIndex : 0;
          setSelectedLineId(book.lines[nextIndex].id);
          setTextPage(Math.floor(nextIndex / TEXT_PAGE_SIZE));
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load this book.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEpub, resource]);

  useEffect(() => {
    writeBookState(resource.id, { fontSize, lineHeight, readerFont, pageWidth, layout, background });
  }, [background, fontSize, layout, lineHeight, pageWidth, readerFont, resource.id]);

  const savePosition = (position: string) => {
    writeBookState(resource.id, { position });
  };

  const selectLine = (id: string) => {
    setSelectedLineId(id);
    savePosition(id);
  };

  const goToTextPage = (page: number) => {
    const nextPage = Math.max(0, Math.min(totalTextPages - 1, page));
    const firstLine = readingLines[nextPage * TEXT_PAGE_SIZE];
    setTextPage(nextPage);
    if (firstLine) selectLine(firstLine.id);
  };

  const previousPage = () => {
    if (isEpub) epubControls?.previous();
    else goToTextPage(textPage - 1);
  };

  const nextPage = () => {
    if (isEpub) epubControls?.next();
    else goToTextPage(textPage + 1);
  };

  const addBookmark = () => {
    const location = isEpub ? epubLocation?.start.cfi : selectedLine?.id;
    if (!location) return;
    if (bookmarks.some((bookmark) => bookmark.location === location)) {
      const next = bookmarks.filter((bookmark) => bookmark.location !== location);
      setBookmarks(next);
      writeBookState(resource.id, { bookmarks: next });
      return;
    }
    const label = isEpub
      ? `Page ${epubLocation?.start.displayed.page ?? bookmarks.length + 1}`
      : selectedLine.source.slice(0, 72);
    const next = [
      ...bookmarks,
      { id: crypto.randomUUID(), location, label, createdAt: new Date().toISOString() },
    ];
    setBookmarks(next);
    writeBookState(resource.id, { bookmarks: next });
  };

  const goToBookmark = (bookmark: ReaderBookmark) => {
    if (isEpub) epubControls?.display(bookmark.location);
    else {
      const lineIndex = readingLines.findIndex((line) => line.id === bookmark.location);
      if (lineIndex >= 0) setTextPage(Math.floor(lineIndex / TEXT_PAGE_SIZE));
      selectLine(bookmark.location);
      document.getElementById(`reading-line-${bookmark.location}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setBookmarksOpen(false);
  };

  const toggleFullscreen = async () => {
    if ('__TAURI_INTERNALS__' in window) {
      const appWindow = getCurrentWindow();
      const currentlyFullscreen = await appWindow.isFullscreen();
      if (!currentlyFullscreen) setExpanded(true);
      await appWindow.setFullscreen(!currentlyFullscreen);
      setFullscreen(!currentlyFullscreen);
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setFullscreen(false);
    } else {
      setExpanded(true);
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    }
  };

  const exitExpanded = async () => {
    if ('__TAURI_INTERNALS__' in window) {
      const appWindow = getCurrentWindow();
      if (await appWindow.isFullscreen()) await appWindow.setFullscreen(false);
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setFullscreen(false);
    setExpanded(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches('input, select, textarea, [contenteditable="true"]');
      if (editing && event.key !== 'Escape') return;

      if (event.key === 'Escape') {
        if (shortcutsOpen) setShortcutsOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else if (expanded || fullscreen) void exitExpanded();
        return;
      }

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setShortcutsOpen((current) => !current);
        return;
      }

      const key = event.key.toLowerCase();
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        nextPage();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        previousPage();
      } else if (event.key === 'Home' && !isEpub) {
        event.preventDefault();
        goToTextPage(0);
      } else if (event.key === 'End' && !isEpub) {
        event.preventDefault();
        goToTextPage(totalTextPages - 1);
      } else if (key === 'e') {
        event.preventDefault();
        if (expanded) void exitExpanded();
        else setExpanded(true);
      } else if (key === 'f') {
        event.preventDefault();
        void toggleFullscreen();
      } else if (key === 'b') {
        event.preventDefault();
        addBookmark();
      } else if (key === 't' && !isEpub) {
        event.preventDefault();
        setShowTranslation((current) => !current);
      } else if (key === 's') {
        event.preventDefault();
        setSettingsOpen((current) => !current);
      } else if (key === 'd') {
        event.preventDefault();
        const choices = Object.keys(readerBackgrounds) as ReaderBackground[];
        setBackground((current) => choices[(choices.indexOf(current) + 1) % choices.length]);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setFontSize((size) => Math.min(30, size + 1));
      } else if (event.key === '-') {
        event.preventDefault();
        setFontSize((size) => Math.max(13, size - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    bookmarks,
    epubControls,
    expanded,
    fullscreen,
    isEpub,
    readingLines,
    selectedLine,
    settingsOpen,
    shortcutsOpen,
    textPage,
    totalTextPages,
  ]);

  const translateSelection = async () => {
    if (!selectedLine || selectedLine.translation || generatedTranslations[selectedLine.id]) return;
    setTranslationBusy(true);
    try {
      const response = await runtimeKernel.completeWithForegroundTracking({
        temperature: 0,
        maxTokens: 700,
        messages: [
          { role: 'system', content: 'Translate the literary passage into natural, faithful English. Return only the translation.' },
          { role: 'user', content: selectedLine.source },
        ],
      });
      const translation = response.text.trim();
      if (!translation) throw new Error('Translation provider returned no text.');
      setGeneratedTranslations((current) => ({ ...current, [selectedLine.id]: translation }));
    } catch (translationError) {
      setGeneratedTranslations((current) => ({
        ...current,
        [selectedLine.id]: translationError instanceof Error ? translationError.message : 'Translation failed.',
      }));
    } finally {
      setTranslationBusy(false);
    }
  };

  const currentLocation = isEpub ? epubLocation?.start.cfi : selectedLine?.id;
  const currentBookmarked = bookmarks.some((bookmark) => bookmark.location === currentLocation);

  const experience = (
    <div className="pb-16">
      {!expanded && (
        <div className="mb-4 flex items-center justify-between">
          <Link to="/immerse" className="flex items-center gap-2 text-[12px] font-bold text-slate-300 no-underline hover:text-white">
            <ArrowLeft size={15} /> Back to Immersion
          </Link>
          <p className="text-[11px] text-slate-400">
            {loading ? 'Loading book…' : error || (resolvedBook?.lines?.length ? `${resolvedBook.lines.length} passages` : resource.sourceLabel)}
          </p>
        </div>
      )}

      <div
        ref={readerRef}
        className={`relative isolate overflow-hidden bg-[#f3f1ec] text-slate-900 ${
          expanded
            ? 'fixed inset-0 z-[300] flex h-screen w-screen flex-col rounded-none'
            : 'rounded-[24px] border border-slate-200 shadow-[0_30px_100px_rgba(0,0,0,0.38)]'
        }`}
      >
        <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="shrink-0 text-violet-600" />
              <h1 className="truncate text-[16px] font-bold text-slate-900">{resource.title}</h1>
            </div>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
              {resource.author} {resource.localFormat ? `· ${resource.localFormat.toUpperCase()}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEpub && (
              <button
                type="button"
                aria-label="Toggle translation"
                title="Toggle translation"
                onClick={() => setShowTranslation((current) => !current)}
                className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-bold ${
                  showTranslation ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-500'
                }`}
              >
                <Languages size={14} /> Translation
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                aria-label="Bookmarks"
                title="Bookmarks"
                onClick={() => setBookmarksOpen((current) => !current)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <Bookmark size={15} />
                {bookmarks.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-violet-600 px-1 text-[9px] font-bold leading-4 text-white">
                    {bookmarks.length}
                  </span>
                )}
              </button>
              {bookmarksOpen && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-[11px] font-bold text-slate-800">Bookmarks</p>
                    <span className="text-[10px] text-slate-400">{bookmarks.length}</span>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    {bookmarks.length === 0 ? (
                      <p className="px-2 py-6 text-center text-[11px] text-slate-400">No bookmarks in this book yet.</p>
                    ) : bookmarks.map((bookmark) => (
                      <div key={bookmark.id} className="group flex items-center gap-1 rounded-lg hover:bg-slate-50">
                        <button
                          type="button"
                          onClick={() => goToBookmark(bookmark)}
                          className="min-w-0 flex-1 px-2 py-2.5 text-left text-[11px] font-medium text-slate-700"
                        >
                          <span className="line-clamp-2">{bookmark.label}</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Delete bookmark"
                          onClick={() => {
                            const next = bookmarks.filter((item) => item.id !== bookmark.id);
                            setBookmarks(next);
                            writeBookState(resource.id, { bookmarks: next });
                          }}
                          className="mr-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label={currentBookmarked ? 'Remove bookmark' : 'Bookmark current position'}
              title={currentBookmarked ? 'Remove bookmark' : 'Bookmark current position'}
              onClick={addBookmark}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                currentBookmarked
                  ? 'border-violet-200 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {currentBookmarked ? <Check size={15} /> : <BookmarkPlus size={15} />}
            </button>
            <button
              type="button"
              aria-label="Reading settings"
              title="Reading settings"
              onClick={() => setSettingsOpen((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <Settings2 size={15} />
            </button>
            <button
              type="button"
              aria-label="Reader keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              onClick={() => setShortcutsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <Keyboard size={15} />
            </button>
            <button
              type="button"
              aria-label={expanded ? 'Exit expanded reader' : 'Expand reader'}
              title={expanded ? 'Exit expanded reader' : 'Expand reader'}
              onClick={() => {
                if (expanded) void exitExpanded();
                else setExpanded(true);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              {expanded ? <Shrink size={15} /> : <Expand size={15} />}
            </button>
            <button
              type="button"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={() => void toggleFullscreen()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
        </header>

        {settingsOpen && (
          <section className="relative z-10 shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-end gap-4">
              <ReaderSelect
                label="Typeface"
                value={readerFont}
                onChange={(value) => setReaderFont(value as ReaderFont)}
                options={[
                  { value: 'literary', label: 'Literary' },
                  { value: 'clean', label: 'Clean' },
                  { value: 'accessible', label: 'Accessible' },
                ]}
              />
              {!isEpub && (
                <ReaderSelect
                  label="Bilingual layout"
                  value={layout}
                  onChange={(value) => setLayout(value as ReaderLayout)}
                  options={[
                    { value: 'parallel', label: 'Side by side' },
                    { value: 'stacked', label: 'Stacked' },
                    { value: 'original', label: 'Original only' },
                    { value: 'translation', label: 'Translation only' },
                  ]}
                />
              )}
              <ReaderSelect
                label="Page width"
                value={pageWidth}
                onChange={(value) => setPageWidth(value as PageWidth)}
                options={[
                  { value: 'focused', label: 'Focused' },
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'wide', label: 'Wide' },
                ]}
              />
              <ReaderSelect
                label="Reading background"
                value={background}
                onChange={(value) => setBackground(value as ReaderBackground)}
                options={(Object.entries(readerBackgrounds) as Array<[ReaderBackground, { label: string; color: string }]>)
                  .map(([value, option]) => ({ value, label: option.label }))}
              />
              <div>
                <span className="mb-1.5 block text-[10px] font-bold text-slate-500">Text size</span>
                <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-white">
                  <button type="button" onClick={() => setFontSize((size) => Math.max(13, size - 1))} className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-50">
                    <Minus size={13} />
                  </button>
                  <span className="min-w-12 text-center text-[12px] font-bold text-slate-700">{fontSize}px</span>
                  <button type="button" onClick={() => setFontSize((size) => Math.min(30, size + 1))} className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-50">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <label className="block min-w-[180px]">
                <span className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Line spacing</span><span>{lineHeight.toFixed(1)}</span>
                </span>
                <span className="flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3">
                  <input type="range" min="1.3" max="2.5" step="0.1" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} className="w-full accent-violet-600" />
                </span>
              </label>
              <div>
                <span className="mb-1.5 block text-[10px] font-bold text-slate-500">Highlight color</span>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2">
                  {(Object.keys(highlightColors) as HighlightColor[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`${color} highlight`}
                      onClick={() => setHighlightColor(color)}
                      className={`h-6 w-6 rounded-md border border-slate-300 ${highlightColor === color ? 'ring-2 ring-violet-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: highlightColors[color] }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <main
          className={`min-h-0 flex-1 overflow-auto ${expanded ? '' : 'max-h-[calc(100vh-230px)]'}`}
          style={{ backgroundColor: readerBackgrounds[background].color }}
        >
          <div className={`mx-auto h-full w-full p-3 md:p-6 ${widthClass}`}>
            <section className="relative min-h-full overflow-hidden rounded-sm bg-white shadow-[0_12px_45px_rgba(51,44,33,0.15)]">
              {isEpub ? (
                <EpubCanvas
                  resource={resource}
                  fontSize={fontSize}
                  lineHeight={lineHeight}
                  fontFamily={fontFamilies[readerFont]}
                  highlightColor={highlightColors[highlightColor]}
                  initialLocation={stored.position}
                  onReady={setEpubControls}
                  onLocation={(location) => {
                    setEpubLocation(location);
                    savePosition(location.start.cfi);
                  }}
                />
              ) : (
                <div className={`grid min-h-[620px] grid-cols-1 ${sideBySide ? 'md:grid-cols-2' : ''}`}>
                  {showOriginal && (
                    <article className={`px-7 py-10 md:px-12 md:py-14 ${sideBySide ? 'border-r border-slate-200' : ''}`}>
                      <p className="mb-8 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Original</p>
                      <div className="space-y-2">
                        {visibleReadingLines.map((line) => (
                          <button
                            id={`reading-line-${line.id}`}
                            key={line.id}
                            type="button"
                            onClick={() => selectLine(line.id)}
                            className="block w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                            style={{
                              backgroundColor: line.id === selectedLine?.id ? highlightColors[highlightColor] : undefined,
                              fontFamily: fontFamilies[readerFont],
                              fontSize,
                              lineHeight,
                              color: '#1f2937',
                            }}
                          >
                            {line.source}
                          </button>
                        ))}
                      </div>
                    </article>
                  )}
                  {showTranslated && (
                    <article className="bg-[#fcfcfb] px-7 py-10 md:px-12 md:py-14">
                      <p className="mb-8 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">English translation</p>
                      <div className="space-y-2">
                        {visibleReadingLines.map((line) => (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => selectLine(line.id)}
                            className={`block w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:bg-slate-100 ${
                              line.id === selectedLine?.id ? 'bg-cyan-100' : ''
                            }`}
                            style={{
                              fontFamily: fontFamilies[readerFont],
                              fontSize,
                              lineHeight,
                              color: '#475569',
                            }}
                          >
                            {line.translation || generatedTranslations[line.id] || 'Select this paragraph to translate it.'}
                          </button>
                        ))}
                      </div>
                    </article>
                  )}
                  {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm font-semibold text-slate-500">Loading book…</div>}
                </div>
              )}
            </section>
          </div>
        </main>

        <footer className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 md:px-6">
          <button
            type="button"
            disabled={isEpub ? !epubControls : textPage <= 0}
            onClick={previousPage}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-35"
          >
            <ChevronLeft size={15} /> Previous
          </button>

          <div className="min-w-0 flex-1">
            <div className="mx-auto h-1.5 max-w-md overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-600 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-center text-[9px] font-bold text-slate-400">
              {isEpub
                ? `${progress}% · Page ${epubLocation?.start.displayed.page ?? 1} of ${epubLocation?.start.displayed.total ?? '—'}`
                : `Page ${textPage + 1} of ${totalTextPages} · ${visibleReadingLines.length} passages`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEpub && selectedLine && !selectedLine.translation && !generatedTranslations[selectedLine.id] && (
              <button
                type="button"
                disabled={translationBusy}
                onClick={() => void translateSelection()}
                className="hidden h-9 items-center gap-2 rounded-lg bg-cyan-50 px-3 text-[11px] font-bold text-cyan-700 hover:bg-cyan-100 disabled:opacity-50 md:flex"
              >
                <Languages size={14} /> {translationBusy ? 'Translating…' : 'Translate paragraph'}
              </button>
            )}
            <button
              type="button"
              disabled={isEpub ? !epubControls : textPage >= totalTextPages - 1}
              onClick={nextPage}
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-35"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </footer>

        {shortcutsOpen && (
          <div
            className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-5 backdrop-blur-sm"
            onClick={() => setShortcutsOpen(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Reader keyboard shortcuts"
              className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Reader controls</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Keyboard shortcuts</h2>
                </div>
                <button
                  type="button"
                  aria-label="Close shortcuts"
                  onClick={() => setShortcutsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {[
                  ['→ / Page Down / Space', 'Next page'],
                  ['← / Page Up', 'Previous page'],
                  ['Home / End', 'First / last page'],
                  ['E', 'Expand / shrink reader'],
                  ['F', 'Toggle fullscreen'],
                  ['B', 'Bookmark position'],
                  ['T', 'Toggle translation'],
                  ['S', 'Reader settings'],
                  ['D', 'Cycle background'],
                  ['+ / −', 'Change text size'],
                  ['?', 'Show shortcuts'],
                  ['Esc', 'Close / exit reader mode'],
                ].map(([keys, action]) => (
                  <div key={keys} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2">
                    <span className="text-[11px] font-medium text-slate-600">{action}</span>
                    <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-700">{keys}</kbd>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );

  return expanded ? createPortal(experience, document.body) : experience;
}
