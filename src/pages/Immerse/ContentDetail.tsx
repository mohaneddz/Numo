import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AudioLines,
  BookMarked,
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Headphones,
  Highlighter,
  Languages,
  ListMusic,
  Maximize2,
  MessageSquareText,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat2,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Shuffle,
  TimerReset,
  Volume2,
  VolumeX,
  Youtube,
} from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import {
  demoReading,
  getImmersionResource,
  immersionResources,
  type ImmersionResource,
  type TranscriptLine,
} from './immersionCatalog';
import {
  getCachedYouTubeMetadata,
  loadYouTubeMetadata,
  type YouTubeResourceMetadata,
} from '../../services/youtubeService';
import { loadBookText, type ResolvedBook } from '../../services/bookContentService';
import { runtimeKernel } from '../../runtime/runtimeKernel';
import {
  getCachedAudioArtwork,
  loadAudioArtwork,
  type ResolvedAudioArtwork,
} from '../../services/audioArtworkService';
import CachedMediaImage from '../../components/ui/CachedMediaImage';
import NaturalReadingExperience from './ReadingExperience';
import { getLocalBook, localBookToResource } from '../../services/localBookService';
import YouTubePlayer, {
  type YouTubePlayerHandle,
} from '../../components/media/YouTubePlayer';
import { loadYouTubeTranscript } from '../../services/youtubeTranscriptService';

const highlightStyles = {
  violet: 'border-[#8B5CF6]/45 bg-[#8B5CF6]/15',
  cyan: 'border-cyan-400/40 bg-cyan-400/10',
  amber: 'border-amber-300/40 bg-amber-300/10',
};

const readerThemes = {
  midnight: { background: '#090D18', source: '#E7E9F3', translation: '#B9C4D8', border: 'rgba(255,255,255,0.08)' },
  paper: { background: '#E9E1CF', source: '#27231D', translation: '#4D493F', border: 'rgba(39,35,29,0.14)' },
  sepia: { background: '#2A2118', source: '#F2D9B1', translation: '#CDBB9D', border: 'rgba(242,217,177,0.12)' },
};

const readerFonts = {
  literary: 'Georgia, Cambria, "Times New Roman", serif',
  clean: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
};

const unavailableCaptionLine: TranscriptLine = {
  id: 'captions-unavailable',
  start: 0,
  time: '0:00',
  source: 'No public captions are available for this stream.',
  translation: '',
  explanation: 'Playback remains available through the original YouTube source.',
  vocabulary: [],
};

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function DetailActions() {
  return (
    <PageActions>
      <Link to="/immerse" className="no-underline">
        <button type="button" className="page-primary-action">
          <ArrowLeft size={15} /> Back to Immersion
        </button>
      </Link>
    </PageActions>
  );
}

function TranscriptPanel({
  lines,
  activeIndex,
  showTranslation,
  onSelect,
  status,
}: {
  lines: TranscriptLine[];
  activeIndex: number;
  showTranslation: boolean;
  onSelect: (index: number) => void;
  status?: string;
}) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1020]/88">
      <div className="border-b border-white/8 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#A78BFA]">Live language</p>
            <h2 className="mt-1 text-[16px] font-black text-white">Transcript</h2>
          </div>
          <MessageSquareText size={18} className="text-[#A78BFA]" />
        </div>
        <label className="relative mt-3 block">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            placeholder="Search transcript"
            className="w-full rounded-xl border border-white/8 bg-black/20 py-2 pl-8 pr-3 text-[11px] text-white outline-none placeholder:text-dim/70"
          />
        </label>
      </div>

      <div className="max-h-[470px] flex-1 space-y-1 overflow-y-auto p-2">
        {lines.length === 0 && (
          <div className="flex min-h-48 items-center justify-center p-5 text-center">
            <p className="max-w-56 text-[11px] leading-relaxed text-dim">
              {status || 'No public caption track is available for this source.'}
            </p>
          </div>
        )}
        {lines.map((line, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => onSelect(index)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                active
                  ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/14'
                  : 'border-transparent hover:border-white/8 hover:bg-white/[0.025]'
              }`}
            >
              <div className="flex gap-3">
                <span className={`mt-0.5 text-[9px] font-black ${active ? 'text-[#C4B5FD]' : 'text-dim'}`}>
                  {line.time}
                </span>
                <div className="min-w-0">
                  <p className={`text-[12px] leading-relaxed ${active ? 'font-bold text-white' : 'text-mist'}`}>
                    {line.source}
                  </p>
                  {showTranslation && (
                    <p className="mt-1 text-[11px] leading-relaxed text-dim">{line.translation}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function CurrentLineTools({
  line,
  saved,
  onSave,
  onReplay,
  onSlowPlayback,
}: {
  line: TranscriptLine;
  saved: boolean;
  onSave: () => void;
  onReplay: () => void;
  onSlowPlayback: () => void;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-[24px] border border-white/10 bg-[#0B1020]/82 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#A78BFA]" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A78BFA]">Current line</p>
          </div>
          <span className="text-[10px] font-bold text-dim">{line.time}</span>
        </div>

        <p className="mt-4 text-[18px] font-black leading-relaxed text-white">{line.source}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-cyan-100/75">{line.translation}</p>
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-dim">Why it works</p>
          <p className="mt-2 text-[12px] leading-relaxed text-mist">{line.explanation}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onReplay} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-mist hover:text-white">
            <Repeat2 size={13} /> Replay line
          </button>
          <button type="button" onClick={onSlowPlayback} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-mist hover:text-white">
            <Gauge size={13} /> Slow playback
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${
              saved
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-white/8 bg-white/[0.035] text-mist hover:text-white'
            }`}
          >
            {saved ? <Check size={13} /> : <BookmarkPlus size={13} />}
            {saved ? 'Saved' : 'Save line'}
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-[#0B1020]/82 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-dim">Useful vocabulary</p>
        <div className="mt-3 space-y-2">
          {line.vocabulary.map((word) => (
            <button
              key={word.term}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3 text-left hover:border-[#8B5CF6]/30"
            >
              <span className="text-[12px] font-black text-white">{word.term}</span>
              <span className="ml-3 text-right text-[10px] text-dim">{word.meaning}</span>
            </button>
          ))}
        </div>
        <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6]/15 px-3 py-2.5 text-[11px] font-black text-[#C4B5FD] hover:bg-[#8B5CF6]/20">
          <BookMarked size={13} /> Add both to Notebook
        </button>
      </div>
    </section>
  );
}

function MediaExperience({ resource }: { resource: ImmersionResource }) {
  const isVideo = resource.kind === 'video';
  const [youtube, setYoutube] = useState<YouTubeResourceMetadata | null>(
    () => getCachedYouTubeMetadata(resource.id),
  );
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const [audioArtwork, setAudioArtwork] = useState<ResolvedAudioArtwork | null>(
    isVideo ? null : getCachedAudioArtwork(resource.id),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [savedLines, setSavedLines] = useState<string[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(72);
  const [loopLine, setLoopLine] = useState(false);
  const [followTranscript, setFollowTranscript] = useState(true);
  const [sleepTimer, setSleepTimer] = useState('Off');
  const [streamCurrentSeconds, setStreamCurrentSeconds] = useState(0);
  const [streamDurationSeconds, setStreamDurationSeconds] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [transcriptStatus, setTranscriptStatus] = useState('Waiting for a streaming source…');
  const activeLine = transcriptLines[activeIndex] ?? unavailableCaptionLine;
  const lineCount = Math.max(1, transcriptLines.length);

  useEffect(() => {
    if (!isPlaying || youtube) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= lineCount - 1) {
          setIsPlaying(false);
          return current;
        }
        return loopLine ? current : current + 1;
      });
    }, 3600 / playbackRate);
    return () => window.clearInterval(timer);
  }, [isPlaying, lineCount, loopLine, playbackRate, youtube]);

  const progress = youtube && streamDurationSeconds > 0
    ? (streamCurrentSeconds / streamDurationSeconds) * 100
    : ((activeIndex + 1) / lineCount) * 100;
  const waveform = [22, 40, 65, 36, 78, 52, 88, 44, 68, 30, 74, 48, 92, 60, 35, 70, 50, 82, 42, 64, 28, 56, 76, 46, 66, 38, 85, 54, 72, 32];
  const audioQueue = immersionResources
    .filter((item) => item.kind === 'audio' && item.id !== resource.id)
    .slice(0, 3);

  useEffect(() => {
    setAudioArtwork(isVideo ? null : getCachedAudioArtwork(resource.id));
  }, [isVideo, resource.id]);

  useEffect(() => {
    if (isVideo || audioArtwork) return;
    void loadAudioArtwork([resource]).then((resolved) => {
      setAudioArtwork(resolved[resource.id] ?? null);
    });
  }, [audioArtwork, isVideo, resource]);

  useEffect(() => {
    const cached = getCachedYouTubeMetadata(resource.id);
    if (cached) {
      setYoutube(cached);
      return;
    }
    setYoutube(null);
    setIsPlaying(false);
    setStreamCurrentSeconds(0);
    setStreamDurationSeconds(0);
    void loadYouTubeMetadata([resource])
      .then((metadata) => setYoutube(metadata[resource.id] ?? null))
      .catch(() => setYoutube(null));
  }, [resource]);

  useEffect(() => {
    if (!youtube) return;
    let cancelled = false;
    setTranscriptStatus('Loading public YouTube captions…');
    setTranscriptLines([]);
    setActiveIndex(0);
    void loadYouTubeTranscript(youtube.videoId)
      .then((lines) => {
        if (cancelled) return;
        setTranscriptLines(lines);
        setTranscriptStatus(
          lines.length > 0
            ? `${lines.length} real caption lines loaded.`
            : 'This source does not expose a public Spanish or English caption track.',
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setTranscriptStatus(error instanceof Error ? error.message : 'Could not load public captions.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [youtube]);

  useEffect(() => {
    const minutes = Number.parseInt(sleepTimer, 10);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const timer = window.setTimeout(() => {
      playerRef.current?.pause();
      setIsPlaying(false);
      setSleepTimer('Off');
    }, minutes * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [sleepTimer]);

  const handleStreamProgress = useCallback((currentSeconds: number, durationSeconds: number) => {
    setStreamCurrentSeconds(currentSeconds);
    setStreamDurationSeconds(durationSeconds);
    if (durationSeconds <= 0 || transcriptLines.length === 0) return;
    const nextLine = transcriptLines[activeIndex + 1];
    if (loopLine && nextLine && currentSeconds >= nextLine.start) {
      playerRef.current?.seekTo(transcriptLines[activeIndex].start);
      return;
    }
    if (!followTranscript) return;
    let nextIndex = 0;
    for (let index = 0; index < transcriptLines.length; index += 1) {
      if (transcriptLines[index].start > currentSeconds) break;
      nextIndex = index;
    }
    setActiveIndex(nextIndex);
  }, [activeIndex, followTranscript, loopLine, transcriptLines]);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const togglePlayback = () => {
    if (!youtube) {
      setIsPlaying((current) => !current);
      return;
    }
    if (isPlaying) playerRef.current?.pause();
    else playerRef.current?.play();
  };

  const seekToFraction = (fraction: number) => {
    if (youtube) playerRef.current?.seekToFraction(fraction);
    setActiveIndex(Math.min(
      lineCount - 1,
      Math.floor(fraction * lineCount),
    ));
  };

  const selectTranscriptLine = (index: number) => {
    setActiveIndex(index);
    if (youtube) playerRef.current?.seekTo(transcriptLines[index]?.start ?? 0);
  };

  return (
    <PageContent width="wide" className="pb-16">
      <DetailActions />

      <section className="mb-5 flex flex-col justify-between gap-3 rounded-[22px] border border-white/8 bg-[#0B1020]/64 px-5 py-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-[#A78BFA]">
            {isVideo ? <Play size={12} fill="currentColor" /> : <Headphones size={13} />}
            {resource.category} · {resource.level}
          </div>
          <h1 className="mt-1 text-[22px] font-black text-white">{youtube?.title || resource.title}</h1>
          <p className="mt-1 text-[11px] text-dim">
            {youtube?.channel || audioArtwork?.creator || resource.author || resource.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTranslation((current) => !current)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${
              showTranslation
                ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                : 'border-white/8 bg-white/[0.03] text-dim'
            }`}
          >
            <Languages size={14} /> Translation
          </button>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-dim hover:text-white">
            <Bookmark size={14} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#070B16]">
          {isVideo ? (
            <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${resource.accent}`}>
              {youtube && (
                <YouTubePlayer
                  ref={playerRef}
                  videoId={youtube.videoId}
                  volume={volume}
                  playbackRate={playbackRate}
                  onPlayingChange={handlePlayingChange}
                  onProgress={handleStreamProgress}
                  className="absolute inset-0 h-full w-full"
                />
              )}
              {youtube && <div className="pointer-events-none absolute inset-0 bg-black/15" />}
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_30%_30%,rgba(255,255,255,.3),transparent_2px)] [background-size:34px_34px]" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
              <button
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlayback}
                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-[0_15px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform hover:scale-105"
              >
                {isPlaying ? <Pause size={25} fill="currentColor" /> : <Play size={25} fill="currentColor" className="ml-1" />}
              </button>
              <div className="absolute inset-x-8 bottom-7 text-center">
                <p className="text-[18px] font-black leading-relaxed text-white drop-shadow-lg">{activeLine.source}</p>
                {showTranslation && <p className="mt-1 text-[12px] text-white/70">{activeLine.translation}</p>}
              </div>
              <button type="button" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/25 text-white/75 backdrop-blur-md">
                <Maximize2 size={15} />
              </button>
            </div>
          ) : (
            <div className={`relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${resource.accent} px-8 py-10`}>
              <div className="absolute inset-0 bg-[#050816]/45" />
              <div className="audio-breathe absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_50%_40%,rgba(255,255,255,.55),transparent_1px)] [background-size:26px_26px]" />

              <div className="relative flex items-center justify-center">
                <div className={`absolute h-44 w-44 rounded-full border border-violet-300/30 ${isPlaying ? 'audio-orbit' : ''}`}>
                  <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_16px_rgba(165,243,252,0.9)]" />
                </div>
                <div className={`absolute h-36 w-36 rounded-full border border-white/10 ${isPlaying ? 'audio-breathe' : ''}`} />
                {audioArtwork?.artworkUrl ? (
                  <CachedMediaImage
                    src={audioArtwork.artworkUrl}
                    alt={`Artwork for ${resource.title}`}
                    eager
                    className={`relative h-32 w-32 rounded-[30px] border border-white/20 object-cover shadow-[0_22px_65px_rgba(0,0,0,0.5)] ${isPlaying ? 'audio-breathe' : ''}`}
                  />
                ) : (
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-[30px] border border-white/15 bg-black/30 text-white shadow-[0_22px_65px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    <AudioLines size={42} />
                  </div>
                )}
              </div>

              <div className="relative mt-7 flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
                <AudioLines size={12} className={isPlaying ? 'text-emerald-300' : 'text-white/50'} />
                <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]' : 'bg-white/35'}`} />
                {isPlaying ? 'Now playing' : 'Ready to play'}
              </div>
              <h2 className="relative mt-4 text-center text-[25px] font-black text-white">{resource.title}</h2>
              <p className="relative mt-1 text-[12px] text-white/60">{audioArtwork?.creator || resource.author || resource.category}</p>

              <div className="relative mt-8 flex h-20 w-full max-w-2xl items-center justify-center gap-1.5">
                {waveform.map((height, index) => {
                  const reached = index / waveform.length <= progress / 100;
                  return (
                    <button
                      type="button"
                      aria-label={`Seek to ${Math.round((index / waveform.length) * 100)} percent`}
                      onClick={() => seekToFraction(index / waveform.length)}
                      key={`${height}-${index}`}
                      className={`w-1.5 rounded-full transition-colors hover:bg-white ${reached ? 'bg-cyan-200 shadow-[0_0_10px_rgba(165,243,252,0.4)]' : 'bg-white/15'} ${isPlaying ? 'audio-bar-dance' : ''}`}
                      style={{ height: `${height}%`, animationDelay: `${index * -55}ms`, animationDuration: `${650 + (index % 5) * 100}ms` }}
                    />
                  );
                })}
              </div>
              <p className="relative mt-3 max-w-2xl text-center text-[12px] leading-relaxed text-white/75">{activeLine.source}</p>
              {youtube && (
                <div className="relative mt-6 w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-black/35 shadow-[0_20px_55px_rgba(0,0,0,0.38)] backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/65">
                      <Youtube size={13} className="text-red-400" /> Streaming source
                    </span>
                    <span className="max-w-[65%] truncate text-[9px] font-semibold text-white/45">{youtube.channel}</span>
                  </div>
                  <YouTubePlayer
                    ref={playerRef}
                    videoId={youtube.videoId}
                    volume={volume}
                    playbackRate={playbackRate}
                    onPlayingChange={handlePlayingChange}
                    onProgress={handleStreamProgress}
                    className="aspect-video w-full"
                  />
                </div>
              )}
            </div>
          )}

          <div className="p-4">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-cyan-400 to-emerald-300 shadow-[0_0_14px_rgba(103,232,249,0.5)] transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="w-20 text-[10px] font-bold text-dim">{activeLine.time}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  title="Replay previous line"
                  onClick={() => {
                    if (youtube) playerRef.current?.seekBy(-8);
                    else setActiveIndex(Math.max(0, activeIndex - 1));
                  }}
                  className="text-dim hover:text-white"
                >
                  <SkipBack size={17} />
                </button>
                {!isVideo && (
                  <button type="button" title="Back 15 seconds" onClick={() => youtube ? playerRef.current?.seekBy(-15) : setActiveIndex(Math.max(0, activeIndex - 2))} className="rounded-full px-1 text-[9px] font-black text-dim hover:text-white">15</button>
                )}
                <button
                  type="button"
                  aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                  onClick={togglePlayback}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8B5CF6] text-white shadow-[0_8px_24px_rgba(139,92,246,0.3)]"
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                {!isVideo && (
                  <button type="button" title="Forward 15 seconds" onClick={() => youtube ? playerRef.current?.seekBy(15) : setActiveIndex(Math.min(lineCount - 1, activeIndex + 2))} className="rounded-full px-1 text-[9px] font-black text-dim hover:text-white">15</button>
                )}
                <button
                  type="button"
                  title="Next line"
                  onClick={() => {
                    if (youtube) playerRef.current?.seekBy(8);
                    else setActiveIndex(Math.min(lineCount - 1, activeIndex + 1));
                  }}
                  className="text-dim hover:text-white"
                >
                  <SkipForward size={17} />
                </button>
              </div>
              <div className="flex w-20 items-center justify-end gap-2 text-dim">
                {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span className="text-[10px] font-bold">
                  {youtube
                    ? formatPlaybackTime(streamDurationSeconds || youtube.durationSeconds || 0)
                    : resource.duration}
                </span>
              </div>
            </div>
            {!isVideo && (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/8 pt-4 md:grid-cols-6">
                <label className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Speed</span>
                  <select value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} className="mt-1 w-full bg-transparent text-[11px] font-black text-white outline-none">
                    <option value={0.75} className="bg-[#0B1020]">0.75×</option>
                    <option value={1} className="bg-[#0B1020]">1.0×</option>
                    <option value={1.25} className="bg-[#0B1020]">1.25×</option>
                    <option value={1.5} className="bg-[#0B1020]">1.5×</option>
                  </select>
                </label>
                <label className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
                  <span className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-dim">
                    Volume <span>{volume}%</span>
                  </span>
                  <input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-2 w-full accent-[#8B5CF6]" />
                </label>
                <button type="button" onClick={() => setLoopLine((current) => !current)} className={`rounded-xl border px-3 py-2 text-left ${loopLine ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/15' : 'border-white/8 bg-white/[0.025]'}`}>
                  <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Loop line</span>
                  <span className={`mt-1 flex items-center gap-1.5 text-[11px] font-black ${loopLine ? 'text-[#C4B5FD]' : 'text-white'}`}><Repeat2 size={12} /> {loopLine ? 'On' : 'Off'}</span>
                </button>
                <button type="button" onClick={() => setFollowTranscript((current) => !current)} className={`rounded-xl border px-3 py-2 text-left ${followTranscript ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.025]'}`}>
                  <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Transcript follow</span>
                  <span className={`mt-1 block text-[11px] font-black ${followTranscript ? 'text-cyan-200' : 'text-white'}`}>{followTranscript ? 'Following' : 'Manual'}</span>
                </button>
                <button type="button" onClick={() => {
                  if (youtube) playerRef.current?.seekToFraction(0);
                  setActiveIndex(0);
                }} className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 text-left hover:border-violet-400/35">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Playback</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] font-black text-white"><Shuffle size={12} /> Restart</span>
                </button>
                <label className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
                  <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-dim"><TimerReset size={10} /> Sleep timer</span>
                  <select value={sleepTimer} onChange={(event) => setSleepTimer(event.target.value)} className="mt-1 w-full bg-transparent text-[11px] font-black text-white outline-none">
                    <option className="bg-[#0B1020]">Off</option>
                    <option className="bg-[#0B1020]">10 min</option>
                    <option className="bg-[#0B1020]">20 min</option>
                    <option className="bg-[#0B1020]">End of episode</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        </section>

        <TranscriptPanel
          lines={transcriptLines}
          activeIndex={activeIndex}
          showTranslation={showTranslation}
          onSelect={selectTranscriptLine}
          status={transcriptStatus}
        />
      </div>

      {transcriptLines.length > 0 && <div className="mt-5">
        <CurrentLineTools
          line={activeLine}
          saved={savedLines.includes(activeLine.id)}
          onReplay={() => {
            if (youtube) {
              playerRef.current?.seekTo(activeLine.start);
              playerRef.current?.play();
            }
          }}
          onSlowPlayback={() => {
            setPlaybackRate(0.75);
            playerRef.current?.setPlaybackRate(0.75);
          }}
          onSave={() =>
            setSavedLines((current) =>
              current.includes(activeLine.id)
                ? current.filter((id) => id !== activeLine.id)
                : [...current, activeLine.id],
            )
          }
        />
      </div>}

      {!isVideo && (
        <section className="mt-5 rounded-[24px] border border-white/10 bg-[#0B1020]/82 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[#A78BFA]"><ListMusic size={12} /> Listening queue</p>
              <h2 className="mt-1 text-[16px] font-black text-white">Up next</h2>
            </div>
            <span className="text-[10px] font-bold text-dim">{audioQueue.length} episodes</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {audioQueue.map((item, index) => (
              <Link
                key={item.id}
                to={`/immerse/${item.id}`}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3 no-underline transition-colors hover:border-[#8B5CF6]/30"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#C4B5FD]">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-black text-white">{item.title}</span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-dim">{item.duration} · {item.level}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageContent>
  );
}

export function ReadingExperience({ resource }: { resource: ImmersionResource }) {
  const [readingLines, setReadingLines] = useState(demoReading);
  const [selectedLineId, setSelectedLineId] = useState(demoReading[0].id);
  const [resolvedBook, setResolvedBook] = useState<ResolvedBook | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [bookError, setBookError] = useState('');
  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [highlightColor, setHighlightColor] = useState<keyof typeof highlightStyles>('violet');
  const [savedLines, setSavedLines] = useState<string[]>([]);
  const [readerTheme, setReaderTheme] = useState<keyof typeof readerThemes>('midnight');
  const [readerFont, setReaderFont] = useState<keyof typeof readerFonts>('literary');
  const [lineHeight, setLineHeight] = useState(1.9);
  const [pageWidth, setPageWidth] = useState<'focused' | 'comfortable' | 'wide'>('comfortable');
  const [readerLayout, setReaderLayout] = useState<'parallel' | 'stacked' | 'original' | 'translation'>('parallel');
  const [focusMode, setFocusMode] = useState(false);
  const [generatedTranslations, setGeneratedTranslations] = useState<Record<string, string>>({});
  const [translationBusy, setTranslationBusy] = useState(false);
  const selectedLine = readingLines.find((line) => line.id === selectedLineId) ?? readingLines[0];
  const selectedIndex = readingLines.findIndex((line) => line.id === selectedLine.id);
  const theme = readerThemes[readerTheme];
  const contentWidthClass =
    pageWidth === 'focused' ? 'max-w-[620px]' : pageWidth === 'comfortable' ? 'max-w-[820px]' : 'max-w-none';
  const showOriginalPage = readerLayout !== 'translation';
  const showTranslationPage = readerLayout !== 'original';
  const parallelLayout = readerLayout === 'parallel';

  useEffect(() => {
    let cancelled = false;
    setBookLoading(true);
    setBookError('');
    void loadBookText(resource)
      .then((book) => {
        if (cancelled) return;
        setResolvedBook(book);
        if (book.lines?.length) {
          setReadingLines(book.lines);
          setSelectedLineId(book.lines[0].id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setBookError(error instanceof Error ? error.message : 'Could not load the public-domain text.');
        }
      })
      .finally(() => {
        if (!cancelled) setBookLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource]);

  const toggleSaved = () => {
    setSavedLines((current) =>
      current.includes(selectedLine.id)
        ? current.filter((id) => id !== selectedLine.id)
        : [...current, selectedLine.id],
    );
  };

  const translateSelection = async () => {
    setShowTranslation(true);
    if (selectedLine.translation || generatedTranslations[selectedLine.id]) return;
    setTranslationBusy(true);
    try {
      const response = await runtimeKernel.completeWithForegroundTracking({
        temperature: 0,
        maxTokens: 700,
        messages: [
          {
            role: 'system',
            content: 'Translate the literary passage into natural, faithful English. Return only the translation.',
          },
          { role: 'user', content: selectedLine.source },
        ],
      });
      const translation = response.text.trim();
      if (!translation) throw new Error('Translation provider returned no text.');
      setGeneratedTranslations((current) => ({ ...current, [selectedLine.id]: translation }));
    } catch (error) {
      setGeneratedTranslations((current) => ({
        ...current,
        [selectedLine.id]: error instanceof Error ? error.message : 'Translation failed.',
      }));
    } finally {
      setTranslationBusy(false);
    }
  };

  return (
    <PageContent width="wide" className="pb-16">
      <DetailActions />

      <section className="rounded-[24px] border border-white/10 bg-[#0B1020]/82 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-[#A78BFA]">
              <BookMarked size={13} /> {resource.category} · {resource.level}
            </div>
            <h1 className="mt-1 text-[22px] font-black text-white">{resource.title}</h1>
            <p className="mt-1 text-[11px] text-dim">
              {resource.author} · {resource.publicationYear} · {resource.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTranslation((current) => !current)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                showTranslation
                  ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/8 bg-white/[0.03] text-dim'
              }`}
            >
              <Languages size={14} /> Translation
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
              <button type="button" onClick={() => setFontSize((size) => Math.max(13, size - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg text-dim hover:bg-white/5 hover:text-white">
                <Minus size={13} />
              </button>
              <span className="min-w-9 text-center text-[10px] font-bold text-mist">{fontSize}px</span>
              <button type="button" onClick={() => setFontSize((size) => Math.min(22, size + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg text-dim hover:bg-white/5 hover:text-white">
                <Plus size={13} />
              </button>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
              {(['violet', 'cyan', 'amber'] as const).map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`${color} highlight`}
                  onClick={() => setHighlightColor(color)}
                  className={`h-7 w-7 rounded-lg border ${highlightStyles[color]} ${highlightColor === color ? 'ring-2 ring-white/40' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/15 px-3 py-2">
          <span className="text-[9px] font-bold text-dim">
            {bookLoading
              ? 'Loading the public-domain edition...'
              : bookError
                ? `Offline preview · ${bookError}`
                : resolvedBook?.lines?.length
                  ? `${resolvedBook.lines.length} passages loaded from Project Gutenberg`
                  : 'Offline preview · full edition unavailable'}
          </span>
          {(resolvedBook?.openLibraryUrl || resource.sourceUrl) && (
            <a
              href={resolvedBook?.openLibraryUrl || resource.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] font-black text-[#C4B5FD] no-underline hover:text-white"
            >
              View source
            </a>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/8 pt-4 md:grid-cols-3 xl:grid-cols-6">
          <label className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Typeface</span>
            <select value={readerFont} onChange={(event) => setReaderFont(event.target.value as keyof typeof readerFonts)} className="mt-1 w-full bg-transparent text-[11px] font-bold text-white outline-none">
              <option value="literary" className="bg-[#0B1020]">Literary</option>
              <option value="clean" className="bg-[#0B1020]">Clean</option>
              <option value="mono" className="bg-[#0B1020]">Monospace</option>
            </select>
          </label>
          <label className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Reader theme</span>
            <select value={readerTheme} onChange={(event) => setReaderTheme(event.target.value as keyof typeof readerThemes)} className="mt-1 w-full bg-transparent text-[11px] font-bold text-white outline-none">
              <option value="midnight" className="bg-[#0B1020]">Midnight</option>
              <option value="paper" className="bg-[#0B1020]">Paper</option>
              <option value="sepia" className="bg-[#0B1020]">Sepia</option>
            </select>
          </label>
          <label className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Bilingual layout</span>
            <select value={readerLayout} onChange={(event) => setReaderLayout(event.target.value as typeof readerLayout)} className="mt-1 w-full bg-transparent text-[11px] font-bold text-white outline-none">
              <option value="parallel" className="bg-[#0B1020]">Side by side</option>
              <option value="stacked" className="bg-[#0B1020]">Stacked</option>
              <option value="original" className="bg-[#0B1020]">Original only</option>
              <option value="translation" className="bg-[#0B1020]">Translation only</option>
            </select>
          </label>
          <label className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Page width</span>
            <select value={pageWidth} onChange={(event) => setPageWidth(event.target.value as typeof pageWidth)} className="mt-1 w-full bg-transparent text-[11px] font-bold text-white outline-none">
              <option value="focused" className="bg-[#0B1020]">Focused</option>
              <option value="comfortable" className="bg-[#0B1020]">Comfortable</option>
              <option value="wide" className="bg-[#0B1020]">Wide</option>
            </select>
          </label>
          <label className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <span className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-dim">
              Line spacing <span>{lineHeight.toFixed(1)}</span>
            </span>
            <input type="range" min="1.4" max="2.4" step="0.1" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} className="mt-2 w-full accent-[#8B5CF6]" />
          </label>
          <button
            type="button"
            onClick={() => setFocusMode((current) => !current)}
            className={`rounded-xl border px-3 py-2 text-left ${focusMode ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/15' : 'border-white/8 bg-black/20'}`}
          >
            <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Reading focus</span>
            <span className={`mt-1 block text-[11px] font-bold ${focusMode ? 'text-[#C4B5FD]' : 'text-white'}`}>{focusMode ? 'Current passage' : 'Show all text'}</span>
          </button>
        </div>
      </section>

      <section
        className="mt-5 overflow-hidden rounded-[28px] border shadow-[0_30px_90px_rgba(0,0,0,0.3)]"
        style={{ backgroundColor: theme.background, borderColor: theme.border }}
      >
        <div className={`grid grid-cols-1 border-b ${parallelLayout && showOriginalPage && showTranslationPage ? 'md:grid-cols-2' : ''}`} style={{ borderColor: theme.border }}>
          {showOriginalPage && (
          <div className={`flex items-center justify-between px-6 py-4 ${parallelLayout && showTranslationPage ? 'md:border-r' : ''}`} style={{ borderColor: theme.border }}>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#A78BFA]">Original</p>
              <h2 className="mt-1 text-[14px] font-black" style={{ color: theme.source }}>Spanish</h2>
            </div>
            <Highlighter size={16} className="text-[#A78BFA]" />
          </div>
          )}
          {showTranslationPage && (
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-cyan-300">Translation</p>
              <h2 className="mt-1 text-[14px] font-black" style={{ color: theme.translation }}>English</h2>
            </div>
            <Languages size={16} className="text-cyan-300" />
          </div>
          )}
        </div>

        <div className={`grid min-h-[560px] grid-cols-1 ${parallelLayout && showOriginalPage && showTranslationPage ? 'md:grid-cols-2' : ''}`}>
          {showOriginalPage && (
          <article className={`mx-auto w-full space-y-3 p-6 md:p-9 ${contentWidthClass} ${parallelLayout && showTranslationPage ? 'md:border-r' : ''}`} style={{ borderColor: theme.border }}>
            {readingLines.map((line) => {
              const selected = line.id === selectedLine.id;
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setSelectedLineId(line.id)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected ? highlightStyles[highlightColor] : `border-transparent hover:bg-white/[0.025] ${focusMode ? 'opacity-25 hover:opacity-70' : ''}`
                  }`}
                >
                  <span style={{ fontSize, lineHeight, color: theme.source, fontFamily: readerFonts[readerFont] }}>{line.source}</span>
                </button>
              );
            })}
          </article>
          )}

          {showTranslationPage && (
          <article className={`mx-auto w-full space-y-3 p-6 transition-opacity md:p-9 ${contentWidthClass} ${showTranslation ? 'opacity-100' : 'select-none opacity-15 blur-sm'}`}>
            {readingLines.map((line) => {
              const selected = line.id === selectedLine.id;
              return (
                <button
                  key={line.id}
                  type="button"
                  disabled={!showTranslation}
                  onClick={() => setSelectedLineId(line.id)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected ? 'border-cyan-400/35 bg-cyan-400/8' : `border-transparent hover:bg-white/[0.025] ${focusMode ? 'opacity-25 hover:opacity-70' : ''}`
                  }`}
                >
                  <span style={{ fontSize, lineHeight, color: theme.translation, fontFamily: readerFonts[readerFont] }}>
                    {line.translation || generatedTranslations[line.id] || 'Select this passage and use Translate selection to create an English study translation.'}
                  </span>
                </button>
              );
            })}
          </article>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: theme.border }}>
          <button type="button" className="flex items-center gap-2 text-[11px] font-bold text-dim hover:text-white">
            <ChevronLeft size={14} /> Previous chapter
          </button>
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-dim">Chapter 1 · Page 1 of 8</span>
          <button type="button" className="flex items-center gap-2 text-[11px] font-bold text-mist hover:text-white">
            Next page <ChevronRight size={14} />
          </button>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[22px] border border-white/10 bg-[#0B1020]/82 p-5">
          <div className="flex items-center gap-2">
            <Highlighter size={15} className="text-[#A78BFA]" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A78BFA]">Selected passage</p>
          </div>
          <p className="mt-3 font-serif text-[15px] leading-relaxed text-white">{selectedLine.source}</p>
          {showTranslation && (
            <p className="mt-2 text-[12px] leading-relaxed text-cyan-100/70">
              {selectedLine.translation || generatedTranslations[selectedLine.id] || 'No English translation generated for this passage yet.'}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={translationBusy}
              onClick={() => void translateSelection()}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-mist hover:text-white disabled:opacity-50"
            >
              <Languages size={13} /> {translationBusy ? 'Translating...' : 'Translate selection'}
            </button>
            <button
              type="button"
              onClick={toggleSaved}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                savedLines.includes(selectedLine.id)
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                  : 'border-white/8 bg-white/[0.035] text-mist'
              }`}
            >
              {savedLines.includes(selectedLine.id) ? <Check size={13} /> : <BookmarkPlus size={13} />}
              {savedLines.includes(selectedLine.id) ? 'Highlight saved' : 'Save highlight'}
            </button>
            <button type="button" className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-mist hover:text-white">
              <BookMarked size={13} /> Add to Notebook
            </button>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[#0B1020]/82 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-dim">Reading position</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[22px] font-black text-white">{selectedIndex + 1}</span>
            <span className="text-[11px] font-bold text-dim">of {readingLines.length} passages</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-cyan-400" style={{ width: `${((selectedIndex + 1) / readingLines.length) * 100}%` }} />
          </div>
          <button type="button" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6]/15 py-2.5 text-[11px] font-black text-[#C4B5FD]">
            <RotateCcw size={13} /> Review highlights
          </button>
        </div>
      </section>
    </PageContent>
  );
}

export default function ContentDetail() {
  const { contentId } = useParams();
  const resource = useMemo(() => {
    const localBook = getLocalBook(contentId);
    return localBook ? localBookToResource(localBook) : getImmersionResource(contentId);
  }, [contentId]);

  if (resource.kind === 'reading') {
    return <NaturalReadingExperience resource={resource} />;
  }

  return <MediaExperience resource={resource} />;
}
