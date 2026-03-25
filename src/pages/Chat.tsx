import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Send } from 'lucide-react';
import { completeWithEcho } from '../services/aiProvider';
import type { ChatMessage, EchoMode } from '../types/ai';
import {
  PageActions,
  PageContent,
  PageMainColumn,
  PageMainSidebarLayout,
  PageSidebar,
} from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { DropdownSelect } from '../components/ui/DropdownSelect';

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

function makeMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  };
}

export default function ChatPage() {
  const [mode, setMode] = useState<EchoMode>('chatty');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage('assistant', 'Hi. I am Echo. What do you want to practice today?'),
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) {
      return;
    }

    const userMessage = makeMessage('user', trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setSending(true);

    void completeWithEcho(nextMessages, mode)
      .then((reply) => {
        setMessages((prev) => [...prev, makeMessage('assistant', reply)]);
      })
      .catch((unknownError) => {
        const message = unknownError instanceof Error ? unknownError.message : 'Message failed.';
        setError(message);
      })
      .finally(() => {
        setSending(false);
        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
      });
  };

  useEffect(() => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 0);
  }, [messages.length]);

  return (
    <PageContent width="wide" className="pb-12">
      <PageActions hideSettingsButton>
      </PageActions>

      <PageMainSidebarLayout>
        <PageMainColumn className="gap-5">
          <SpotlightCard className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[13px] text-dim">Chat with Echo</p>
              <span className="text-[12px] text-dim">{mode}</span>
            </div>

            <div className="mb-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-xl px-3 py-2.5 text-[14px] leading-relaxed ${
                    message.role === 'user'
                      ? 'ml-8 border border-indigo-400/30 bg-indigo-500/20 text-white'
                      : 'mr-8 border border-white/10 bg-white/[0.03] text-mist'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {sending ? (
                <div className="mr-8 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-dim">
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              ) : null}
              <div ref={messageEndRef} />
            </div>

            {error ? (
              <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-200">
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type your message..."
                className="w-full bg-transparent px-2 text-[14px] text-white placeholder:text-dim/70 outline-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send
              </button>
            </form>
          </SpotlightCard>
        </PageMainColumn>

        <PageSidebar className="gap-5">
          <SpotlightCard className="p-5">
            <p className="mb-3 text-[12px] uppercase tracking-wider text-dim font-bold">Tools</p>
            <div className="space-y-3">
              <label className="block text-[12px] text-dim">
                Assistant mode
                <DropdownSelect
                  value={mode}
                  onChange={(next) => setMode(next as EchoMode)}
                  options={MODE_OPTIONS.map((entry) => ({ value: entry.id, label: entry.label }))}
                  className="mt-1"
                />
              </label>
              <Link to="/web-search" className="no-underline">
                <button type="button" className="page-primary-action w-full justify-center">
                  <Search size={16} /> Visit Web Search
                </button>
              </Link>
            </div>
          </SpotlightCard>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
