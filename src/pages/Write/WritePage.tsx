import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  PenLine, ChevronRight, Plus, Mail, Book, FileText, 
  Sparkles, Search, Filter, Clock, 
  AlertCircle, Trophy, BarChart3, Edit3, Trash2
} from 'lucide-react';
import { writingPrompts, writingDrafts } from '../../data/library';
import { SpotlightCard } from '../../components/ui/SpotlightCard';

const TABS = [
  { id: 'prompts', label: 'Prompts', icon: Sparkles },
  { id: 'journal', label: 'Journal', icon: Book },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'formal', label: 'Formal', icon: FileText },
];

export default function WritePage() {
  const [activeTab, setActiveTab] = useState('prompts');

  return (
    <div className="flex gap-8 w-full max-w-[1300px] mx-auto pb-12">
      {/* ============ MAIN CONTENT (LEFT) ============ */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-mist mb-2">Writing</h1>
            <p className="text-dim text-[14px]">Practice writing in Spanish with guided prompts, feedback, and correction.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/write/editor" className="no-underline">
              <button className="flex items-center gap-2 bg-violet/10 hover:bg-violet/20 border border-violet/20 px-4 py-2 rounded-xl transition-all group">
                <Plus size={16} className="text-violet group-hover:scale-110 transition-transform" />
                <span className="text-[13px] font-bold text-mist">Free Write</span>
              </button>
            </Link>
            <button className="p-2.5 rounded-xl bg-graphite border border-white/5 text-dim hover:text-mist transition-colors">
              <Clock size={18} />
            </button>
          </div>
        </header>

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
            <div className="relative group">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-violet transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search prompts..." 
                 className="bg-black/20 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-[12px] text-mist focus:outline-none focus:ring-1 focus:ring-violet/50 w-48 transition-all"
               />
            </div>
            <button className="p-1.5 rounded-lg text-dim hover:text-mist border border-white/5 bg-black/10">
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Featured Writing Prompt */}
        <section>
          <h2 className="text-[16px] font-bold mb-4 text-mist flex items-center gap-2 uppercase tracking-widest">
            Featured Prompt
          </h2>
          <SpotlightCard interactive className="relative overflow-hidden group h-[240px]">
            <img 
              src="/background/writing_prompt_travel.png" 
              alt="Travel Writing" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/60 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-center max-w-[50%]">
              <div className="flex items-center gap-2 mb-3">
                 <span className="px-2.5 py-0.5 rounded-full bg-violet/20 border border-violet/30 text-[10px] font-bold text-violet uppercase tracking-wider">Expert pick</span>
                 <span className="text-[11px] text-mist/60 font-medium tracking-wide">150 - 200 words</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Un viaje inolvidable</h3>
              <p className="text-mist/80 text-[14px] leading-relaxed mb-6 italic">Describe an unforgettable trip you've taken. Where did you go, who were you with, and why was it so special?</p>
              <Link to="/write/editor" className="no-underline">
                <button className="px-6 py-2.5 bg-violet shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] rounded-xl text-[13px] font-bold text-white transition-all w-fit">
                  Start Writing
                </button>
              </Link>
            </div>
          </SpotlightCard>
        </section>

        {/* Recent Drafts */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-[16px] font-bold text-mist uppercase tracking-widest">Recent Drafts</h2>
             <button className="text-[11px] text-dim hover:text-mist font-bold uppercase tracking-wider">View All</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {writingDrafts.slice(0, 3).map(draft => (
              <SpotlightCard key={draft.id} interactive className="p-5 flex flex-col justify-between group h-48">
                <div>
                   <div className="flex justify-between items-start mb-3">
                      <h3 className="text-[15px] font-bold text-mist group-hover:text-white transition-colors line-clamp-1">{draft.title}</h3>
                      <button className="p-1.5 rounded-lg text-dim hover:text-coral transition-colors opacity-0 group-hover:opacity-100">
                         <Trash2 size={12} />
                      </button>
                   </div>
                   <p className="text-[12px] text-dim line-clamp-3 mb-4 italic leading-relaxed">
                     "{draft.content}"
                   </p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                   <div className="flex items-center gap-2 text-[11px] text-dim-dark font-bold uppercase">
                      <BarChart3 size={11} />
                      {draft.wordCount} words
                   </div>
                   <Link to={`/write/editor/${draft.id}`}>
                      <Edit3 size={14} className="text-violet opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-1" />
                   </Link>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </section>

        {/* Writing Prompts Categories */}
        <section>
          <h2 className="text-[16px] font-bold mb-4 text-mist uppercase tracking-widest">Explore Prompts</h2>
          <div className="grid grid-cols-2 gap-4">
             {writingPrompts.slice(0, 4).map((prompt, i) => (
                <SpotlightCard key={prompt.id} interactive className="p-5 group">
                   <div className="flex gap-5 items-start">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all group-hover:scale-110 ${
                        i === 0 ? 'bg-cyan/10 border-cyan/20 text-cyan' :
                        i === 1 ? 'bg-amber/10 border-amber/20 text-amber' :
                        i === 2 ? 'bg-mint/10 border-mint/20 text-mint' :
                        'bg-violet/10 border-violet/20 text-violet'
                      }`}>
                         {i === 0 ? <Mail size={24} /> : i === 1 ? <Book size={24} /> : i === 2 ? <PenLine size={24} /> : <FileText size={24} />}
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-center mb-1">
                            <h3 className="text-[15px] font-bold text-mist">{prompt.title}</h3>
                            <span className="text-[10px] font-black uppercase text-dim-dark">{prompt.difficulty}</span>
                         </div>
                         <p className="text-[12px] text-dim mb-4 line-clamp-2 leading-relaxed">{prompt.description}</p>
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-bold py-0.5 px-2 bg-white/5 rounded-md text-dim">{prompt.type}</span>
                               <span className="text-[10px] font-bold py-0.5 px-2 bg-white/5 rounded-md text-dim">~{prompt.wordTarget} words</span>
                            </div>
                            <ChevronRight size={14} className="text-dim-dark group-hover:text-mist group-hover:translate-x-1 transition-all" />
                         </div>
                      </div>
                   </div>
                </SpotlightCard>
             ))}
          </div>
        </section>
      </div>

      {/* ============ SIDEBAR (RIGHT) ============ */}
      <aside className="w-[340px] shrink-0 flex flex-col gap-6 pt-2">
        
        {/* Writing Progress */}
        <section>
          <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Writing Progress</h2>
          <SpotlightCard className="p-6">
            <div className="flex items-center gap-8 mb-6">
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
                    animate={{ strokeDashoffset: 301.6 - (301.6 * 0.72) }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-mist tracking-tighter">72<span className="text-sm font-bold opacity-60">%</span></span>
                  <span className="text-[9px] text-dim uppercase font-black tracking-widest">Goal</span>
                </div>
              </div>
              <div className="flex-1">
                 <div className="flex items-center gap-2 text-amber mb-1.5">
                    <PenLine size={16} fill="currentColor" className="animate-pulse" />
                    <span className="text-[18px] font-black tracking-tighter text-mist">1,420 words</span>
                 </div>
                 <p className="text-[11px] text-dim font-bold uppercase tracking-tighter mb-4">Total written this week</p>
                 <div className="h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full w-[72%] bg-gradient-to-r from-violet to-amber shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                 </div>
              </div>
            </div>
            <div className="pt-5 border-t border-white/5 flex justify-between items-center">
               <span className="text-[11px] text-dim font-black uppercase tracking-widest">Daily Streak</span>
               <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber font-bold uppercase">5 days</span>
                  <div className="w-2 h-2 rounded-full bg-amber animate-ping" />
               </div>
            </div>
          </SpotlightCard>
        </section>

        {/* Correction Insights */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-[15px] font-bold text-mist uppercase tracking-widest">Correction Insights</h2>
            <button className="text-[11px] text-violet font-bold hover:underline tracking-widest uppercase italic">Analyze</button>
          </div>
          <SpotlightCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center">
                  <AlertCircle size={20} className="text-violet" />
               </div>
               <div>
                  <h3 className="text-[13px] font-bold text-mist uppercase tracking-wider">Common Mistakes</h3>
                  <p className="text-[11px] text-dim">Areas needing focus this week</p>
               </div>
            </div>
            <div className="space-y-4">
              {[
                { area: 'Prepositions (por vs para)', level: 85, color: '#f87171' },
                { area: 'Verb Conjugation (subjunctive)', level: 60, color: '#f59e0b' },
                { area: 'Noun-Adjective Agreement', level: 30, color: '#34d399' }
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5 text-[11px]">
                     <span className="text-mist/80 font-medium">{item.area}</span>
                     <span className="text-dim-dark font-black tracking-tighter">{item.level}% frequency</span>
                  </div>
                  <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${item.level}%` }} 
                        transition={{ duration: 1, delay: i * 0.2 }}
                        className="h-full rounded-full"
                        style={{ background: item.color }}
                     />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 bg-violet/10 hover:bg-violet/20 border border-violet/20 rounded-xl text-[11px] font-bold text-violet uppercase tracking-widest transition-all">
               View Full Analysis
            </button>
          </SpotlightCard>
        </section>

        {/* Milestone Achievement */}
        <section>
          <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Next Milestone</h2>
          <SpotlightCard className="p-6 relative overflow-hidden group">
             {/* Background glow */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-amber/10 transition-colors" />
             
             <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center text-amber drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                   <Trophy size={28} />
                </div>
                <div className="flex-1">
                   <h3 className="text-[14px] font-extrabold text-mist uppercase tracking-tighter mb-1">Essayist II</h3>
                   <p className="text-[11px] text-dim-dark font-bold uppercase tracking-wider mb-3">Write 3 essays {'>'} 200 words</p>
                   <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                         <div className="h-full w-[66%] bg-amber shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      </div>
                      <span className="text-[11px] text-mist font-black">2/3</span>
                   </div>
                </div>
             </div>
          </SpotlightCard>
        </section>

        {/* Echo's-hint (Bottom Right) */}
        <div className="mt-4 relative p-6 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent)] border border-violet/20 rounded-2xl flex gap-4 overflow-hidden shadow-[inset_0_0_40px_rgba(139,92,246,0.05)]">
           <div className="flex-1 relative z-10">
              <h4 className="text-[14px] font-bold text-violet mb-2 tracking-tight">Echo's-hint</h4>
              <p className="text-[13px] text-dim leading-relaxed font-medium">
                 Try using the new "Correction Insights" to spot patterns in your grammar mistakes. It helps you improve faster!
              </p>
           </div>
           <img src="/figure/happy.png" className="w-[80px] h-[80px] object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.6)] absolute -bottom-2 -right-2 z-10" />
        </div>
      </aside>
    </div>
  );
}
