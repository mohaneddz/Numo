import { SpotlightCard } from '../ui/SpotlightCard';

interface LessonBlockProps {
  title: string;
  concept: string;
  example: string;
}

export function LessonBlock({ title, concept, example }: LessonBlockProps) {
  return (
    <SpotlightCard className="p-6 mb-6">
      <h2 className="text-[20px] font-bold text-white mb-4">{title}</h2>
      <div className="mb-4">
        <h3 className="text-[14px] text-dim uppercase tracking-wider font-bold mb-2">Concept</h3>
        <p className="text-[15px] text-mist">{concept}</p>
      </div>
      <div className="bg-black/20 p-4 rounded-lg border border-white/5">
        <h3 className="text-[14px] text-dim uppercase tracking-wider font-bold mb-2">Example</h3>
        <p className="text-[15px] text-mist italic">"{example}"</p>
      </div>
    </SpotlightCard>
  );
}
