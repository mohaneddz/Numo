import { Headphones, Mic, BookOpen, Target, Zap, ArrowRight } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { RecommendedCard } from '../../data/types';
import { useNavigate } from 'react-router-dom';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCardBackground } from '../../hooks/useCardBackground';

interface RecommendationCardProps {
    card: RecommendedCard;
}

const getRecommendIcon = (icon: string) => {
    switch (icon) {
        case 'headphones': return Headphones;
        case 'mic': return Mic;
        case 'book-open': return BookOpen;
        case 'target': return Target;
        default: return Zap;
    }
};

export function RecommendationCard({ card }: RecommendationCardProps) {
    const navigate = useNavigate();
    const { activeLanguage } = useLanguage();
    const background = useCardBackground({
        itemKey: `recommended:${activeLanguage.code}:${card.id}`,
        itemType: 'recommendation',
        languageCode: activeLanguage.code,
        languageName: activeLanguage.name,
        title: card.title,
        description: card.description,
        topicTags: [card.type, 'study', activeLanguage.name],
        cardType: card.type,
        mood: 'premium subtle',
        fallbackAsset: '/continue_learning.png',
    });
    const Icon = getRecommendIcon(card.icon);
    // Matching the blue/violet glow in screenshot
    const isBlue = card.accentColor === 'cyan' || card.accentColor === 'violet';
    const iconContainerBg = isBlue ? 'bg-[#15234B]' : 'bg-[#1A1A24]';
    const glowColor = isBlue ? 'shadow-[0_0_30px_rgba(56,189,248,0.15)]' : 'shadow-[0_0_30px_rgba(167,139,250,0.15)]';
    const iconColor = isBlue ? 'text-[#38BDF8]' : 'text-[#A78BFA]';

    const isFallback = !background.selection || background.selection.provider === 'fallback';

    return (
        <SpotlightCard
            interactive
            className="group h-full w-full"
            onClick={() =>
                navigate(
                    buildTemplateUrl({
                        templateId: 'home-recommendation',
                        entityId: card.id,
                        params: { from: '/', lang: activeLanguage.code, type: card.type },
                    }),
                )
            }
        >
            {!isFallback && <img src={background.source} alt={card.title} className="absolute inset-0 h-full w-full object-cover opacity-30" />}
            <div className={`absolute inset-0 ${isFallback ? 'bg-gradient-to-br from-[#111122] via-[#0b1020] to-[#0A0D18]' : 'bg-gradient-to-t from-[#0b1020]/95 via-[#0b1020]/78 to-[#0b1020]/45'}`} />
            {/* Inner Wrapper: Isolates layout from the SpotlightCard's internal structural divs */}
            <div className="relative p-5 px-5 pt-5 pb-0 flex  items-start h-full min-h-[170px] w-full gap-4">

                {/* Premium Icon Container */}
                <div className={`w-[56px] h-[56px] rounded-[18px] flex items-center justify-center shrink-0 ${iconContainerBg} ${glowColor} shadow-[inset_0_2px_4px_rgba(255,255,255,0.06)] ring-1 ring-white/5 mb-5`}>
                    <Icon size={26} className={iconColor} strokeWidth={2} />
                </div>

                <div className="">

                    {/* Text Block */}
                    <h4 className="text-[17px] font-bold text-white mb-1.5 tracking-tight truncate w-full pr-8">{card.title}</h4>
                    <p className="text-[14.5px] text-slate-400/90 mb-5 font-medium line-clamp-2 w-full pr-4">{card.description}</p>

                    {/* Horizontal Pills Row */}
                    <div className="flex gap-2 flex-wrap mt-auto w-full">
                        {card.duration && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#161B2C] border border-white/5">
                                <div className="w-1.5 h-3 rounded-full bg-[#6366F1]" />
                                <span className="text-[#8C9FC0] text-[12px] font-bold">{card.duration}</span>
                            </div>
                        )}
                        <div className="inline-flex items-center px-4 py-1.5 rounded-[10px] bg-[#161B2C] border border-white/5">
                            <span className="text-[#8C9FC0] text-[12px] font-bold">{card.level}</span>
                        </div>
                    </div>

                    {/* Absolute Top-Right Arrow (Now positioned correctly relative to the inner wrapper containing p-5) */}
                    <div className="absolute top-5 right-5 shrink-0 text-slate-600/70 group-hover:text-slate-400 transition-colors">
                        <ArrowRight size={22} strokeWidth={2} />
                    </div>
                </div>

            </div>


        </SpotlightCard>
    );
}
