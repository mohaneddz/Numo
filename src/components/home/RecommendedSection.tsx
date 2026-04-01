import { motion } from 'framer-motion';
import { useCurriculum } from '../../contexts/CurriculumContext';
import { RecommendationCard } from './RecommendationCard';

export function RecommendedSection() {
    const { recommendedCards } = useCurriculum();
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <h3 className="text-[17px] font-bold mb-4 text-[#FAFAFA]">Recommended for You</h3>
            {recommendedCards.length === 0 && (
                <div className="card p-4 text-[13px] text-dim">
                    No recommended items yet. Finish one learning or review session to unlock real recommendations.
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                {recommendedCards.map(card => (
                    <RecommendationCard key={card.id} card={card} />
                ))}
            </div>
        </motion.div>
    );
}
