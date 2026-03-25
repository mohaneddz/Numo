import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, ChevronDown, Globe, Plus, Search, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSelectorProps {
  className?: string;
  size?: 'default' | 'large';
}

export function LanguageSelector({ className = '', size = 'default' }: LanguageSelectorProps) {
  const {
    activeLanguage,
    languages,
    availableLanguages,
    setActiveLanguage,
    addLanguage,
    removeLanguage,
    moveLanguage,
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <span className="text-xl leading-none">{activeLanguage.flag}</span>
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
                {languages.map((language, index) => {
                  const isActive = language.code === activeLanguage.code;
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
                        <span className="text-xl leading-none">{language.flag}</span>
                        <span className="truncate text-[13px] font-semibold text-white">{language.name}</span>
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
                          disabled={languages.length <= 1}
                          className="rounded-lg p-1.5 text-dim transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
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
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#95E4FF]">Add language</span>
                <Globe size={13} className="text-dim" />
              </div>

              <label className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f1734]/70 px-2.5 py-2 text-dim focus-within:border-[#5a68e0]/60">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or code"
                  className="w-full bg-transparent text-[12px] text-white placeholder:text-dim/70 outline-none"
                />
              </label>

              <div className="max-h-[150px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        addLanguage(language.code);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent bg-white/[0.02] px-2.5 py-2 text-left transition-colors hover:border-[#4d5ccf]/35 hover:bg-[#30409b]/20"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-lg leading-none">{language.flag}</span>
                        <span className="text-[12px] font-medium text-white">
                          {language.name} <span className="text-dim uppercase">({language.code})</span>
                        </span>
                      </span>
                      <Plus size={14} className="text-[#86A0FF]" />
                    </button>
                  ))
                ) : (
                  <p className="px-1 py-2 text-[11px] text-dim">No languages match your search.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

