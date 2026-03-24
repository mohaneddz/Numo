import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Play, Mic, Edit2, Star, ChevronDown, Filter, FileText, Volume2, AlertTriangle, MessageSquare, Briefcase, Book, CheckCircle2, Mic2, ArrowRight } from 'lucide-react';
import { PageActions, PageContent } from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';

// ---------- MOCK DATA ----------
const filters = [
  { id: 'words', label: 'Words', icon: FileText },
  { id: 'phrases', label: 'Phrases', icon: MessageSquare },
  { id: 'sentences', label: 'Sentences', icon: Play },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'languages', label: 'All Languages', icon: ChevronDown, rightIcon: true },
  { id: 'more-filters', label: 'Filters', icon: Filter },
];

const recentlyAdded = [
  { id: 'r1', term: '¿Cuánto cuesta?', context: 'How much does it cost?', language: 'Spanish', langIcon: '🇪🇸', active: 'Speak', timeAgo: '2 min ago', highlight: 'var(--color-coral)' },
  { id: 'r2', term: 'Ich verstehe nicht', context: "I don't understand", language: 'German', langIcon: '🇩🇪', active: 'Learn', timeAgo: '1 hour ago', highlight: 'var(--color-cyan)' },
  { id: 'r3', term: '谢谢你 (Xièxiè nǐ)', context: 'Thank you', language: 'Chinese', langIcon: '🇨🇳', active: 'Write', timeAgo: '3 hours ago', highlight: 'var(--color-tomato)' },
];

const collections = [
  { id: 'c1', title: 'Travel 🇪🇸', desc: 'Essentials for trips & daily use', count: 42, updated: '2d ago', color: 'from-orange-500/20 to-rose-500/20', icon: '✈️' },
  { id: 'c2', title: 'Mistakes ⚠️', desc: 'Words I keep getting wrong', count: 18, updated: '3d ago', color: 'from-red-500/20 to-orange-500/20', icon: '⚠️' },
  { id: 'c3', title: 'Slang 🤭', desc: 'Cool & casual expressions', count: 27, updated: '1w ago', color: 'from-blue-500/20 to-purple-500/20', icon: '🤭' },
  { id: 'c4', title: 'Important 📌', desc: 'High-value words & phrases', count: 23, updated: '2h ago', color: 'from-amber-500/20 to-yellow-500/20', icon: '📌' },
  { id: 'c5', title: 'My Notes', desc: 'Stuff I want to remember', count: 12, updated: '5h ago', color: 'from-orange-400/20 to-amber-600/20', icon: '📝' },
];

const allItems = [
  { id: 'i1', term: '¿Dónde está la estación?', context: 'Where is the train station?', language: 'Spanish', langIcon: '🇪🇸', type: 'Speak', time: 'Today', starred: true },
  { id: 'i2', term: 'Gestern Abend war es kalt', context: 'It was cold last night', language: 'German', langIcon: '🇩🇪', type: 'Learn', time: 'Yesterday', starred: false },
  { id: 'i3', term: '我明天要去学校\nWǒ míngtiān yào qù xuéxiào', context: "I'm going to school tomorrow", language: 'Chinese', langIcon: '🇨🇳', type: 'Write', time: '2 days ago', starred: false },
  { id: 'i4', term: 'On se voit ce soir ?', context: 'Shall we meet up tonight?', language: 'French', langIcon: '🇫🇷', type: 'Speak', time: '3 days ago', starred: true },
];

const smartSections = [
  { id: 's1', title: 'Your Mistakes', desc: 'Words you often misspeak', count: 18, action: 'Review suggested', icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { id: 's2', title: 'Hard Words', desc: 'Marked as difficult', count: 27, action: 'Need practice', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 's3', title: 'Frequently Used', desc: 'Appearing across sessions', count: 145, action: 'Keep going', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

// ---------- COMPONENTS ----------

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function LibraryPage() {
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const starredCount = allItems.filter((item) => item.starred).length;

    return (
        <PageContent className="pb-12">
            <PageActions />
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
            <section className="min-w-0 flex flex-col gap-10">

            {/* Search and Filters */}
            <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="flex flex-col gap-4 relative z-20">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-dim" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search your collection..."
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder:text-dim focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                    />
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                    {filters.map(filter => {
                        const Icon = filter.icon;
                        const isActive = activeFilter === filter.id;
                        return (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(isActive ? null : filter.id)}
                                className={`snap-start whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                                    isActive 
                                    ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] border' 
                                    : 'bg-white/5 border border-white/5 text-dim hover:bg-white/10 hover:text-mist'
                                }`}
                            >
                                {!filter.rightIcon && <Icon size={14} className={isActive ? 'text-white' : 'text-dim'} />}
                                {filter.label}
                                {filter.rightIcon && <Icon size={14} className={isActive ? 'text-white' : 'text-dim opacity-70'} />}
                            </button>
                        )
                    })}
                </div>
            </motion.div>

            {/* Recently Added */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex flex-col gap-4">
                <h2 className="text-lg font-bold text-white">Recently Added</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recentlyAdded.map(item => (
                        <SpotlightCard key={item.id} className="p-5 flex flex-col justify-between group cursor-pointer relative overflow-hidden bg-slate-900/40">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div>
                                <h3 className="text-[17px] font-bold text-white mb-1">{item.term}</h3>
                                <p className="text-[13px] text-dim">{item.context}</p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-[12px] text-dim font-medium">
                                        <span>{item.langIcon}</span>
                                        <span>{item.language}</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                    <div className="flex items-center gap-1.5 text-[12px] text-dim">
                                        {item.active === 'Speak' && <Mic2 size={12} />}
                                        {item.active === 'Learn' && <Book size={12} />}
                                        {item.active === 'Write' && <Edit2 size={12} />}
                                        {item.active}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-dim/60 font-medium">{item.timeAgo}</span>
                                    <button className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all">
                                        <Play size={12} className="ml-0.5" fill="currentColor" />
                                    </button>
                                </div>
                            </div>
                        </SpotlightCard>
                    ))}
                </div>
            </motion.div>

            {/* Your Collections */}
            <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="flex flex-col gap-4">
                <h2 className="text-lg font-bold text-white">Your Collections</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {collections.map(col => (
                        <SpotlightCard key={col.id} className="p-5 flex flex-col justify-between group cursor-pointer border border-white/5 hover:border-white/10 bg-slate-900/40">
                            <div className="flex gap-4">
                                <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${col.color} border border-white/5 flex items-center justify-center text-2xl shadow-inner`}>
                                    {col.icon}
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-white mb-0.5">{col.title}</h3>
                                    <p className="text-[12px] text-dim leading-snug">{col.desc}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-5 text-[12px]">
                                <span className="text-dim/80 font-medium">{col.count} items</span>
                                <span className="text-dim/60 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-white/20"/> Updated {col.updated}</span>
                            </div>
                        </SpotlightCard>
                    ))}
                    
                    {/* Add New Collection Card */}
                    <SpotlightCard className="p-5 flex flex-col items-center justify-center text-center group cursor-pointer border border-white/5 border-dashed bg-white/[0.02] hover:bg-white/[0.04]">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                            <span className="text-2xl font-light leading-none mb-1">+</span>
                        </div>
                        <h3 className="text-[15px] font-bold text-mist group-hover:text-white transition-colors">New Collection</h3>
                        <p className="text-[12px] text-dim mt-1">Create a folder</p>
                    </SpotlightCard>
                </div>
            </motion.div>

            {/* All Items */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="flex flex-col gap-4">
                <h2 className="text-lg font-bold text-white">All Items</h2>
                <div className="flex flex-col gap-2">
                    {allItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:bg-slate-900/60 hover:border-white/10 transition-all group">
                            
                            <div className="min-w-0 pr-4">
                                <h4 className="text-[15px] font-bold text-white mb-1 truncate whitespace-pre-line">{item.term}</h4>
                                <p className="text-[13px] text-dim truncate">{item.context}</p>
                            </div>
                            
                            <div className="flex items-center gap-6 shrink-0">
                                {/* Details */}
                                <div className="hidden md:flex items-center gap-4 text-[12px] text-dim font-medium mr-4">
                                    <div className="flex items-center gap-1.5">
                                        <span>{item.langIcon}</span>
                                        <span>{item.language}</span>
                                    </div>
                                    <div className="w-1 h-1 bg-white/10 rounded-full"/>
                                    <div className="flex items-center gap-1.5">
                                        {item.type === 'Speak' && <Mic2 size={12} />}
                                        {item.type === 'Learn' && <Book size={12} />}
                                        {item.type === 'Write' && <Edit2 size={12} />}
                                        {item.type}
                                    </div>
                                    <div className="w-1 h-1 bg-white/10 rounded-full"/>
                                    <span className="text-dim/60 w-16 text-right">{item.time}</span>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist hover:text-white transition-colors">
                                        <Play size={14} fill="currentColor" />
                                    </button>
                                    <button className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist hover:text-white transition-colors">
                                        <Mic size={14} />
                                    </button>
                                    <button className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist hover:text-white transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                    <button className={`w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors ${item.starred ? 'text-amber-400 hover:text-amber-300' : 'text-mist hover:text-white'}`}>
                                        <Star size={14} className={item.starred ? 'fill-amber-400' : ''} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button className="mt-auto mt-4 px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 text-[13px] font-bold text-mist hover:bg-white/10 hover:text-white transition-all flex items-center gap-2">
                        <ChevronDown size={14} />
                        Load More Items
                    </button>
                </div>
            </motion.div>

            {/* Smart Sections */}
            <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg font-bold text-white mb-1">Smart Sections</h2>
                    <p className="text-[13px] text-dim">Auto-generated from your activity</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {smartSections.map(section => {
                        const Icon = section.icon;
                        return (
                            <SpotlightCard key={section.id} className="p-5 group cursor-pointer bg-slate-900/40">
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-xl ${section.bg} ${section.color} flex items-center justify-center shrink-0`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="pt-0.5">
                                        <h3 className="text-[15px] font-bold text-white mb-1">{section.title}</h3>
                                        <p className="text-[12px] text-dim">{section.desc}</p>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center justify-between text-[12px] border-t border-white/5 pt-4">
                                    <span className="text-mist font-medium">{section.count} items</span>
                                    <span className="text-dim px-2 py-0.5 rounded-md bg-white/5">{section.action}</span>
                                </div>
                            </SpotlightCard>
                        )
                    })}
                </div>
            </motion.div>
            
            {/* CTA Banner */}
            <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="mt-4">
                <SpotlightCard className="p-6 relative overflow-hidden group border-indigo-500/20">
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10" />
                    <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-rose-500/20 blur-[80px] -translate-y-1/2 rounded-full mix-blend-screen" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-white/10">
                                <SparklesIcon className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-[17px] font-bold text-white mb-1">Practice from Library</h3>
                                <p className="text-[13px] text-dim">Generate a Speak or Learn session from your collections</p>
                            </div>
                        </div>
                        
                        <button className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[14px] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] whitespace-nowrap border border-indigo-400">
                            Start Practice <ArrowRight size={16} />
                        </button>
                    </div>
                </SpotlightCard>
            </motion.div>
            </section>
            <aside className="flex flex-col gap-5 xl:sticky xl:top-4">
                <SpotlightCard className="p-5">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Library Snapshot</p>
                    <h4 className="text-[20px] font-bold text-white mb-1">{allItems.length} items</h4>
                    <p className="text-[13px] text-dim mb-4">Across {collections.length} collections and {recentlyAdded.length} recent additions.</p>
                    <div className="space-y-2 text-[12px] text-dim">
                        <div className="flex items-center justify-between"><span>Starred</span><span className="text-mist font-bold">{starredCount}</span></div>
                        <div className="flex items-center justify-between"><span>Recent</span><span className="text-mist font-bold">{recentlyAdded.length}</span></div>
                        <div className="flex items-center justify-between"><span>Smart Groups</span><span className="text-mist font-bold">{smartSections.length}</span></div>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-5">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Quick Collections</p>
                    <div className="space-y-2">
                        {collections.slice(0, 3).map((col) => (
                            <button key={col.id} className="w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-mist">{col.title}</span>
                                    <span className="text-[12px] text-dim">{col.count}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-5">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Needs Review</p>
                    <div className="space-y-3">
                        {smartSections.map((section) => (
                            <div key={section.id} className="flex items-center justify-between text-[13px]">
                                <span className="text-dim">{section.title}</span>
                                <span className="text-white font-bold">{section.count}</span>
                            </div>
                        ))}
                    </div>
                </SpotlightCard>

                <SpotlightCard className="p-5">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Next Action</p>
                    <p className="text-[13px] text-dim mb-4">Start a generated review from your starred and recently added items.</p>
                    <button className="w-full rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-[13px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors">
                        Start Review
                    </button>
                </SpotlightCard>
            </aside>
            </div>
        </PageContent>
    );
}

function SparklesIcon(props: any) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}
