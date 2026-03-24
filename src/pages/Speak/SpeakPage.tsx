import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Mic, Timer, Zap, ChevronDown, Globe, 
  MessageSquare, BookOpen, Podcast, Sparkles,
  Play, CheckCircle2, Info, Settings,
  Volume2, Edit3
} from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { PageContent, PageActions } from '../../components/layout/PageLayout';

const TABS = [
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'pronunciation', label: 'Pronunciation', icon: Podcast },
  { id: 'chips', label: 'Chips', icon: Sparkles },
];

export default function SpeakPage() {
  const [activeTab, setActiveTab] = useState('stories');

  return (
    <PageContent className="pb-12" width="wide">
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* ============ MAIN CONTENT (LEFT) ============ */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">
        
        <PageActions>
          <button className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-5 py-2 text-[14px] font-bold text-blue-400 transition-colors hover:bg-blue-600/30 cursor-pointer group">
            <Zap size={16} fill="currentColor" className="group-hover:scale-110 transition-transform" />
            <span>Quick Practice</span>
            <ChevronDown size={14} className="opacity-80" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-dim transition-colors hover:text-white cursor-pointer">
            <Globe size={18} />
          </button>
        </PageActions>

        {/* Tab Navigation & Search/Filter */}
        <div className="flex justify-between items-center bg-graphite/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-violet text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' 
                    : 'text-dim hover:text-mist hover:bg-white/5'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pr-2">
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-[12px] text-dim font-medium">Filter 2</span>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-1 h-3 rounded-full ${i <= 2 ? 'bg-violet' : 'bg-dim/30'}`} />
                ))}
              </div>
              <ChevronDown size={12} className="text-dim" />
            </div>
            <button className="p-1.5 rounded-lg text-dim hover:text-mist">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Speech Training Section */}
        <section>
          <h2 className="text-[16px] font-bold mb-4 text-mist flex items-center gap-2 uppercase tracking-widest">
            Speech Training
          </h2>
          <div className="grid grid-cols-12 gap-4">
            {/* Conversational Practice */}
            <div className="col-span-3">
              <SpotlightCard interactive className="p-6 aspect-square flex flex-col items-center justify-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-violet/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
                   <div className="absolute inset-0 bg-violet/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                   <MessageSquare size={32} className="text-violet relative z-10" />
                </div>
                <h3 className="text-[15px] font-bold text-mist mb-1">Conversational Practice</h3>
                <p className="text-[11px] text-dim mb-4 leading-normal">Practice free-flowing dialogues with Echo.</p>
                <Link to="/speak/session/conversational-1">
                  <button className="w-full py-2 bg-violet/20 hover:bg-violet/30 border border-violet/30 rounded-xl text-[12px] font-bold text-violet transition-all">
                    Start
                  </button>
                </Link>
              </SpotlightCard>
            </div>

            {/* Scenario Challenge */}
            <div className="col-span-3">
              <SpotlightCard interactive className="p-6 aspect-square flex flex-col items-center justify-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-cyan/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
                   <div className="absolute inset-0 bg-cyan/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                   <Mic size={32} className="text-cyan relative z-10" />
                </div>
                <h3 className="text-[15px] font-bold text-mist mb-1">Scenario Challenge</h3>
                <p className="text-[11px] text-dim mb-4 leading-normal">Simulate real-world situations and tasks.</p>
                <button className="w-full py-2 bg-cyan/20 hover:bg-cyan/30 border border-cyan/30 rounded-xl text-[12px] font-bold text-cyan transition-all">
                  Start
                </button>
              </SpotlightCard>
            </div>

            {/* Featured Story Card */}
            <div className="col-span-6">
              <SpotlightCard interactive className="relative overflow-hidden group h-full">
                <img 
                  src="/background/barcelona_night.png" 
                  alt="Barcelona Night" 
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
                <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                  <h3 className="text-xl font-bold text-white mb-1">La noche en Barcelona</h3>
                  <div className="flex items-center gap-3 text-[12px] text-mist/80 mb-3">
                    <span className="flex items-center gap-1"><Timer size={14} /> 5 min</span>
                    <span className="flex items-center gap-1">• Intermedio</span>
                    <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full w-[30%] bg-violet shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                    </div>
                    <span className="font-bold">30%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[11px] text-dim">
                      <div className="w-6 h-6 rounded-full bg-graphite flex items-center justify-center border border-white/10 overflow-hidden">
                         <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                      </div>
                      You & Soprano-string voice
                    </div>
                    <button className="px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-[12px] font-bold text-white transition-all flex items-center gap-2">
                       <Play size={12} fill="currentColor" /> Practice
                    </button>
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </section>

        {/* Daily Speak Mission */}
        <section>
          <h2 className="text-[16px] font-bold mb-4 text-mist flex items-center gap-2 uppercase tracking-widest">
            Daily Speak Mission
          </h2>
          <SpotlightCard className="p-6 relative overflow-hidden">
             {/* Decorative radial glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex justify-between items-center">
              <div className="max-w-[70%]">
                <h3 className="text-lg font-bold text-mist mb-1">Talk your way to fluency!</h3>
                <p className="text-dim text-[13px] mb-5">Hold a 3-minute conversation about your favorite hobby or interest.</p>
                <div className="flex items-center gap-5">
                  <button className="px-6 py-2.5 bg-violet shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] rounded-xl text-[13px] font-bold text-white transition-all">
                    Start Mission
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-mist font-medium">2/3 completed</span>
                    <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full w-[66%] bg-gradient-to-r from-violet to-cyan shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                    </div>
                    <span className="text-[12px] text-amber font-bold">+50 xp</span>
                  </div>
                </div>
              </div>
              <div className="w-24 h-24 bg-graphite rounded-2xl border border-white/5 flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-violet/5 rounded-2xl blur-md group-hover:bg-violet/10 transition-colors" />
                <Mic size={40} className="text-violet animate-pulse relative z-10" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber flex items-center justify-center border-4 border-obsidian text-obsidian font-bold text-[12px] z-20 shadow-lg">
                   3'
                </div>
              </div>
            </div>
          </SpotlightCard>
        </section>

        {/* Helpful Words & Phrases */}
        <section>
          <h2 className="text-[16px] font-bold mb-4 text-mist uppercase tracking-widest">Helpful Words & Phrases</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
             {/* Feedback Sensitivity Slider */}
             <SpotlightCard className="p-5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                      {['😡', '😐', '🙂', '😊', '🤩'].map((emoji, i) => (
                        <div key={i} className={`text-xl transition-all duration-300 ${i === 3 ? 'scale-125 opacity-100' : 'opacity-30 grayscale hover:grayscale-0 hover:opacity-60'}`}>{emoji}</div>
                      ))}
                    </div>
                  </div>
                  <h4 className="text-[12px] font-bold text-dim mb-4 uppercase tracking-widest">Feedback Sensitivity</h4>
                  <div className="px-2">
                    <div className="h-1.5 bg-black/40 rounded-full relative mb-2">
                      <div className="absolute left-[75%] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet border-2 border-white shadow-[0_0_12px_rgba(139,92,246,0.6)] cursor-grab active:cursor-grabbing" />
                    </div>
                    <div className="flex justify-between text-[11px] text-dim-dark font-bold uppercase">
                      <span>Precise</span>
                      <span>Normal</span>
                      <span>Easy</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[12px] font-bold text-mist transition-all">
                   Practice
                </button>
             </SpotlightCard>

             {/* Restaurant Phrases */}
             <SpotlightCard className="p-5 flex flex-col justify-between h-full">
                <div>
                  <h4 className="text-[15px] font-bold text-mist mb-4">Restaurant Phrases</h4>
                  <div className="space-y-3 mb-2">
                    {[
                      { es: '¿Tiene alguna mesa libre?', en: 'Do you have a free table?' },
                      { es: 'Voy a pedir algo para tomar', en: 'I am going to order something to drink' },
                      { es: '¿Qué me recomienda?', en: 'What do you recommend?' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 group cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center group-hover:border-violet group-hover:bg-violet/10 transition-all">
                          <CheckCircle2 size={10} className="text-violet opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-[13px] text-mist group-hover:text-white transition-colors">{item.es}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[12px] font-bold text-mist transition-all">
                   Practice
                </button>
             </SpotlightCard>
          </div>

          <SpotlightCard className="overflow-hidden">
            <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
               <h4 className="text-[13px] font-bold text-mist uppercase tracking-widest">Helpful Words & Phrases</h4>
               <Info size={14} className="text-dim" />
            </div>
            <div className="divide-y divide-white/5">
              {[
                '¿Podrías repetirmelo?',
                'Soy de Estados Unidos.',
                'Estoy aprendiendo español.'
              ].map(phrase => (
                <div key={phrase} className="p-4 flex justify-between items-center hover:bg-white/[0.03] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-graphite flex items-center justify-center border border-white/5 group-hover:border-violet/30 transition-colors">
                      <Volume2 size={16} className="text-dim group-hover:text-violet transition-colors" />
                    </div>
                    <span className="text-[14px] text-mist font-medium group-hover:text-white transition-colors">{phrase}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2.5 rounded-xl bg-graphite border border-white/5 text-dim hover:text-mist hover:border-white/20 transition-all">
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </section>
      </div>

      {/* ============ SIDEBAR (RIGHT) ============ */}
      <aside className="w-80 shrink-0 flex flex-col gap-6 pt-2">
        
        {/* Echo's Feedback */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-[15px] font-bold text-mist uppercase tracking-widest">Echo's Feedback</h2>
            <button className="text-[11px] text-violet font-bold hover:underline tracking-widest uppercase">View All</button>
          </div>
          <SpotlightCard className="p-6 flex flex-col items-center">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-violet/30 blur-[40px] rounded-full animate-pulse" />
               <img src="/figure/happy.png" alt="Echo" className="w-[120px] h-[120px] object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]" />
            </div>
            <div className="w-full bg-graphite/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 relative">
              {/* Chat bubble tail */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-graphite/40 border-t border-l border-white/10 rotate-45" />
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-dim uppercase tracking-widest">Expression</span>
                <div className="flex items-center gap-1.5 bg-violet/20 px-3 py-1 rounded-full border border-violet/30 cursor-pointer hover:bg-violet/30 transition-colors">
                  <span className="text-[10px] font-bold text-violet uppercase tracking-tighter">Top tier</span>
                  <ChevronDown size={10} className="text-violet" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                   <p className="text-[14px] text-mist font-bold mb-0.5">¿Podrías repetir eso?</p>
                   <p className="text-[11px] text-dim font-medium italic">Could you repeat that?</p>
                </div>
                <div className="pt-3 border-t border-white/5">
                   <p className="text-[14px] text-mist font-bold mb-0.5">• Eso suena interesante</p>
                   <p className="text-[11px] text-dim font-medium italic pl-3">That sounds interesting</p>
                </div>
              </div>
            </div>
          </SpotlightCard>
        </section>

        {/* Speaking Progress */}
        <section>
          <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Speaking Progress</h2>
          <SpotlightCard className="p-6">
            <div className="flex items-center gap-8">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="transparent"
                    stroke="url(#progressGradient)"
                    strokeWidth="10"
                    strokeDasharray="301.6"
                    initial={{ strokeDashoffset: 301.6 }}
                    animate={{ strokeDashoffset: 301.6 - (301.6 * 0.47) }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-mist tracking-tighter">47<span className="text-sm font-bold opacity-60">%</span></span>
                  <span className="text-[9px] text-dim uppercase font-black tracking-widest">XP</span>
                </div>
              </div>
              <div className="flex-1">
                 <div className="flex items-center gap-2 text-violet mb-1.5">
                    <Play size={16} fill="currentColor" className="animate-pulse" />
                    <span className="text-[18px] font-black tracking-tighter text-mist">14 min</span>
                 </div>
                 <p className="text-[11px] text-dim font-bold uppercase tracking-tighter mb-4">Daily goal progress</p>
                 <div className="h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full w-[47%] bg-gradient-to-r from-violet to-cyan shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                 </div>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-white/5 flex justify-between items-center">
               <span className="text-[11px] text-dim font-black uppercase tracking-widest">Daily Goal</span>
               <div className="flex items-center gap-2">
                  <span className="text-[11px] text-mist font-bold uppercase">In Progress</span>
                  <div className="w-2 h-2 rounded-full bg-violet animate-ping" />
               </div>
            </div>
          </SpotlightCard>
        </section>

        {/* Voice Options */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-[15px] font-bold text-mist uppercase tracking-widest">Voice Options</h2>
            <div className="w-9 h-5 bg-violet/20 rounded-full relative cursor-pointer border border-violet/30 transition-colors hover:bg-violet/30">
               <div className="absolute right-1 top-1 w-3 h-3 bg-violet rounded-full shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
             <SpotlightCard interactive className="p-4 group">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-violet/10 flex items-center justify-center border border-violet/20 overflow-hidden group-hover:scale-105 transition-transform">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Liana&backgroundColor=b6e3f4" alt="Liana" className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[14px] font-bold text-mist group-hover:text-white transition-colors">Liana (.7)</span>
                        <div className="flex gap-0.5">
                           {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 4 ? 'bg-violet' : 'bg-white/10'}`} />)}
                        </div>
                      </div>
                      <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                         <motion.div initial={{ width: 0 }} animate={{ width: '80%' }} transition={{ duration: 1 }} className="h-full bg-violet" />
                      </div>
                   </div>
                </div>
             </SpotlightCard>

             <SpotlightCard interactive className="p-4 ring-1 ring-cyan/40 bg-cyan/5 group">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-cyan/10 flex items-center justify-center border border-cyan/20 overflow-hidden group-hover:scale-105 transition-transform">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mesa&backgroundColor=c0aede" alt="Mesa" className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[14px] font-bold text-mist group-hover:text-white transition-colors">Mesa, M)</span>
                        <div className="flex gap-0.5">
                           {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 3 ? 'bg-cyan' : 'bg-white/10'}`} />)}
                        </div>
                      </div>
                      <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                         <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1 }} className="h-full bg-cyan shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      </div>
                   </div>
                </div>
             </SpotlightCard>
          </div>
        </section>

      </aside>
    </div>
    </PageContent>
  );
}
