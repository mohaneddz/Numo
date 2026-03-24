import { motion } from 'framer-motion';
import { focusAreas } from '../../data/learner';
import { SpotlightCard } from '../ui/SpotlightCard';

export function FocusAreasCard() {
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <SpotlightCard className="p-5">
                <h3 className="text-[15px] font-bold mb-4 text-[#FAFAFA]">Focus Areas</h3>
                <div className="flex flex-col gap-3.5">
                    {focusAreas.map(area => (
                        <div key={area.skill}>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[13px] text-mist font-medium">{area.skill}</span>
                                <span className="text-[13px] font-bold text-mist">{area.percentage}%</span>
                            </div>
                            <div className="h-[5px] rounded-full bg-black/40 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${area.percentage}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full rounded-full shadow-[0_0_8px_currentColor]"
                                    style={{ background: area.color, color: area.color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
