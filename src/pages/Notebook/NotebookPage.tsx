import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, BookOpen, MessageCircle, 
  ChevronRight, Star, Plus, Sparkles,
  Settings, LayoutGrid, Clock, 
  Bookmark, Flame, CheckCircle2, 
  MoreHorizontal
} from 'lucide-react';
import { vocabularyItems } from '../../data/vocabulary';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { PageActions, PageContent } from '../../components/layout/PageLayout';

const TABS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'words', label: 'Words', icon: BookOpen },
  { id: 'phrases', label: 'Phrases', icon: MessageCircle },
];

const FAVORITES = vocabularyItems.slice(0, 3);
const EXPLORER_ITEMS = vocabularyItems.slice(3, 6);

export default function NotebookPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [activeListTab, setActiveListTab] = useState('favorites');

  return (
    <PageContent className="pb-12" width="wide">
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* ============ MAIN CONTENT (LEFT) ============ */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">
        
        <PageActions>
          <button className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-5 py-2 text-[14px] font-bold text-blue-400 transition-colors hover:bg-blue-600/30 cursor-pointer">
            <Plus size={16} /> New Item
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-dim transition-colors hover:text-white cursor-pointer">
            <Settings size={18} />
          </button>
        </PageActions>

        {/* Tab & Search Bar */}
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
          <div className="flex items-center gap-3 pr-2 flex-1 max-w-xs">
            <div className="relative w-full group">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-violet transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search your notebook..." 
                 className="bg-black/20 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-[12px] text-mist focus:outline-none focus:ring-1 focus:ring-violet/50 w-full transition-all"
               />
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center bg-violet/5 p-3 rounded-2xl border border-violet/10">
          <div className="flex items-center gap-6 px-2">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet" />
                <span className="text-[13px] font-bold text-mist">Beginner</span>
                <span className="text-[13px] text-dim font-medium">30</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan/40" />
                <span className="text-[13px] font-bold text-dim">Intermediate</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber" />
                <span className="text-[13px] font-bold text-mist">Advanced</span>
                <span className="text-[13px] text-dim font-medium">8</span>
             </div>
          </div>
          <button className="flex items-center gap-2 bg-violet/10 hover:bg-violet/20 border border-violet/20 px-4 py-1.5 rounded-xl transition-all">
             <Plus size={14} className="text-violet" />
             <span className="text-[12px] font-bold text-mist">New Entry</span>
          </button>
        </div>

        {/* Featured Card */}
        <SpotlightCard interactive className="relative overflow-hidden group h-[200px]">
          <img 
            src="/background/barcelona_night.png" 
            alt="Barcelona Night" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
          <div className="relative z-10 p-8 h-full flex flex-col justify-end">
            <h3 className="text-2xl font-bold text-white mb-1">La noche en Barcelona</h3>
            <p className="text-mist/80 text-[14px] font-medium tracking-wide">Travel Adventures</p>
          </div>
        </SpotlightCard>

        {/* Favorites Section */}
        <section>
          <div className="flex gap-4 mb-4 items-center">
            {[
              { id: 'favorites', label: 'Favorites', icon: Star },
              { id: 'recent', label: 'Recent', icon: Clock },
              { id: 'more', label: 'More all', icon: MoreHorizontal },
            ].map(seg => (
              <button 
                key={seg.id}
                onClick={() => setActiveListTab(seg.id)}
                className={`flex items-center gap-2 text-[14px] font-bold pb-1 px-1 transition-all border-b-2 ${
                  activeListTab === seg.id ? 'text-violet border-violet' : 'text-dim border-transparent hover:text-mist'
                }`}
              >
                {seg.icon && <seg.icon size={14} />}
                {seg.label}
              </button>
            ))}
          </div>

          <SpotlightCard className="overflow-hidden">
             <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2 text-violet font-bold text-[13px]">
                <Star size={14} fill="currentColor" />
                Favorites
             </div>
             <div className="divide-y divide-white/5">
                {FAVORITES.map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-graphite flex items-center justify-center border border-white/5 group-hover:border-violet/30 transition-colors">
                          <BookOpen size={18} className="text-dim group-hover:text-violet transition-colors" />
                       </div>
                       <div>
                          <p className="text-[15px] font-bold text-mist group-hover:text-white transition-colors">{item.term}</p>
                          <p className="text-[12px] text-dim">{item.translation}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-2">
                          <span className="text-[11px] text-dim font-bold uppercase tracking-widest">Beginner</span>
                          <span className="text-[11px] text-mist font-black">1+</span>
                       </div>
                       <Star size={14} className="text-amber" fill="currentColor" />
                    </div>
                  </div>
                ))}
             </div>
             <div className="p-3 bg-black/20 flex justify-between items-center px-6">
                <button className="text-[11px] text-dim hover:text-mist font-bold uppercase transition-colors">View All</button>
                <button className="text-[11px] text-dim hover:text-mist font-bold uppercase transition-colors flex items-center gap-1">
                   View All <ChevronRight size={10} />
                </button>
             </div>
          </SpotlightCard>
        </section>

        {/* Word Explorer Section */}
        <section>
          <h2 className="text-[16px] font-bold mb-4 text-mist uppercase tracking-widest flex items-center gap-2">
            Word Explorer
          </h2>
          <div className="flex flex-col gap-3">
             {EXPLORER_ITEMS.map(item => (
               <SpotlightCard key={item.id} className="p-5 group">
                  <div className="flex justify-between items-start">
                     <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center text-violet mt-1 group-hover:scale-110 transition-transform">
                           <Sparkles size={20} />
                        </div>
                        <div>
                           <div className="flex items-baseline gap-2 mb-1">
                              <h3 className="text-lg font-bold text-mist">{item.term}</h3>
                              <span className="text-[12px] text-dim font-medium italic">(ad) {item.translation}</span>
                           </div>
                           <p className="text-[13px] text-mist/70 mb-3 italic">"{item.context}"</p>
                           <div className="flex gap-2">
                              {item.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-dim-dark font-bold uppercase">{tag}</span>
                              ))}
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-mist tracking-tighter bg-violet/10 px-2 py-0.5 rounded-lg border border-violet/20">
                           <Plus size={10} className="text-violet" /> 1+
                           <MoreHorizontal size={10} className="text-dim ml-1" />
                        </div>
                        <button className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[12px] font-bold text-mist transition-all group-hover:border-violet/30">
                           Review
                        </button>
                     </div>
                  </div>
               </SpotlightCard>
             ))}
             <button className="w-full mt-2 py-3 bg-graphite/40 hover:bg-graphite/60 border border-white/5 rounded-xl text-[12px] font-bold text-mist transition-all flex items-center justify-center gap-2 group">
                View More <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        </section>
      </div>

      {/* ============ SIDEBAR (RIGHT) ============ */}
      <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6 pt-2">
        
        {/* Your Collections */}
        <section>
          <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Your Collections</h2>
          <SpotlightCard className="p-4">
             <div className="flex gap-1 p-1 bg-black/30 rounded-xl mb-4">
                <button className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-graphite/60 text-mist shadow-sm">Words</button>
                <button className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-dim hover:text-mist transition-colors">Phrases</button>
             </div>
             
             <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-[12px] text-dim font-medium"><span className="text-mist font-bold">46</span> Collected / <span className="text-mist/60 font-bold">133</span> Words</span>
             </div>

             <div className="flex flex-col gap-2">
                {[
                  { label: 'Daily Life', icon: Bookmark, color: 'text-violet', bg: 'bg-violet/10', border: 'border-violet/20' },
                  { label: 'Trips & Travel', icon: Bookmark, color: 'text-cyan', bg: 'bg-cyan/10', border: 'border-cyan/20' },
                  { label: 'Restaurant Talk', icon: Bookmark, color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/20' },
                ].map((col, i) => (
                  <button key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/20 hover:bg-black/30 transition-all group">
                     <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${col.bg} ${col.border} border flex items-center justify-center ${col.color}`}>
                           <col.icon size={16} fill="currentColor" />
                        </div>
                        <span className="text-[13px] font-bold text-mist group-hover:text-white transition-colors">{col.label}</span>
                     </div>
                     <ChevronRight size={14} className="text-dim-dark" />
                  </button>
                ))}
                <button className="flex items-center justify-between p-3 rounded-xl border border-dashed border-white/10 hover:border-violet/40 hover:bg-violet/5 transition-all group mt-1">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-dim group-hover:text-violet">
                         <Plus size={16} />
                      </div>
                      <span className="text-[13px] font-bold text-dim group-hover:text-mist">New Bookmark</span>
                   </div>
                   <ChevronRight size={14} className="text-dim-dark" />
                </button>
             </div>
          </SpotlightCard>
        </section>

        {/* Notepad Section */}
        <section>
          <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Notepad</h2>
          <SpotlightCard className="p-6">
             <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                     <span className="text-[15px] font-black text-mist leading-none">31</span>
                     <span className="text-[9px] text-dim uppercase font-bold tracking-tighter">Beginner</span>
                  </div>
                  <div className="flex flex-col opacity-50">
                     <span className="text-[15px] font-black text-mist leading-none">8</span>
                     <span className="text-[9px] text-dim uppercase font-bold tracking-tighter">Intermediate</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[15px] font-black text-mist leading-none">12</span>
                     <span className="text-[9px] text-dim uppercase font-bold tracking-tighter">Advanced</span>
                  </div>
                </div>
             </div>

             {/* Weekly Activity */}
             <div className="flex justify-between items-end gap-1 mb-6 px-1">
                {[
                  { day: 'Lu', val: 0 },
                  { day: 'Ma', val: 21 },
                  { day: 'Mi', val: 25 },
                  { day: 'Ju', val: 28 },
                  { day: 'Vi', val: 26 },
                  { day: 'Sa', val: 31 }
                ].map(d => (
                  <div key={d.day} className="flex flex-col items-center gap-2">
                     <span className="text-[12px] font-black text-mist">{d.val === 0 ? '00' : d.val}</span>
                     <span className="text-[9px] text-dim-dark font-bold uppercase">{d.day}</span>
                  </div>
                ))}
             </div>

             {/* Streak */}
             <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                   <Flame size={16} className="text-amber animate-bounce" fill="currentColor" />
                   <span className="text-[13px] font-bold text-amber capitalize">5 days</span>
                </div>
                <div className="text-right">
                   <p className="text-[9px] text-dim-dark font-bold uppercase leading-tight">Longest: 14 days</p>
                   <p className="text-[9px] text-dim-dark font-bold uppercase leading-tight">Current: 5 days</p>
                </div>
             </div>

             {/* Distribution Chart & Echo */}
             <div className="relative flex justify-center py-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="54" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                    <motion.circle 
                      cx="64" cy="64" r="54" fill="transparent" stroke="#8B5CF6" strokeWidth="8" 
                      strokeDasharray="339.12" initial={{ strokeDashoffset: 339.12 }} animate={{ strokeDashoffset: 339.12 - (339.12 * 0.45) }} 
                      transition={{ duration: 1.5 }} strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                    />
                    <motion.circle 
                      cx="64" cy="64" r="54" fill="transparent" stroke="#22D3EE" strokeWidth="8" 
                      strokeDasharray="339.12" initial={{ strokeDashoffset: 339.12 }} animate={{ strokeDashoffset: 339.12 - (339.12 * 0.25) }} 
                      transition={{ duration: 1.5, delay: 0.3 }} strokeLinecap="round" strokeDashoffset={339.12 * -0.45}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-mist">51</span>
                    <span className="text-[8px] text-dim-dark font-bold uppercase">Total</span>
                  </div>
                </div>
                <div className="absolute -right-4 bottom-0 animate-float">
                   <img src="/figure/normal.png" alt="Echo" className="w-24 h-24 object-contain drop-shadow-[0_10px_15px_rgba(139,92,246,0.3)]" />
                   <div className="absolute -bottom-2 w-full h-2 bg-violet/20 blur-md rounded-full" />
                </div>
             </div>
             
             <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold">
                   <span className="text-mist">31 <span className="text-dim-dark font-medium">Beginner</span></span>
                   <span className="text-mist">12 <span className="text-dim-dark font-medium">Intermediate</span></span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold">
                   <span className="text-mist">8 <span className="text-dim-dark font-medium">Advanced</span></span>
                   <CheckCircle2 size={12} className="text-dim" />
                </div>
             </div>
          </SpotlightCard>
        </section>

      </aside>
    </div>
    </PageContent>
  );
}
