import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Mic, RotateCcw } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useLanguage } from '../../contexts/LanguageContext';

export function NextActionCard() {
  const { activeLanguage } = useLanguage();
  
  // Simulated AI logic for "Next Action"
  const getNextAction = () => {
    const { progress } = activeLanguage;
    if (progress.todayMinutes === 0) {
      return {
        title: 'Kickstart your day',
        description: `Ready to practice some ${activeLanguage.name}? A quick 5-min session will keep your streak alive.`,
        icon: Zap,
        action: 'Start Practice',
        color: 'violet'
      };
    }
    if (progress.totalXP % 1000 < 200) {
      return {
        title: 'Speaking Drill',
        description: "Your accent is improving! Let's do a 5-minute shadowing exercise to refine your rhythm.",
        icon: Mic,
        action: 'Start Drill',
        color: 'cyan'
      };
    }
    return {
      title: 'Vocabulary Review',
      description: "You have 12 words ready for review. Solidify them now to keep your memory strong.",
      icon: RotateCcw,
      action: 'Start Review',
      color: 'coral'
    };
  };

  const action = getNextAction();
  const Icon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="h-full"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-violet" />
        <h3 className="text-[15px] font-bold text-[#FAFAFA]">AI Suggested Action</h3>
      </div>
      
      <SpotlightCard className="p-6 h-[calc(100%-32px)] flex flex-col justify-between border border-violet/20 bg-violet/5">
        <div className="flex gap-4">
          <div className={`w-12 h-12 rounded-2xl bg-${action.color}/10 flex items-center justify-center text-${action.color} shadow-lg shrink-0`}>
            <Icon size={24} />
          </div>
          <div>
            <h4 className="text-[18px] font-bold text-white mb-1">{action.title}</h4>
            <p className="text-[13px] text-dim-dark leading-relaxed">
              {action.description}
            </p>
          </div>
        </div>

        <button className="mt-6 w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-all group font-bold text-[14px]">
          {action.action}
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </SpotlightCard>
    </motion.div>
  );
}

// Helper icons (Zap was missing from imports in thought but used here)
import { Zap } from 'lucide-react';
