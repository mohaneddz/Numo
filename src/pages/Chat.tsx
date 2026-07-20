import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BookMarked,
  Brain,
  Languages,
  Loader2,
  RotateCcw,
  Send,
  Settings,
  SpellCheck2,
  SquarePen,
  Type,
  X,
} from 'lucide-react';
import { PageActions, PageContent } from '../components/layout/PageLayout';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import { useLanguageJourney } from '../contexts/LanguageJourneyContext';
import { completeLanguageChat } from '../services/aiProvider';
import {
  DEFAULT_CHAT_PREFERENCES,
  readChatPreferences,
  writeChatPreferences,
  type ChatFontSize,
  type ChatPreferences,
} from '../services/chatPreferences';
import type {
  ChatMessage,
  EchoMode,
  LanguageLearningReply,
} from '../types/ai';

const MODE_OPTIONS: Array<{ id: EchoMode; label: string }> = [
  { id: 'advisor', label: 'Advisor' },
  { id: 'chatty', label: 'Chatty' },
  { id: 'coach', label: 'Coach' },
  { id: 'analyst', label: 'Analyst' },
  { id: 'creative', label: 'Creative' },
  { id: 'therapist', label: 'Therapist' },
  { id: 'sassy', label: 'Sassy' },
  { id: 'guardian', label: 'Guardian' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Default' },
  { value: 'large', label: 'Large' },
];

const RESPONSE_LENGTH_OPTIONS = [
  { value: 'brief', label: 'Brief' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];

const FONT_CLASSES: Record<ChatFontSize, {
  message: string;
  target: string;
  pronunciation: string;
  meaning: string;
}> = {
  small: {
    message: 'text-[13px]',
    target: 'text-[15px]',
    pronunciation: 'text-[8px]',
    meaning: 'text-[12px]',
  },
  medium: {
    message: 'text-[14px]',
    target: 'text-[17px]',
    pronunciation: 'text-[9px]',
    meaning: 'text-[13px]',
  },
  large: {
    message: 'text-[16px]',
    target: 'text-[20px]',
    pronunciation: 'text-[11px]',
    meaning: 'text-[15px]',
  },
};

function ChatToggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 ${
        checked ? 'bg-violet-500' : 'bg-white/10'
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function makeMessage(
  role: ChatMessage['role'],
  content: string,
  learningReply?: LanguageLearningReply,
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
    learningReply,
  };
}

function LearningReplyCard({
  reply,
  languageCode,
  preferences,
  onOpenSettings,
}: {
  reply: LanguageLearningReply;
  languageCode: string;
  preferences: ChatPreferences;
  onOpenSettings: () => void;
}) {
  const rightToLeft = languageCode === 'ar';
  const font = FONT_CLASSES[preferences.fontSize];
  const showWordLayer = preferences.showTargetLanguage || preferences.showPronunciation;
  if (!showWordLayer && !preferences.showEnglishMeaning) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-[12px] text-dim hover:border-violet-400/30 hover:text-white"
      >
        This response is hidden by Chat Settings. Change visible response parts.
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {showWordLayer ? <section>
        <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-[#A78BFA]">
          <Languages size={12} />
          {preferences.showTargetLanguage ? 'Target language' : 'Pronunciation'}
          {preferences.showTargetLanguage && preferences.showPronunciation ? ' · pronunciation below' : ''}
        </div>
        <div
          dir={rightToLeft ? 'rtl' : 'ltr'}
          className="flex flex-wrap items-start gap-x-3 gap-y-4"
          aria-label={reply.targetText}
        >
          {reply.words.map((word, index) => (
            <span
              key={`${word.text}-${index}`}
              className="inline-flex min-w-0 flex-col items-center text-center"
            >
              {preferences.showTargetLanguage ? (
                <span className={`${font.target} font-bold leading-snug text-white`}>{word.text}</span>
              ) : null}
              {preferences.showPronunciation ? (
                <span
                  dir="ltr"
                  className={`${preferences.showTargetLanguage ? 'mt-1' : ''} ${font.pronunciation} max-w-40 font-semibold leading-tight tracking-wide text-cyan-200/75`}
                >
                  {word.pronunciation || '\u00A0'}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </section> : null}

      {preferences.showEnglishMeaning ? <section className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.055] px-4 py-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
          <SpellCheck2 size={12} /> English meaning · main language
        </div>
        <p className={`${font.meaning} leading-relaxed text-cyan-50/80`}>{reply.englishMeaning}</p>
      </section> : null}
    </div>
  );
}

export default function ChatPage() {
  const { activeLanguage } = useLanguage();
  const { state: appDataState, dueCount, flashCardCount } = useAppData();
  const { getSettings: getJourneySettings } = useLanguageJourney();
  const [preferences, setPreferences] = useState<ChatPreferences>(readChatPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const conversationIdRef = useRef(0);
  const font = FONT_CLASSES[preferences.fontSize];
  const mode = preferences.assistantMode;

  const updatePreferences = (patch: Partial<ChatPreferences>) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      writeChatPreferences(next);
      return next;
    });
  };

  const clearChat = () => {
    conversationIdRef.current += 1;
    setMessages([]);
    setInput('');
    setError(null);
    setSending(false);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage = makeMessage('user', trimmed);
    const nextMessages = [...messages, userMessage];
    const conversationId = conversationIdRef.current;
    const journey = getJourneySettings(activeLanguage.code);
    const notebookMemory = preferences.progressionMemory && preferences.notebookMemory
      ? appDataState.notebookEntries
          .slice(0, 8)
          .map((entry) => `${entry.term} = ${entry.translation}; tags: ${entry.tags.join(', ') || 'none'}`)
          .join(' | ')
      : '';
    const progressionContext = preferences.progressionMemory
      ? [
          `Level: ${journey.level}.`,
          `Primary goal: ${journey.primaryGoal}; focus: ${journey.focus}; preferred difficulty: ${journey.difficulty}.`,
          `Study plan: ${journey.sessionsPerWeek} sessions/week, ${journey.sessionMinutes} minutes/session.`,
          `Progress: ${activeLanguage.progress.totalXP} XP, ${activeLanguage.progress.currentStreak}-day streak, ${activeLanguage.progress.todayMinutes}/${activeLanguage.progress.dailyGoalMinutes} minutes today.`,
          `Learning evidence: ${flashCardCount} review items, ${dueCount} due, ${appDataState.speakingRuns.length} speaking attempts, ${appDataState.writingDrafts.length} writing drafts.`,
          notebookMemory ? `Retrieved Notebook memory: ${notebookMemory}` : '',
        ].filter(Boolean).join(' ')
      : undefined;
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setSending(true);

    void completeLanguageChat(nextMessages, activeLanguage, mode, {
      responseLength: preferences.responseLength,
      progressionContext,
    })
      .then((reply) => {
        if (conversationIdRef.current !== conversationId) return;
        setMessages((previous) => [
          ...previous,
          makeMessage(
            'assistant',
            `${reply.targetText}\nEnglish meaning: ${reply.englishMeaning}`,
            reply,
          ),
        ]);
      })
      .catch((unknownError) => {
        if (conversationIdRef.current !== conversationId) return;
        setError(unknownError instanceof Error ? unknownError.message : 'Message failed.');
      })
      .finally(() => {
        if (conversationIdRef.current !== conversationId) return;
        setSending(false);
        window.setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
      });
  };

  useEffect(() => {
    window.setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 0);
  }, [messages.length]);

  useEffect(() => {
    clearChat();
  }, [activeLanguage.code]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen]);

  return (
    <PageContent width="wide" className="h-full min-h-[calc(100vh-10rem)] gap-0">
      <PageActions hideSettingsButton className="shrink-0 pb-3">
        <button
          type="button"
          onClick={clearChat}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 text-[12px] font-bold text-mist transition hover:border-violet-400/30 hover:bg-violet-400/10 hover:text-white"
        >
          <SquarePen size={15} />
          New chat
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 text-[12px] font-bold text-mist transition hover:border-violet-400/30 hover:bg-violet-400/10 hover:text-white"
        >
          <Settings size={15} />
          Settings
        </button>
      </PageActions>

      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#080d1b]/55 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-10 pt-5 sm:px-8 lg:px-12">
            {messages.length === 0 && !sending ? (
              <div className="flex flex-1 items-center justify-center py-16 text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-[#A78BFA] shadow-[0_0_30px_rgba(139,92,246,0.16)]">
                    <Languages size={22} />
                  </div>
                  <h2 className="mt-5 text-[22px] font-black text-white">
                    Start a conversation in {activeLanguage.name}
                  </h2>
                  <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-dim">
                    Echo responds naturally in {activeLanguage.name}, places pronunciation beneath every word, and finishes with the complete English meaning.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <article
                      className={`${font.message} leading-relaxed ${
                        message.role === 'user'
                          ? 'max-w-[min(78%,44rem)] rounded-[22px] rounded-br-md border border-violet-400/25 bg-violet-500/15 px-4 py-3 text-white'
                          : 'w-full text-mist'
                      }`}
                    >
                      {message.role === 'assistant' && message.learningReply ? (
                        <LearningReplyCard
                          reply={message.learningReply}
                          languageCode={activeLanguage.code}
                          preferences={preferences}
                          onOpenSettings={() => setSettingsOpen(true)}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </article>
                  </div>
                ))}
                {sending ? (
                  <div className="inline-flex items-center gap-2 text-[13px] text-dim">
                    <Loader2 size={14} className="animate-spin text-violet-300" />
                    Echo is thinking
                  </div>
                ) : null}
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.07] bg-[#080d1b]/90 px-3 pb-3 pt-3 backdrop-blur-xl sm:px-6 sm:pb-5">
          <div className="mx-auto w-full max-w-5xl">
            {error ? (
              <div className="mb-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
                {error}
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="rounded-[20px] border border-white/12 bg-white/[0.045] p-2 shadow-[0_14px_40px_rgba(0,0,0,0.28)] transition focus-within:border-violet-400/40 focus-within:bg-white/[0.06]"
            >
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={`Message Echo in English or ${activeLanguage.name}...`}
                className="max-h-40 min-h-12 w-full resize-none bg-transparent px-3 py-3 text-[14px] leading-relaxed text-white placeholder:text-dim/65 outline-none"
              />
              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <div className="flex min-w-0 items-center gap-2 px-2">
                  <span className="hidden truncate text-[10px] text-dim sm:block">
                    {activeLanguage.name}
                    {' · '}{MODE_OPTIONS.find((entry) => entry.id === mode)?.label ?? mode}
                    {preferences.showPronunciation ? ' · pronunciation' : ''}
                    {preferences.showEnglishMeaning ? ' · English meaning' : ''}
                    {preferences.progressionMemory ? ' · memory on' : ' · memory off'}
                  </span>
                </div>
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={sending || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white shadow-[0_0_18px_rgba(139,92,246,0.35)] transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] text-dim/70">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      </section>

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-settings-title"
            className="max-h-[min(760px,90vh)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/10 bg-[#0a1020]/98 shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#0a1020]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div>
                <h2 id="chat-settings-title" className="text-[18px] font-black text-white">
                  Chat Settings
                </h2>
                <p className="mt-0.5 text-[11px] text-dim">
                  Control this conversation’s appearance, response layers, and learning memory.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close chat settings"
                onClick={() => setSettingsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-dim hover:bg-white/5 hover:text-white"
              >
                <X size={17} />
              </button>
            </header>

            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
                  <Type size={14} /> Appearance and length
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                    <span className="block text-[13px] font-bold text-white">Assistant mode</span>
                    <span className="mb-3 mt-1 block text-[11px] text-dim">Changes Echo’s conversational style and teaching approach.</span>
                    <DropdownSelect
                      value={mode}
                      onChange={(value) => updatePreferences({ assistantMode: value as EchoMode })}
                      options={MODE_OPTIONS.map((entry) => ({ value: entry.id, label: entry.label }))}
                    />
                  </label>
                  <label className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                    <span className="block text-[13px] font-bold text-white">Chat font size</span>
                    <span className="mb-3 mt-1 block text-[11px] text-dim">Changes messages, target text, spelling, and meanings.</span>
                    <DropdownSelect
                      value={preferences.fontSize}
                      onChange={(value) => updatePreferences({ fontSize: value as ChatFontSize })}
                      options={FONT_SIZE_OPTIONS}
                    />
                  </label>
                  <label className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                    <span className="block text-[13px] font-bold text-white">Response length</span>
                    <span className="mb-3 mt-1 block text-[11px] text-dim">Controls how much target-language text Echo generates.</span>
                    <DropdownSelect
                      value={preferences.responseLength}
                      onChange={(value) => updatePreferences({
                        responseLength: value as ChatPreferences['responseLength'],
                      })}
                      options={RESPONSE_LENGTH_OPTIONS}
                    />
                  </label>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
                  <Languages size={14} /> Response parts
                </div>
                <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025]">
                  {[
                    {
                      title: 'Target language',
                      description: `Show Echo’s natural ${activeLanguage.name} response.`,
                      checked: preferences.showTargetLanguage,
                      onChange: (checked: boolean) => updatePreferences({ showTargetLanguage: checked }),
                    },
                    {
                      title: 'Pronunciation / spelling',
                      description: 'Show the pronunciation guide aligned with each generated word.',
                      checked: preferences.showPronunciation,
                      onChange: (checked: boolean) => updatePreferences({ showPronunciation: checked }),
                    },
                    {
                      title: 'English meaning',
                      description: 'Show the complete meaning in the app’s main language.',
                      checked: preferences.showEnglishMeaning,
                      onChange: (checked: boolean) => updatePreferences({ showEnglishMeaning: checked }),
                    },
                  ].map((setting) => (
                    <div key={setting.title} className="flex items-center justify-between gap-5 px-4 py-4">
                      <div>
                        <p className="text-[13px] font-bold text-white">{setting.title}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-dim">{setting.description}</p>
                      </div>
                      <ChatToggle checked={setting.checked} onChange={setting.onChange} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
                  <Brain size={14} /> Progress and retrieval memory
                </div>
                <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025]">
                  <div className="flex items-center justify-between gap-5 px-4 py-4">
                    <div>
                      <p className="text-[13px] font-bold text-white">Progression memory</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-dim">
                        Adapt replies using your real level, goal, focus, streak, XP, review queue, and practice history.
                      </p>
                    </div>
                    <ChatToggle
                      checked={preferences.progressionMemory}
                      onChange={(checked) => updatePreferences({ progressionMemory: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-5 px-4 py-4">
                    <div>
                      <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                        <BookMarked size={14} className="text-cyan-300" /> Notebook retrieval
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-dim">
                        Retrieve a small set of recent saved terms so Echo can reinforce vocabulary you actually collected.
                      </p>
                    </div>
                    <ChatToggle
                      checked={preferences.notebookMemory}
                      disabled={!preferences.progressionMemory}
                      onChange={(checked) => updatePreferences({ notebookMemory: checked })}
                    />
                  </div>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-dim/75">
                  Memory is assembled locally for each request. Turning it off excludes progression and Notebook data from the AI prompt.
                </p>
              </section>
            </div>

            <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/8 bg-[#0a1020]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <button
                type="button"
                onClick={() => {
                  const defaults = { ...DEFAULT_CHAT_PREFERENCES };
                  setPreferences(defaults);
                  writeChatPreferences(defaults);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-[12px] font-bold text-dim hover:bg-white/5 hover:text-white"
              >
                <RotateCcw size={14} /> Reset defaults
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="h-10 rounded-xl bg-violet-500 px-5 text-[12px] font-black text-white hover:bg-violet-400"
              >
                Done
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </PageContent>
  );
}
