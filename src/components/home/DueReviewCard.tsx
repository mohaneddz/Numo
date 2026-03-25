import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useAppData } from '../../contexts/AppDataContext';

export function DueReviewCard() {
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };
    const { dueCount, dueReviewPreview } = useAppData();

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <SpotlightCard className="p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[15px] font-bold text-[#FAFAFA]">Due for Review</h3>
                    <span className="bg-[#F97316] text-white text-[11px] font-extrabold rounded-full min-w-6 h-6 px-1 flex items-center justify-center shadow-[0_2px_8px_rgba(249,115,22,0.4)]">{dueCount}</span>
                </div>
                <div className="flex flex-col">
                    {dueReviewPreview.slice(0, 2).map(item => (
                        <Link
                            key={item.id}
                            to="/review/session?mode=due-now"
                            className="no-underline flex items-center gap-3 py-2.5 border-b border-white/5 cursor-pointer hover:bg-white/[0.04] rounded-lg -mx-1.5 px-1.5 transition-colors"
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.strength === 'very solid' ? 'bg-mint-dim/50 shadow-[0_0_8px_rgba(52,211,153,0.2)]' : 'bg-coral-dim/50 shadow-[0_0_8px_rgba(248,113,113,0.2)]'}`}>
                                <div className={`w-2 h-2 rounded-full ${item.strength === 'very solid' ? 'bg-[#34D399]' : 'bg-[#EF4444]'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-[#FAFAFA] mb-0.5">{item.term}</p>
                                <p className="text-[11px] text-dim font-medium">
                                    {item.attempts} attempts · {item.strength === 'very solid' ? 'Very solid' : 'Needs work'}
                                </p>
                            </div>
                            <ChevronRight size={14} className="text-dim-dark" />
                        </Link>
                    ))}
                    {dueReviewPreview.length === 0 && (
                        <p className="text-[12px] text-dim py-2">No cards due right now. Jump in for a quick cram.</p>
                    )}
                </div>
                <Link to="/review/session?mode=due-now" className="no-underline">
                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(139, 92, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.3)' }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-xl bg-[linear-gradient(135deg,#8B5CF6,#9333EA)] text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(139,92,246,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 cursor-pointer relative z-10"
                    >
                        Start Flash Cards
                    </motion.button>
                </Link>
            </SpotlightCard>
        </motion.div>
    );
}
