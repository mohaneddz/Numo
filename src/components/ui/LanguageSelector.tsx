import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { resolveLanguageFlag } from '../../utils/flags';

interface LanguageSelectorProps {
  className?: string;
  size?: 'default' | 'large';
}

export function LanguageSelector({ className = '', size = 'default' }: LanguageSelectorProps) {
  const navigate = useNavigate();
  const {
    activeLanguage,
    languages,
    availableLanguages,
    isBaseLanguage,
    setActiveLanguage,
    addLanguages,
    removeLanguage,
    moveLanguage,
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isAddMode && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsAddMode(false);
      } else if (!isAddMode && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddMode]);

  useEffect(() => {
    if (!isAddMode) {
      setSelectedToAdd([]);
      setSearch('');
    }
  }, [isAddMode]);

  const filteredAvailable = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return availableLanguages;
    }

    return availableLanguages.filter((language) => {
      const matchesName = language.name.toLowerCase().includes(query);
      const matchesCode = language.code.toLowerCase().includes(query);
      return matchesName || matchesCode;
    });
  }, [availableLanguages, search]);

  const triggerClass =
    size === 'large'
      ? 'flex h-12 items-center gap-2.5 rounded-2xl border border-white/15 bg-[#111b46]/70 px-4 text-[15px] font-semibold text-white shadow-lg transition-colors hover:bg-[#18275c]/80'
      : 'flex items-center gap-2.5 rounded-xl border border-slate bg-graphite px-3.5 py-2 text-[14px] font-bold text-mist shadow-lg transition-colors hover:bg-white/10';

  return (
    <div className={`relative ${className}`.trim()} ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className={triggerClass}
      >
        <span className="text-xl leading-none">
          {languages.length > 0 ? resolveLanguageFlag(activeLanguage.code, activeLanguage.flag) : '🌐'}
        </span>
        <span className="uppercase tracking-tight">{activeLanguage.name}</span>
        <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 6, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full z-[100] mt-1.5 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0F1219]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3B8FF]">My languages</span>
                <span className="text-[10px] text-dim">{languages.length} active</span>
              </div>

              <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                {languages.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-dim">
                    No learning language selected yet.
                  </p>
                )}
                {languages.map((language, index) => {
                  const isActive = language.code === activeLanguage.code;
                  const isBase = isBaseLanguage(language.code);
                  const canMoveUp = index > 0;
                  const canMoveDown = index < languages.length - 1;

                  return (
                    <div
                      key={language.code}
                      className={`flex items-center justify-between rounded-xl border px-2 py-2 transition-colors ${
                        isActive ? 'border-[#6676ff]/45 bg-[#3141a4]/20' : 'border-transparent bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <button
                        onClick={() => setActiveLanguage(language.code)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <span className="text-xl leading-none">{resolveLanguageFlag(language.code, language.flag)}</span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold text-white">{language.name}</span>
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                isBase ? 'border-[#5ad1ff]/35 bg-[#42bdf0]/15 text-[#9be7ff]' : 'border-[#c4d0ff]/30 bg-[#4f5ea5]/20 text-[#c7d2ff]'
                              }`}
                            >
                              {isBase ? 'Base' : 'New'}
                            </span>
                          </span>
                        </span>
                        {isActive ? <Check size={14} className="text-[#91A0FF]" /> : null}
                      </button>

                      <div className="ml-2 flex items-center gap-0.5">
                        <button
                          onClick={() => moveLanguage(language.code, 'up')}
                          disabled={!canMoveUp}
                          className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                          title="Move up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => moveLanguage(language.code, 'down')}
                          disabled={!canMoveDown}
                          className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                          title="Move down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => removeLanguage(language.code)}
                          className="rounded-lg p-1.5 text-dim transition-colors hover:bg-red-500/15 hover:text-red-300"
                          title="Remove language"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsAddMode(true);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
              >
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#95E4FF]">Add language</span>
                <Plus size={14} className="text-[#95E4FF]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddMode && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              ref={modalRef}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0F1219] p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Add Languages</h2>
                  <p className="text-sm text-dim">Select languages you want to explore</p>
                </div>
                <button
                  onClick={() => setIsAddMode(false)}
                  className="rounded-lg p-2 text-dim hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <label className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f1734]/70 px-3 py-2.5 text-dim focus-within:border-[#5a68e0]/60">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or code"
                  className="w-full bg-transparent text-sm text-white placeholder:text-dim/70 outline-none"
                  autoFocus
                />
              </label>

              <div className="mb-4 max-h-[300px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((language) => {
                    const isSelected = selectedToAdd.includes(language.code);
                    return (
                      <button
                        key={language.code}
                        onClick={() => {
                          setSelectedToAdd((prev) =>
                            prev.includes(language.code)
                              ? prev.filter((c) => c !== language.code)
                              : [...prev, language.code]
                          );
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? 'border-[#4d5ccf]/50 bg-[#30409b]/30'
                            : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-2xl leading-none">{language.flag}</span>
                          <span className="font-medium text-white">
                            {language.name} <span className="text-dim text-sm uppercase ml-1">({language.code})</span>
                          </span>
                        </span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                            isSelected ? 'border-[#86A0FF] bg-[#86A0FF] text-[#0F1219]' : 'border-dim bg-transparent'
                          }`}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-dim">
                    <p>No languages match your search.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => setIsAddMode(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  disabled={selectedToAdd.length === 0}
                  onClick={() => {
                    const added = addLanguages(selectedToAdd);
                    setIsAddMode(false);
                    if (added.length > 0) {
                      navigate(`/language-setup?lang=${added[0]}`);
                    }
                  }}
                  className="rounded-xl bg-[#4A64F8] px-5 py-2 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                >
                  Confirm ({selectedToAdd.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
