import { useCallback, useMemo, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfileSession } from '../contexts/ProfileSessionContext';
import { completeWithEcho } from '../services/aiProvider';
import {
  lookupStarterGlossary,
  normalizeGlossaryLanguageCode,
  tokenizeMarkedInteractiveText,
  upsertStarterGlossary,
  type GlossaryEntry,
} from '../services/exercises/glossaryData';

const cache = new Map<string, GlossaryEntry>();

function cacheKey(languageCode: string, token: string): string {
  return `${languageCode}:${token}`;
}

function isCandidateWord(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token);
}

async function fetchGlossaryBackfill(languageCode: string, token: string, mainLanguageCode: string): Promise<GlossaryEntry | null> {
  const prompt = `Provide compact glossary JSON for token "${token}" in language "${languageCode}" for a ${mainLanguageCode} learner.
Return JSON only: {"translation":"...","romanization":"...","partOfSpeech":"...","example":"..."}`;

  try {
    const raw = await completeWithEcho([{ id: `gloss-${Date.now()}`, role: 'user', content: prompt, createdAt: Date.now() }], 'analyst', {
      maxTokens: 180,
      responseFormat: { type: 'json_object' },
    });
    const fenced = raw.match(/```(?:json)?\n([\s\S]*?)\n```/);
    const body = fenced ? fenced[1] : raw;
    const objectText = body.match(/\{[\s\S]*\}/)?.[0] ?? body;
    const parsed = JSON.parse(objectText) as Partial<GlossaryEntry>;
    if (!parsed.translation || typeof parsed.translation !== 'string') return null;
    return {
      token,
      languageCode,
      translation: parsed.translation.trim(),
      romanization: typeof parsed.romanization === 'string' ? parsed.romanization.trim() : undefined,
      partOfSpeech: typeof parsed.partOfSpeech === 'string' ? parsed.partOfSpeech.trim() : undefined,
      example: typeof parsed.example === 'string' ? parsed.example.trim() : undefined,
    };
  } catch {
    return null;
  }
}

export function useGlossary(languageCode?: string) {
  const { activeLanguage } = useLanguage();
  const { activeProfile } = useProfileSession();
  const { createNotebookEntry } = useAppData();
  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const [hoverCount, setHoverCount] = useState(0);

  const targetLanguage = normalizeGlossaryLanguageCode(languageCode || activeLanguage.code);
  const mainLanguageCode = activeProfile?.nativeLanguageCode ?? activeProfile?.baseLanguageCode ?? 'en';

  const resolveEntry = useCallback(async (token: string): Promise<GlossaryEntry | null> => {
    const normalized = token.trim();
    if (!normalized || !isCandidateWord(normalized)) return null;

    const key = cacheKey(targetLanguage, normalized);
    if (cache.has(key)) return cache.get(key) ?? null;

    const starter = lookupStarterGlossary(targetLanguage, normalized);
    if (starter) {
      cache.set(key, starter);
      return starter;
    }

    if (targetLanguage === 'zh' || targetLanguage === 'ja') {
      for (const char of normalized) {
        const charEntry = lookupStarterGlossary(targetLanguage, char);
        if (charEntry) {
          cache.set(key, charEntry);
          return charEntry;
        }
      }
    }

    setLoadingToken(normalized);
    const backfill = await fetchGlossaryBackfill(targetLanguage, normalized, mainLanguageCode);
    setLoadingToken(null);
    if (backfill) {
      cache.set(key, backfill);
      upsertStarterGlossary(backfill);
      return backfill;
    }
    return null;
  }, [mainLanguageCode, targetLanguage]);

  const saveWord = useCallback((entry: GlossaryEntry) => {
    createNotebookEntry({
      term: entry.token,
      translation: entry.translation,
      type: 'word',
      notes: entry.example,
      tags: [targetLanguage, 'glossary'],
      source: 'manual',
      mastery: 0,
      favorited: false,
    });
  }, [createNotebookEntry, targetLanguage]);

  const tokenized = useCallback((text: string) => {
    return tokenizeMarkedInteractiveText(text, targetLanguage);
  }, [targetLanguage]);

  const api = useMemo(() => ({
    mainLanguageCode,
    targetLanguage,
    loadingToken,
    hoverCount,
    resolveEntry,
    saveWord,
    tokenized,
    trackHover: () => setHoverCount((value) => value + 1),
  }), [hoverCount, loadingToken, mainLanguageCode, resolveEntry, saveWord, targetLanguage, tokenized]);

  return api;
}

export type UseGlossaryApi = ReturnType<typeof useGlossary>;
