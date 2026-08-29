import { useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { findScriptModel } from '../../../data/scriptModels';
import { ScriptStrokeAnimation } from '../../script/ScriptStrokeAnimation';
import { ExerciseStateBanner } from '../shared/ExerciseStateBanner';
import type { ScriptExerciseProps } from './types';

/**
 * Watch mode: the character written out, stroke by stroke, in order.
 *
 * This used to render the same drawing canvas as every other mode, which meant
 * there was nothing to watch.
 */
export function WatchScriptExercise({ payload }: ScriptExerciseProps) {
  const { activeLanguage } = useLanguage();
  const model = useMemo(
    () => findScriptModel(activeLanguage.code, payload.modelKey),
    [activeLanguage.code, payload.modelKey],
  );

  return (
    <div className="space-y-3">
      <ExerciseStateBanner
        tone="info"
        message="Watch the character written stroke by stroke, then move on to trace."
        detail={
          model
            ? `${model.character}${model.reading ? ` (${model.reading})` : ''} · ${model.strokes.length} strokes`
            : undefined
        }
      />
      <ScriptStrokeAnimation model={model} />
    </div>
  );
}
