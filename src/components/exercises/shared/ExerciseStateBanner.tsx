import { AlertCircle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

export type ExerciseStateTone = 'loading' | 'empty' | 'error' | 'success' | 'incorrect' | 'info';

interface ExerciseStateBannerProps {
  tone: ExerciseStateTone;
  message: string;
  detail?: string;
}

const iconMap = {
  loading: Loader2,
  empty: Info,
  error: AlertCircle,
  success: CheckCircle2,
  incorrect: XCircle,
  info: Info,
} as const;

const toneMap: Record<ExerciseStateTone, string> = {
  loading: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
  empty: 'border-white/15 bg-white/5 text-mist',
  error: 'border-rose-500/35 bg-rose-500/10 text-rose-200',
  success: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
  incorrect: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
  info: 'border-indigo-500/35 bg-indigo-500/10 text-indigo-100',
};

export function ExerciseStateBanner({ tone, message, detail }: ExerciseStateBannerProps) {
  const Icon = iconMap[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneMap[tone]}`}>
      <div className="flex items-start gap-2">
        <Icon size={16} className={tone === 'loading' ? 'animate-spin' : ''} />
        <div>
          <p className="text-[13px] font-semibold">{message}</p>
          {detail ? <p className="mt-1 text-[12px] opacity-90">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}
