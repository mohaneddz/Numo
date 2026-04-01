import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home, GraduationCap, RotateCcw, Play, Mic, PenLine,
    BookMarked, BarChart3, Library, BookCopy, Settings, Star, MessageCircle
} from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';

const secondaryNav = [
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/references', icon: BookCopy, label: 'References' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    const progression = useLanguageProgression();
    const missionProgress = progression.requiredMinutes > 0 ? (Math.min(progression.firstEvidenceCount, progression.todayPlan.filter((item) => item.required).length) / progression.todayPlan.filter((item) => item.required).length) * 100 : 0;
    const location = useLocation();
    const { dueCount } = useAppData();
    const primaryNav = [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/learn', icon: GraduationCap, label: 'Learn' },
        { to: '/review', icon: RotateCcw, label: 'Review', badge: dueCount },
        { to: '/immerse', icon: Play, label: 'Immerse' },
        { to: '/speak', icon: Mic, label: 'Speak' },
        { to: '/write', icon: PenLine, label: 'Write' },
        { to: '/notebook', icon: BookMarked, label: 'Notebook' },
        { to: '/insights', icon: BarChart3, label: 'Insights' },
    ];

    return (
        <aside className="w-64 shrink-0 h-full flex flex-col pt-7 pb-5 px-4 z-50 bg-black/10 backdrop-blur-sm border-r border-white/5">
            {/* Brand */}
            <div className="flex items-center gap-3 px-2 mb-8 pl-2">
                <img
                    src="/petals.png"
                    alt="Petals"
                    className="w-8 h-8 rounded-[10px] object-cover shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
                />
                <span className="font-extrabold text-[20px] tracking-tight text-mist">
                    Numo
                </span>
            </div>

            {/* Primary Nav */}
            <nav className="flex flex-col gap-1 flex-1 px-0 relative">
                {primaryNav.map(item => {
                    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline text-[14px] transition-colors duration-200 relative group ${isActive
                                ? 'font-bold text-white'
                                : 'font-medium text-dim hover:text-mist hover:bg-white/[0.04]'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute inset-0 bg-white/[0.08] border border-white/10 rounded-xl"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30,
                                        mass: 0.8
                                    }}
                                />
                            )}
                            <div className="relative flex items-center gap-3 w-full z-10">
                                <item.icon 
                                    size={18} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                    className={`transition-colors duration-200 ${isActive ? 'text-[#8B5CF6]' : 'text-dim group-hover:text-mist'}`} 
                                />
                                <span>{item.label}</span>
                                {item.badge && (
                                    <span className="ml-auto bg-coral text-white text-[11px] font-extrabold rounded-full px-2 min-w-[22px] h-[22px] flex items-center justify-center shadow-[0_2px_8px_rgba(248,113,113,0.3)]">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                        </NavLink>
                    );
                })}

                {/* Separator */}
                <div className="my-3 border-t border-white/5 mx-2" />

                {/* Secondary Nav */}
                {secondaryNav.map(item => {
                    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline text-[14px] transition-colors duration-200 relative group ${isActive
                                ? 'font-bold text-white'
                                : 'font-medium text-dim hover:text-mist hover:bg-white/[0.04]'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute inset-0 bg-white/[0.08] border border-white/10 rounded-xl"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30,
                                        mass: 0.8
                                    }}
                                />
                            )}
                            <div className="relative flex items-center gap-3 w-full z-10">
                                <item.icon 
                                    size={18} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                    className={`transition-colors duration-200 ${isActive ? 'text-[#8B5CF6]' : 'text-dim group-hover:text-mist'}`} 
                                />
                                <span>{item.label}</span>
                            </div>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Today's Mission Card — bottom of sidebar */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-4 p-4 rounded-[18px] bg-[#0A0C10]/40 backdrop-blur-md border border-[#8B5CF6]/20 relative overflow-hidden shadow-[0_8px_32px_rgba(139,92,246,0.1)]"
            >
                {/* Subtle glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.3),transparent_70%)]" />

                <p className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider mb-1.5">Today's Mission</p>
                <h4 className="text-[15px] font-extrabold mb-0.5 text-[#FAFAFA] leading-snug tracking-tight">Guided Daily Track</h4>
                <p className="text-[12px] text-dim leading-relaxed mb-3">
                    {progression.hasFirstEvidence
                        ? `Required ${progression.requiredMinutes} min, optional ${progression.optionalMinutes} min.`
                        : 'You are just getting started in this language. Today is a gentle starter path.'}
                </p>

                <div className="h-[6px] rounded-full bg-[#1A1F26] overflow-hidden mb-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${missionProgress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)] shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                    />
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-[11px] text-dim font-medium">
                        {progression.todayPlan.filter((item) => item.required).length} required blocks
                    </span>
                    <span className="text-[11px] text-[#F59E0B] font-bold flex items-center gap-1">
                        <Star size={11} fill="currentColor" /> {progression.targetMinutes}m target
                    </span>
                </div>
            </motion.div>
        </aside>
    );
}
