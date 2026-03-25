import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Eye, Lightbulb, RotateCcw, XCircle } from 'lucide-react';
import { useAppData, type ReviewMode } from '../../contexts/AppDataContext';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { completeWithEcho } from '../../services/aiProvider';
import type { ReviewItem } from '../../data/types';

type CardType = 'reveal' | 'multiple' | 'write' | 'build' | 'tf' | 'tfj';
type Result = 'correct' | 'incorrect';

interface Q {
  id: string;
  type: CardType;
  term: string;
  prompt: string;
  answer: string;
  hint?: string;
  options?: string[];
  correctIndex?: number;
  statement?: string;
  correctBool?: boolean;
  bank?: string[];
  expectedReason?: string;
  sourceId?: string;
}

const validModes: ReviewMode[] = ['due-now', 'weak', 'mistakes', 'cram'];

const labels: Record<CardType, string> = {
  reveal: 'Guess & Reveal',
  multiple: 'Multiple Choice (Hard)',
  write: 'Write It (AI Check)',
  build: 'Build It',
  tf: 'True / False',
  tfj: 'True / False + Justification',
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const shuffle = <T,>(a: T[]) => {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
};

const near = (a: string) => [
  `${a} (formal)`,
  a.replace(/\bto\b\s+/i, ''),
  `${a} now`,
  a.replace(/\bthe\b\s+/i, ''),
].filter((x) => norm(x) !== norm(a));

const mutate = (a: string) => {
  const w = a.split(' ');
  return w.length > 1 ? [...w.slice(0, -1), 'yesterday'].join(' ') : `${a} (wrong)`;
};

function fromItem(it: ReviewItem, i: number): Q {
  const t: CardType[] = ['reveal', 'multiple', 'write', 'build', 'tf', 'tfj'];
  const type = t[i % t.length];
  const base = { id: `live-${it.id}-${type}`, term: it.term, answer: it.translation, sourceId: it.id } as Q;
  if (type === 'reveal') return { ...base, type, prompt: 'Guess then reveal.', hint: `Type: ${it.type}` };
  if (type === 'multiple') {
    const options = shuffle([it.translation, ...near(it.translation).slice(0, 3)]).slice(0, 4);
    return { ...base, type, prompt: 'Pick the closest meaning.', options, correctIndex: options.findIndex((o) => norm(o) === norm(it.translation)) };
  }
  if (type === 'write') return { ...base, type, prompt: 'Write the meaning. AI validates.' };
  if (type === 'build') return { ...base, type, prompt: 'Build the exact translation.', bank: shuffle(it.translation.split(/\s+/).filter(Boolean)) };
  if (type === 'tf') {
    const ok = i % 2 === 0;
    return { ...base, type, prompt: 'Is this statement true?', statement: `"${it.term}" means "${ok ? it.translation : mutate(it.translation)}".`, correctBool: ok };
  }
  const ok = i % 2 === 1;
  return {
    ...base,
    type,
    prompt: 'True/False + short reason.',
    statement: `"${it.term}" means "${ok ? it.translation : mutate(it.translation)}".`,
    correctBool: ok,
    expectedReason: ok ? `It matches ${it.translation}.` : 'Meaning does not match.',
  };
}

const dummy: Q[] = [
  { id: 'd-r1', type: 'reveal', term: 'a veces', prompt: 'Guess then reveal.', answer: 'sometimes', hint: 'Frequency adverb.' },
  { id: 'd-r2', type: 'reveal', term: 'por fin', prompt: 'Guess then reveal.', answer: 'finally / at last' },
  { id: 'd-m1', type: 'multiple', term: 'todavia', prompt: 'Pick the closest meaning.', answer: 'still / yet', options: ['already', 'still / yet', 'nearly always', 'immediately'], correctIndex: 1 },
  { id: 'd-m2', type: 'multiple', term: 'casi nunca', prompt: 'Pick the closest meaning.', answer: 'almost never', options: ['almost now', 'almost never', 'rarely always', 'never almost'], correctIndex: 1 },
  { id: 'd-w1', type: 'write', term: 'me da igual', prompt: 'Write the meaning naturally.', answer: 'i do not mind / same to me' },
  { id: 'd-w2', type: 'write', term: 'ni idea', prompt: 'Write the meaning naturally.', answer: 'no idea' },
  { id: 'd-b1', type: 'build', term: 'en realidad', prompt: 'Build the translation from tokens.', answer: 'in reality', bank: ['reality', 'in'] },
  { id: 'd-b2', type: 'build', term: 'de vez en cuando', prompt: 'Build the translation from tokens.', answer: 'from time to time', bank: ['time', 'to', 'from', 'time'] },
  { id: 'd-t1', type: 'tf', term: 'de repente', prompt: 'Is this statement true?', answer: 'suddenly', statement: '"de repente" means "suddenly".', correctBool: true },
  { id: 'd-t2', type: 'tf', term: 'en serio', prompt: 'Is this statement true?', answer: 'seriously', statement: '"en serio" means "for lunch".', correctBool: false },
  { id: 'd-j1', type: 'tfj', term: 'acabo de', prompt: 'True/False + short reason.', answer: 'i just (did something)', statement: '"acabo de" indicates recent action.', correctBool: true, expectedReason: 'It means just did something.' },
  { id: 'd-j2', type: 'tfj', term: 'en cuanto', prompt: 'True/False + short reason.', answer: 'as soon as', statement: '"en cuanto" means "because".', correctBool: false, expectedReason: 'It means as soon as, not because.' },
];

async function aiCheck(expected: string, user: string) {
  const raw = await completeWithEcho(
    [{ id: `v-${Date.now()}`, role: 'user', content: `Expected: ${expected}\nAnswer: ${user}\nReturn JSON: {"correct": boolean, "reason": string}`, createdAt: Date.now() }],
    'analyst',
  );
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  const p = JSON.parse(m[0]) as { correct?: boolean; reason?: string };
  if (typeof p.correct !== 'boolean') throw new Error('bad json');
  return { correct: p.correct, reason: p.reason?.trim() || '' };
}

async function aiCheckTfj(expectedBool: boolean, userBool: boolean, reason: string, expectedReason: string) {
  const raw = await completeWithEcho(
    [{ id: `j-${Date.now()}`, role: 'user', content: `Expected bool: ${expectedBool}\nUser bool: ${userBool}\nUser reason: ${reason}\nReference: ${expectedReason}\nReturn JSON: {"correct": boolean, "reason": string}`, createdAt: Date.now() }],
    'analyst',
  );
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  const p = JSON.parse(m[0]) as { correct?: boolean; reason?: string };
  if (typeof p.correct !== 'boolean') throw new Error('bad json');
  return { correct: p.correct, reason: p.reason?.trim() || '' };
}

export default function ReviewSession() {
  const [sp] = useSearchParams();
  const modeParam = sp.get('mode') as ReviewMode | null;
  const mode: ReviewMode = validModes.includes(modeParam as ReviewMode) ? (modeParam as ReviewMode) : 'due-now';
  const { startReviewSession, gradeReviewItem } = useAppData();
  const queue = useMemo(() => startReviewSession(mode).queue, [mode, startReviewSession]);
  const cards = useMemo(() => [...queue.map((it, i) => fromItem(it, i)), ...dummy], [queue]);

  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, Result>>({});
  const [fb, setFb] = useState<Record<string, string>>({});
  const [rev, setRev] = useState(false);
  const [hint, setHint] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [txt, setTxt] = useState('');
  const [build, setBuild] = useState<string[]>([]);
  const [tf, setTf] = useState<boolean | null>(null);
  const [why, setWhy] = useState('');
  const [checking, setChecking] = useState(false);
  const graded = useRef(new Set<string>());
  const cur = cards[i];

  useEffect(() => {
    setRev(false);
    setHint(false);
    setPick(null);
    setTxt('');
    setBuild([]);
    setTf(null);
    setWhy('');
  }, [i]);

  const done = cur ? ans[cur.id] : undefined;
  const total = cards.length;
  const complete = i === total;
  const correct = Object.values(ans).filter((x) => x === 'correct').length;

  const grade = (r: Result, message?: string) => {
    if (!cur || ans[cur.id]) return;
    setAns((p) => ({ ...p, [cur.id]: r }));
    if (message) setFb((p) => ({ ...p, [cur.id]: message }));
    if (cur.sourceId && !graded.current.has(cur.sourceId)) {
      gradeReviewItem(cur.sourceId, r);
      graded.current.add(cur.sourceId);
    }
  };

  const next = () => setI((x) => (x < total ? x + 1 : x));
  const prev = () => setI((x) => (x > 0 ? x - 1 : x));

  const submitWrite = async () => {
    if (!cur || cur.type !== 'write' || done || checking) return;
    setChecking(true);
    try {
      const r = await aiCheck(cur.answer, txt);
      grade(r.correct ? 'correct' : 'incorrect', r.reason || (r.correct ? 'Accepted by AI.' : `Expected: ${cur.answer}`));
    } catch {
      const ok = norm(txt) && (norm(txt).includes(norm(cur.answer)) || norm(cur.answer).includes(norm(txt)));
      grade(ok ? 'correct' : 'incorrect', ok ? 'Accepted in fallback.' : `Expected: ${cur.answer} (fallback)`);
    } finally {
      setChecking(false);
    }
  };

  const submitTfj = async () => {
    if (!cur || cur.type !== 'tfj' || done || checking || tf === null) return;
    setChecking(true);
    try {
      const r = await aiCheckTfj(Boolean(cur.correctBool), tf, why, cur.expectedReason || '');
      grade(r.correct ? 'correct' : 'incorrect', r.reason || (r.correct ? 'Accepted by AI.' : 'Rejected by AI.'));
    } catch {
      const ok = tf === cur.correctBool && norm(why).length > 12;
      grade(ok ? 'correct' : 'incorrect', ok ? 'Accepted in fallback.' : `Expected ${cur.correctBool ? 'True' : 'False'} + better reason.`);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const on = (ev: KeyboardEvent) => {
      const typing = (t: EventTarget | null) => {
        const e = t as HTMLElement | null;
        if (!e) return false;
        const tag = e.tagName?.toLowerCase();
        return e.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
      };
      
      if (typing(ev.target)) return;

      const k = ev.key.toLowerCase();
      if (k === 'p') { ev.preventDefault(); prev(); return; }

      if (!cur) return;

      if (k === 'h') { ev.preventDefault(); setHint((x) => !x); return; }
      if (k === 'n') { ev.preventDefault(); next(); return; }
      
      if (cur.type === 'reveal') {
        if (ev.key === ' ') { ev.preventDefault(); !rev && setRev(true); }
        if (k === 'c' && rev) { ev.preventDefault(); grade('correct', 'Marked correct.'); }
        if (k === 'x' && rev) { ev.preventDefault(); grade('incorrect', `Answer: ${cur.answer}`); }
      }
      if (cur.type === 'multiple' && k >= '1' && k <= '4') {
        const idx = Number.parseInt(k, 10) - 1; setPick(idx); grade(idx === cur.correctIndex ? 'correct' : 'incorrect', idx === cur.correctIndex ? 'Correct choice.' : `Correct: ${cur.answer}`);
      }
      if (cur.type === 'write' && k === 'enter') { ev.preventDefault(); submitWrite(); }
      if (cur.type === 'build') {
        if (k >= '1' && k <= '9' && cur.bank) { const idx = Number.parseInt(k, 10) - 1; if (idx < cur.bank.length) { ev.preventDefault(); setBuild((p) => [...p, cur.bank![idx]]); } }
        if (ev.key === 'Backspace') { ev.preventDefault(); setBuild((p) => p.slice(0, -1)); }
        if (k === 'c') { ev.preventDefault(); setBuild([]); }
        if (k === 'enter') { ev.preventDefault(); grade(norm(build.join(' ')) === norm(cur.answer) ? 'correct' : 'incorrect', norm(build.join(' ')) === norm(cur.answer) ? 'Perfect build.' : `Expected: ${cur.answer}`); }
      }
      if (cur.type === 'tf') {
        if (k === 't') { ev.preventDefault(); grade(cur.correctBool ? 'correct' : 'incorrect', cur.correctBool ? 'Correct.' : 'Statement is false.'); }
        if (k === 'f') { ev.preventDefault(); grade(!cur.correctBool ? 'correct' : 'incorrect', !cur.correctBool ? 'Correct.' : 'Statement is true.'); }
      }
      if (cur.type === 'tfj') {
        if (k === 't') { ev.preventDefault(); setTf(true); }
        if (k === 'f') { ev.preventDefault(); setTf(false); }
        if ((k === 'enter' && ev.ctrlKey) || (k === 'enter' && ev.metaKey)) { ev.preventDefault(); submitTfj(); }
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [cur, done, rev, build, tf, why, checking]);

  if (total === 0) {
    return (
      <PageContent width="narrow">
        <PageActions><Link to="/review" className="no-underline"><button className="page-primary-action"><ArrowLeft size={16} /> Back to Review</button></Link></PageActions>
        <div className="card" style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}><h2>No items in this queue.</h2><Link to="/review">Back to Review</Link></div>
      </PageContent>
    );
  }

  if (complete) {
    return (
      <PageContent width="narrow" className="pb-12">
        <PageActions><Link to="/review" className="no-underline"><button className="page-primary-action"><ArrowLeft size={16} /> Review Overview</button></Link></PageActions>
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <CheckCircle size={42} style={{ color: '#34D399', margin: '0 auto', marginBottom: 16 }} />
          <h2>Session Complete</h2>
          <p style={{ color: 'var(--color-dim)' }}>{correct}/{total} correct</p>
          <p style={{ color: 'var(--color-dim)', marginBottom: 24 }}>Includes all flashcard types with dummy examples.</p>
          <div className="flex justify-center gap-4">
            <button onClick={prev} className="page-primary-action">Previous Card (P)</button>
            <Link to="/review" className="no-underline"><button className="page-primary-action">Back to Review</button></Link>
          </div>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions><Link to="/review" className="no-underline"><button className="page-primary-action"><ArrowLeft size={16} /> End Session</button></Link></PageActions>
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>Mode: {mode} • Card {i + 1}/{total}</p>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--color-slate)', overflow: 'hidden', marginTop: 8 }}><div style={{ width: `${(i / total) * 100}%`, height: '100%', background: '#8B5CF6' }} /></div>
      </div>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2"><span className="pill">{labels[cur.type]}</span><span className="pill">{cur.term}</span></div>
          <button onClick={() => setHint((x) => !x)} className="page-primary-action"><Lightbulb size={14} /> Hint (H)</button>
        </div>
        {hint && <p style={{ marginTop: 10, color: 'var(--color-dim)' }}>{cur.hint || 'No hint.'}</p>}
      </div>
      <div className="card" style={{ padding: 20 }}>
          <p style={{ color: 'var(--color-dim)' }}>{cur.prompt}</p>
          {cur.type === 'reveal' && <div className="space-y-3 text-center"><h2 style={{ fontSize: 34 }}>{cur.term}</h2>{!rev ? <button onClick={() => setRev(true)} className="page-primary-action"><Eye size={14} /> Show Answer (Space)</button> : <><p style={{ color: '#22D3EE', fontSize: 21 }}>{cur.answer}</p><div className="flex gap-2 justify-center"><button onClick={() => grade('incorrect', `Answer: ${cur.answer}`)} className="page-primary-action"><XCircle size={14} /> Incorrect (X)</button><button onClick={() => grade('correct', 'Correct recall.')} className="page-primary-action"><CheckCircle size={14} /> Correct (C)</button></div></>}</div>}
          {cur.type === 'multiple' && <div className="grid gap-2">{(cur.options || []).map((o, idx) => <button key={o} onClick={() => { setPick(idx); grade(idx === cur.correctIndex ? 'correct' : 'incorrect', idx === cur.correctIndex ? 'Correct choice.' : `Correct: ${cur.answer}`); }} className="page-primary-action" style={{ justifyContent: 'flex-start', background: done && idx === cur.correctIndex ? 'rgba(52,211,153,0.2)' : done && pick === idx ? 'rgba(248,113,113,0.2)' : undefined }}><strong>{idx + 1}.</strong> {o}</button>)}</div>}
          {cur.type === 'write' && <div className="grid gap-2"><textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={4} placeholder="Type answer..." style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(2,6,23,0.5)', color: 'var(--color-mist)', padding: 12 }} /><button onClick={submitWrite} disabled={checking || Boolean(done)} className="page-primary-action">{checking ? 'Validating...' : 'Validate (Enter)'}</button></div>}
          {cur.type === 'build' && <div className="grid gap-2"><div className="card" style={{ padding: 10, minHeight: 44 }}>{build.length ? build.join(' ') : 'Build answer...'}</div><div className="flex gap-2 flex-wrap">{(cur.bank || []).map((w, idx) => <button key={`${w}-${idx}`} onClick={() => setBuild((p) => [...p, w])} className="page-primary-action">{idx + 1}. {w}</button>)}</div><div className="flex gap-2"><button onClick={() => grade(norm(build.join(' ')) === norm(cur.answer) ? 'correct' : 'incorrect', norm(build.join(' ')) === norm(cur.answer) ? 'Perfect build.' : `Expected: ${cur.answer}`)} className="page-primary-action">Check (Enter)</button><button onClick={() => setBuild([])} className="page-primary-action">Clear (C)</button></div></div>}
          {cur.type === 'tf' && <div className="grid gap-2"><div className="card" style={{ padding: 10 }}>{cur.statement}</div><div className="flex gap-2"><button onClick={() => grade(cur.correctBool ? 'correct' : 'incorrect', cur.correctBool ? 'Correct.' : 'Statement is false.')} className="page-primary-action">True (T)</button><button onClick={() => grade(!cur.correctBool ? 'correct' : 'incorrect', !cur.correctBool ? 'Correct.' : 'Statement is true.')} className="page-primary-action">False (F)</button></div></div>}
          {cur.type === 'tfj' && <div className="grid gap-2"><div className="card" style={{ padding: 10 }}>{cur.statement}</div><div className="flex gap-2"><button onClick={() => setTf(true)} className="page-primary-action">True (T)</button><button onClick={() => setTf(false)} className="page-primary-action">False (F)</button></div><textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} placeholder="Why?" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(2,6,23,0.5)', color: 'var(--color-mist)', padding: 12 }} /><button onClick={submitTfj} disabled={checking || Boolean(done) || tf === null} className="page-primary-action">{checking ? 'Validating...' : 'Validate (Ctrl/Cmd+Enter)'}</button></div>}
          {fb[cur.id] && <div className="card mt-3" style={{ padding: 10, border: `1px solid ${done === 'correct' ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}` }}><p style={{ margin: 0, color: done === 'correct' ? '#34D399' : '#F87171' }}>{fb[cur.id]}</p></div>}
          <div className="flex justify-between mt-4 gap-2"><button onClick={prev} disabled={i === 0} className="page-primary-action">Previous (P)</button><div className="flex gap-2"><button onClick={() => { setPick(null); setTxt(''); setBuild([]); setTf(null); setWhy(''); setRev(false); }} className="page-primary-action"><RotateCcw size={14} /> Reset Card</button><button onClick={next} className="page-primary-action">Next (N)</button></div></div>
        </div>
      <div className="card mt-3" style={{ padding: 12 }}>
        <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>
          Flashcard shortcuts: <strong>H</strong> hint, <strong>P/N</strong> prev/next, <strong>Space</strong> reveal, <strong>C/X</strong> grade reveal, <strong>1-4</strong> choice select, <strong>Enter</strong> write/build submit, <strong>T/F</strong> true-false, <strong>Ctrl/Cmd+Enter</strong> true-false+justification submit, <strong>Backspace</strong> remove last build token.
        </p>
      </div>
    </PageContent>
  );
}
