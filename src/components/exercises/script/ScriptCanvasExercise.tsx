import { useMemo } from 'react';
import { ScriptDrawingInput } from '../../script/ScriptDrawingInput';
import { useLanguage } from '../../../contexts/LanguageContext';
import { findScriptModel } from '../../../data/scriptModels';
import { scoreScriptAttempt } from '../../../services/exercises/scriptScoringService';
import type { ScriptPracticeMode } from '../../../types/scriptPractice';
import type { ScriptExerciseProps } from './types';
import { ExerciseStateBanner } from '../shared/ExerciseStateBanner';

interface ScriptCanvasExerciseProps extends ScriptExerciseProps {
  note: string;
  mode: ScriptPracticeMode;
}

export function ScriptCanvasExercise({ payload, onChange, note, mode }: ScriptCanvasExerciseProps) {
  const { activeLanguage } = useLanguage();
  const model = useMemo(() => findScriptModel(activeLanguage.code, payload.modelKey), [activeLanguage.code, payload.modelKey]);

  return (
    <div className="space-y-3">
      <ExerciseStateBanner tone="info" message={note} detail="Progression: watch -> trace -> guided draw -> free draw -> timed recall." />
      <ScriptDrawingInput
        payload={payload}
        mode={mode}
        model={model}
        onChange={(nextPayload) => {
          const score = scoreScriptAttempt(nextPayload, model ?? undefined);
          onChange({ ...nextPayload, score });
        }}
      />
      {payload.score ? (
        <ExerciseStateBanner
          tone={payload.score.totalScore >= 70 ? 'success' : 'incorrect'}
          message={`Heuristic score ${payload.score.totalScore}%`}
          detail={`${payload.score.feedback} Count ${payload.score.strokeCountScore}% | Order ${payload.score.orderScore}% | Shape ${payload.score.shapeScore}%`}
        />
      ) : null}
    </div>
  );
}
