import { invoke } from '@tauri-apps/api/core';
import { requireOnline } from './localRuntimeSettings';
import { isTauri } from '@tauri-apps/api/core';
import type { TranscriptLine } from '../pages/Immerse/immersionCatalog';

const CACHE_NAME = 'numo-youtube-transcripts-v1';
const memoryCache = new Map<string, TranscriptLine[]>();

interface CaptionTrack {
  language: string;
  format: string;
  content: string;
}

interface CaptionCue {
  start: number;
  duration: number;
  text: string;
}

interface Json3Caption {
  events?: Array<{
    tStartMs?: number;
    dDurationMs?: number;
    segs?: Array<{ utf8?: string }>;
  }>;
}

function cleanCaptionText(text: string): string {
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\[(?:music|música|applause|aplausos)\]/gi, '')
    .trim();
}

function parseJson3(content: string): CaptionCue[] {
  const payload = JSON.parse(content) as Json3Caption;
  const cues: CaptionCue[] = [];
  for (const event of payload.events ?? []) {
    const text = cleanCaptionText(
      (event.segs ?? []).map((segment) => segment.utf8 ?? '').join(''),
    );
    if (!text || cues[cues.length - 1]?.text === text) continue;
    cues.push({
      start: (event.tStartMs ?? 0) / 1000,
      duration: Math.max(1, (event.dDurationMs ?? 2500) / 1000),
      text,
    });
  }
  return cues;
}

function timestampToSeconds(value: string): number {
  const parts = value.replace(',', '.').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function parseVtt(content: string): CaptionCue[] {
  const blocks = content.replace(/\r/g, '').split(/\n\n+/);
  const cues: CaptionCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const [startText, endText] = lines[timingIndex].split('-->').map((part) => part.trim().split(' ')[0]);
    const text = cleanCaptionText(
      lines
        .slice(timingIndex + 1)
        .join(' ')
        .replace(/<[^>]+>/g, ''),
    );
    if (!text || cues[cues.length - 1]?.text === text) continue;
    const start = timestampToSeconds(startText);
    const end = timestampToSeconds(endText);
    cues.push({ start, duration: Math.max(1, end - start), text });
  }
  return cues;
}

function parseTrack(track?: CaptionTrack): CaptionCue[] {
  if (!track) return [];
  try {
    return track.format === 'json3'
      ? parseJson3(track.content)
      : parseVtt(track.content);
  } catch {
    return [];
  }
}

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, '0')}`;
}

function buildTranscript(tracks: CaptionTrack[]): TranscriptLine[] {
  const sourceTrack = tracks.find((track) => track.language.startsWith('es')) ?? tracks[0];
  const translationTrack = tracks.find((track) => track.language.startsWith('en'));
  const sourceCues = parseTrack(sourceTrack);
  const translationCues = parseTrack(translationTrack);
  let translationIndex = 0;

  return sourceCues.slice(0, 2500).map((cue, index) => {
    while (
      translationIndex + 1 < translationCues.length &&
      translationCues[translationIndex + 1].start <= cue.start
    ) {
      translationIndex += 1;
    }
    const currentTranslation = translationCues[translationIndex];
    const nextTranslation = translationCues[translationIndex + 1];
    const nearestTranslation = [currentTranslation, nextTranslation]
      .filter((candidate): candidate is CaptionCue => Boolean(candidate))
      .sort(
        (left, right) =>
          Math.abs(left.start - cue.start) - Math.abs(right.start - cue.start),
      )[0];
    const alignedTranslation =
      nearestTranslation && Math.abs(nearestTranslation.start - cue.start) <= 2.5
        ? nearestTranslation
        : undefined;
    return {
      id: `youtube-caption-${index + 1}`,
      start: cue.start,
      time: formatTime(cue.start),
      source: cue.text,
      translation: alignedTranslation?.text ?? '',
      explanation: 'Public caption track supplied by the streaming source.',
      vocabulary: [],
    };
  });
}

async function readCache(videoId: string): Promise<TranscriptLine[] | null> {
  if (!('caches' in window)) return memoryCache.get(videoId) ?? null;
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(`${window.location.origin}/__numo/youtube-transcript/${videoId}`);
  if (!response) return null;
  try {
    return await response.json() as TranscriptLine[];
  } catch {
    return null;
  }
}

async function writeCache(videoId: string, lines: TranscriptLine[]) {
  memoryCache.set(videoId, lines);
  if (!('caches' in window)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    `${window.location.origin}/__numo/youtube-transcript/${videoId}`,
    new Response(JSON.stringify(lines), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

export async function loadYouTubeTranscript(videoId: string): Promise<TranscriptLine[]> {
  const cached = await readCache(videoId);
  if (cached) return cached;
  requireOnline('YouTube transcripts');
  if (!isTauri()) return [];

  const tracks = await invoke<CaptionTrack[]>('fetch_youtube_captions', { videoId });
  const lines = buildTranscript(tracks);
  await writeCache(videoId, lines);
  return lines;
}
