import { motion } from 'framer-motion';
import { recentlySaved } from '../../data/learner';
import { SpotlightCard } from '../ui/SpotlightCard';

export function RecentlySavedCard() {
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <SpotlightCard className="p-5">
                <h3 className="text-[15px] font-bold mb-3.5 text-[#FAFAFA]">Recently Saved</h3>
                <div className="flex gap-2 flex-wrap">
                    {recentlySaved.slice(0, 3).map(item => (
                        <motion.div
                            whileHover={{ scale: 1.05, y: -2, boxShadow: '0 4px 16px rgba(139,92,246,0.15)' }}
                            whileTap={{ scale: 0.95 }}
                            key={item.term}
                            className="px-3 py-2 rounded-xl bg-black/20 border border-white/5 backdrop-blur-md cursor-pointer relative z-10"
                        >
                            <p className="text-[13px] font-bold mb-0.5 text-[#FAFAFA]">{item.term}</p>
                            <p className="text-[10px] text-dim font-medium">{item.type}</p>
                        </motion.div>
                    ))}
                    <div className="px-3 py-2 rounded-xl bg-black/20 border border-white/5 backdrop-blur-md flex items-center justify-center text-[13px] text-dim font-bold">
                        +{recentlySaved.length - 3}
                    </div>
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
