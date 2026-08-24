import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { seededShuffle } from '../../../../utils/seededRandom';
import { hintPropsFor, seedFor, type LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';

/**
 * Sort each item into the group it belongs to.
 *
 * The items were previously rendered as `groups.flatMap(group => group.items)`,
 * which lays them out group by group — the first half of the list was always the
 * first group, so the task was solvable without reading a single word. Items are
 * now shuffled with a task-stable seed, assignments can be cleared, and each group
 * shows what it has collected so far.
 */
export function GroupSortExercise({
  payload,
  disabled,
  onDraftChange,
  onHintLevelOpened,
}: LearnExerciseProps) {
  const groups = useMemo(() => payload.groups ?? [], [payload.groups]);
  const seed = seedFor(payload);

  const items = useMemo(
    () => seededShuffle(groups.flatMap((group) => group.items), seed),
    [groups, seed],
  );

  const [selectedGroup, setSelectedGroup] = useState<string | null>(groups[0]?.name ?? null);
  const [assignment, setAssignment] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedGroup(groups[0]?.name ?? null);
    setAssignment({});
  }, [seed, groups]);

  const unassigned = items.filter((item) => !assignment[item]);
  const ready = items.length > 0 && unassigned.length === 0;

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: JSON.stringify(assignment),
      structuredResponse: { assignment },
      ready,
    });
  }, [assignment, onDraftChange, ready]);

  const clear = (item: string) => {
    setAssignment((previous) => {
      const next = { ...previous };
      delete next[item];
      return next;
    });
  };

  return (
    <div className="grid gap-3">
      <p className="text-[12px] text-dim">Choose a group, then tap the items that belong in it.</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {groups.map((group) => {
          const isSelected = selectedGroup === group.name;
          const collected = items.filter((item) => assignment[item] === group.name);
          return (
            <div
              key={group.name}
              className={`rounded-xl border p-3 transition-colors ${
                isSelected ? 'border-cyan-400/55 bg-cyan-400/12' : 'border-white/10 bg-white/[0.035]'
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSelectedGroup(group.name)}
                className="w-full text-left text-[13px] font-bold text-mist disabled:cursor-not-allowed"
              >
                {group.name}
                <span className="ml-2 text-[11px] font-normal text-dim">{collected.length} items</span>
              </button>

              {collected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {collected.map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={disabled}
                      onClick={() => clear(item)}
                      className="group inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-400/10 px-2 py-1 text-[12px] text-mist transition-colors hover:border-rose-400/45 hover:bg-rose-400/12 disabled:cursor-not-allowed"
                    >
                      <InteractiveText text={item} languageCode={payload.languageCode} />
                      {!disabled && <X size={10} className="text-dim group-hover:text-rose-200" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {unassigned.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled || !selectedGroup}
            onClick={() => {
              if (!selectedGroup) return;
              setAssignment((previous) => ({ ...previous, [item]: selectedGroup }));
            }}
            className="rounded-lg border border-white/20 bg-white/[0.05] px-3 py-2 text-[13px] text-mist transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <InteractiveText text={item} languageCode={payload.languageCode} />
          </button>
        ))}
        {unassigned.length === 0 && items.length > 0 && (
          <p className="text-[12px] text-emerald-200/80">Everything is sorted — submit when you are happy.</p>
        )}
      </div>

      <HintSection {...hintPropsFor(payload)} disabled={disabled} onHintLevelOpened={onHintLevelOpened} />
    </div>
  );
}
