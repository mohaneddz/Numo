import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
  triggerClassName?: string;
}

export function DropdownSelect({
  value,
  onChange,
  options,
  className = '',
  triggerClassName = '',
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const selected = useMemo(
    () => options.find((entry) => entry.value === value)?.label ?? value,
    [options, value],
  );

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 text-[13px] text-white outline-none transition-colors hover:border-white/20 ${triggerClassName}`.trim()}
      >
        <span className="truncate">{selected}</span>
        <ChevronDown size={15} className={`text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#0f1326] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
          <div className="max-h-64 overflow-auto">
            {options.map((entry) => {
              const isActive = entry.value === value;
              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => {
                    onChange(entry.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                    isActive
                      ? 'bg-indigo-500/25 text-white'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
