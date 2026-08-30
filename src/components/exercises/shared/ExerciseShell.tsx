import type { ReactNode } from 'react';
import { InteractiveText } from './InteractiveText';

interface ExerciseShellProps {
  title: string;
  subtitle?: string;
  progressLabel?: string;
  prompt?: string;
  /**
   * Pronunciation for the target text, e.g. pinyin or romaji.
   *
   * Generated content has carried a `scriptHint` all along — it is requested
   * from the model, parsed and passed around — but nothing ever rendered it, so
   * a learner of a non-Latin script never saw the reading that was produced for
   * them.
   */
  scriptHint?: string;
  languageCode?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  onGlossaryUsage?: (count: number) => void;
  children: ReactNode;
}

export function ExerciseShell({
  title,
  subtitle,
  progressLabel,
  prompt,
  scriptHint,
  languageCode,
  actions,
  footer,
  onGlossaryUsage,
  children,
}: ExerciseShellProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0e1736]/70 p-4 md:p-6 shadow-[0_16px_36px_rgba(3,8,24,0.45)]">
      <header className="mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[20px] font-bold text-white">{title}</h2>
          {progressLabel ? <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-dim">{progressLabel}</span> : null}
        </div>
        {subtitle ? <p className="text-[13px] text-dim">{subtitle}</p> : null}
        {prompt ? (
          <InteractiveText
            text={prompt}
            languageCode={languageCode}
            className="text-[14px] leading-relaxed text-mist"
            onGlossaryUsage={onGlossaryUsage}
          />
        ) : null}
        {scriptHint ? (
          <p className="text-[13px] italic text-cyan/80">{scriptHint}</p>
        ) : null}
      </header>

      {actions ? <div className="mb-4">{actions}</div> : null}

      <div className="space-y-3">{children}</div>

      {footer ? <footer className="mt-4">{footer}</footer> : null}
    </section>
  );
}
