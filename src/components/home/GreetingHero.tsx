import { motion } from 'framer-motion';
import { Zap, Bell, Gift } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurriculum } from '../../contexts/CurriculumContext';
import { LanguageSelector } from '../ui/LanguageSelector';
import { useNavigate } from 'react-router-dom';
import { buildActionUrl } from '../../navigation/actionTemplates';

export function GreetingHero() {
    const { activeLanguage } = useLanguage();
    const { learner } = useCurriculum();
    const navigate = useNavigate();
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <motion.div {...fadeUp}>
            <div className="flex items-start justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-4 mb-1">
                        <img
                            src="/figure/happy.png"
                            alt="Echo"
                            className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-float"
                        />
                        <h1 className="text-[36px] leading-tight font-extrabold tracking-tight text-[#FAFAFA] pr-4">
                            {greeting}, {learner.name}.
                        </h1>
                    </div>
                    <p className="text-dim text-[15px]">
                        Your {activeLanguage.name} is evolving beautifully — let's continue the momentum.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 pt-1 shrink-0">
                    <LanguageSelector />
                    <div className="h-6 w-[1px] bg-white/10 mx-1" />
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 0 24px rgba(139, 92, 246, 0.6), inset 0 1px 1px rgba(255,255,255,0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[linear-gradient(135deg,#8B5CF6,#06b6d4)] text-white text-[13px] font-bold shadow-[0_0_12px_rgba(139,92,246,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 cursor-pointer"
                        onClick={() =>
                            navigate(
                                buildActionUrl('home_quick_session', {
                                    params: { from: '/', lang: activeLanguage.code },
                                }),
                            )
                        }
                    >
                        <Zap size={14} fill="currentColor" /> Quick Start
                    </motion.button>
                    <button
                        className="w-9 h-9 rounded-xl bg-graphite border border-slate flex items-center justify-center cursor-pointer text-dim hover:text-mist transition-colors"
                        onClick={() =>
                            navigate(
                                buildActionUrl('app_profile', {
                                    params: { from: '/', lang: activeLanguage.code, panel: 'rewards' },
                                }),
                            )
                        }
                    >
                        <Gift size={16} />
                    </button>
                    <button
                        className="relative w-9 h-9 rounded-xl bg-graphite border border-slate flex items-center justify-center cursor-pointer text-dim hover:text-mist transition-colors"
                        onClick={() =>
                            navigate(
                                buildActionUrl('app_notifications', {
                                    params: { from: '/', lang: activeLanguage.code },
                                }),
                            )
                        }
                    >
                        <Bell size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
