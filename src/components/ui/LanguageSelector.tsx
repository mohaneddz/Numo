import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export function LanguageSelector() {
    const { activeLanguage, languages, setActiveLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelect = (code: string) => {
        setActiveLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                whileTap={{ scale: 0.98 }}
                onClick={toggleDropdown}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-graphite border border-slate cursor-pointer transition-all duration-300 group shadow-lg backdrop-blur-md"
            >
                <span className="text-xl shadow-sm leading-none">{activeLanguage.flag}</span>
                <span className="text-[14px] font-bold text-mist group-hover:text-white transition-colors uppercase tracking-tight">
                    {activeLanguage.name}
                </span>
                <ChevronDown 
                    size={16} 
                    className={`text-dim transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 6, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute right-0 top-full z-[100] w-56 p-1.5 rounded-2xl bg-[#0F1219]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_20px_rgba(139,92,246,0.1)] overflow-hidden"
                    >
                        <div className="max-h-[320px] overflow-y-auto pr-1 overflow-x-hidden custom-scrollbar">
                            <div className="px-3 py-2 mb-1">
                                <span className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider opacity-70">
                                    Target Language
                                </span>
                            </div>
                            
                            {languages.map((lang) => (
                                <motion.button
                                    key={lang.code}
                                    whileHover={{ x: 4, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                                    onClick={() => handleSelect(lang.code)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                        activeLanguage.code === lang.code 
                                        ? 'bg-violet-dim/40 border border-violet/20' 
                                        : 'hover:bg-white/[0.03] border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl leading-none">{lang.flag}</span>
                                        <div className="flex flex-col items-start translate-y-[-1px]">
                                            <span className={`text-[14px] font-bold transition-colors ${
                                                activeLanguage.code === lang.code ? 'text-white' : 'text-mist group-hover:text-white'
                                            }`}>
                                                {lang.name}
                                            </span>
                                            {lang.progress.totalXP > 0 && (
                                                <span className="text-[10px] text-dim font-medium uppercase tracking-tight">
                                                    {lang.progress.totalXP} XP
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {activeLanguage.code === lang.code && (
                                        <Check size={14} className="text-violet" />
                                    )}
                                </motion.button>
                            ))}
                            
                            <div className="mt-2 pt-2 border-t border-white/10 px-1 pb-1">
                                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-violet font-bold hover:bg-violet/10 transition-colors">
                                    <Globe size={14} /> Add new language
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
