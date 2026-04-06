import { useEffect, useMemo, useState } from 'react';
import type { LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';

export function GroupSortExercise({ payload, disabled, onDraftChange }: LearnExerciseProps) {
  const groups = payload.groups ?? [];
  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(groups[0]?.name ?? null);
  const [assignment, setAssignment] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedGroup(groups[0]?.name ?? null);
    setAssignment({});
  }, [groups]);

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: JSON.stringify(assignment),
      structuredResponse: {
        assignment,
      },
      ready: items.length > 0 && items.every((item) => Boolean(assignment[item])),
    });
  }, [assignment, items, onDraftChange]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.name}
            type="button"
            disabled={disabled}
            onClick={() => setSelectedGroup(group.name)}
            className="rounded-full border px-3 py-1.5 text-[12px]"
            style={{
              borderColor: selectedGroup === group.name ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.12)',
              background: selectedGroup === group.name ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.04)',
              color: 'var(--color-mist)',
            }}
          >
            <InteractiveText text={group.name} languageCode={payload.languageCode} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled || !selectedGroup}
            onClick={() => {
              if (!selectedGroup) return;
              setAssignment((previous) => ({ ...previous, [item]: selectedGroup }));
            }}
            className="rounded-lg border px-3 py-2 text-[13px]"
            style={{
              borderColor: assignment[item] ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)',
              background: assignment[item] ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
              color: 'var(--color-mist)',
            }}
          >
            <InteractiveText
              text={`${item}${assignment[item] ? ` -> ${assignment[item]}` : ''}`}
              languageCode={payload.languageCode}
            />
          </button>
        ))}
      </div>
      <HintSection hints={payload.distractors} languageCode={payload.languageCode} />
    </div>
  );
}
