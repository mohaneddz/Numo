import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurriculum } from '../../contexts/CurriculumContext';
import { generateCurriculum } from '../../services/curriculumGenerator';
import { saveToDummyDataFile } from '../../utils/saveDisk';
import { Bot, Save, Loader2 } from 'lucide-react';

export function DebugPanel() {
  const { activeLanguage, updateContinueLearning } = useLanguage();
  const { updateCurriculum, ...curriculumState } = useCurriculum();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateCurriculum(activeLanguage);
      
      // Update CurriculumContext for cards
      updateCurriculum({
        recommendedCards: data.recommendedCards,
        focusAreas: data.focusAreas,
        dailyMission: data.dailyMission,
      });

      // Update LanguageContext for continueLearning
      updateContinueLearning(data.continueLearning);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const backupState = {
      recommendedCards: curriculumState.recommendedCards,
      focusAreas: curriculumState.focusAreas,
      dailyMission: curriculumState.dailyMission,
      continueLearning: activeLanguage.continueLearning,
    };
    
    // We export a TS snippet to easily replace learner.ts contents (or parts of it)
    const fileContent = `// Auto-generated curriculum for ${activeLanguage.name}
export const generatedCurriculum = ${JSON.stringify(backupState, null, 2)};
`;
    
    saveToDummyDataFile(`generated_curriculum_${activeLanguage.code}.ts`, fileContent);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#1e1e1e] border border-white/10 rounded-xl p-4 shadow-2xl flex flex-col gap-3 min-w-[280px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h3 className="text-white font-medium text-sm flex items-center gap-2">
          <Bot size={16} className="text-violet-400" />
          AI Curriculum
        </h3>
        <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded">
          Debug View
        </span>
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-400/10 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 w-full py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isGenerating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Bot size={16} />
          )}
          {isGenerating ? 'Generating...' : 'Generate New Cards'}
        </button>

        <button
          onClick={handleSave}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={16} />
          Save to Disk
        </button>
      </div>
    </div>
  );
}
