interface UnsupportedExerciseCardProps {
  title?: string;
  reason: string;
}

export function UnsupportedExerciseCard({ title = 'Unsupported Exercise', reason }: UnsupportedExerciseCardProps) {
  return (
    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
      <p className="text-[14px] font-semibold text-rose-300">{title}</p>
      <p className="mt-1 text-[13px] text-rose-200/90">{reason}</p>
    </div>
  );
}

