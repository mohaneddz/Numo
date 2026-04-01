interface ProgressBarProps {
  progress: number; // 0 to 100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full bg-black/20 rounded-full h-2.5 mb-6 border border-white/5 overflow-hidden">
      <div
        className="bg-emerald-500/80 h-2.5 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      ></div>
    </div>
  );
}
