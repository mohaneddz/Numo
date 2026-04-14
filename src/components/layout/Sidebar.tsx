import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home,
    GraduationCap,
    RotateCcw,
    Play,
    Mic,
    PenLine,
    BookMarked,
    BarChart3,
    Library,
    BookCopy,
    Settings,
    Star,
    MessageCircle,
    Dumbbell,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';
import { DEV_MODE } from '../../config/env';

const secondaryNav = [
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/references', icon: BookCopy, label: 'References' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
    collapsed: boolean;
    onToggleCollapsed: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
    const progression = useLanguageProgression();
    const requiredCount = progression.todayPlan.filter((item) => item.required).length;
    const missionProgress =
        progression.requiredMinutes > 0 && requiredCount > 0
            ? (Math.min(progression.firstEvidenceCount, requiredCount) / requiredCount) * 100
            : 0;
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

    if (DEV_MODE) {
        primaryNav.push({ to: '/exercises', icon: Dumbbell, label: 'Exercises' });
    }

    return (
        <aside
            className={`relative z-50 h-full shrink-0 border-r border-white/5 bg-black/10 pt-7 pb-5 backdrop-blur-sm transition-[width,padding] duration-300 ease-out ${
                collapsed ? 'w-[84px] px-3' : 'w-64 px-4'
            }`}
        >
            <button
                type="button"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={onToggleCollapsed}
                className="absolute top-8 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#0B1020] text-dim transition-colors hover:border-white/30 hover:text-mist"
            >
                {collapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
            </button>

            <div className={`mb-8 flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-2 pl-2'}`}>
                <img
                    src="/petals.png"
                    alt="Petals"
                    className="h-8 w-8 rounded-[10px] object-cover shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
                />
                <motion.span
                    initial={false}
                    animate={collapsed ? { opacity: 0, width: 0 } : { opacity: 1, width: 'auto' }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden whitespace-nowrap text-[20px] font-extrabold tracking-tight text-mist"
                >
                    Numo
                </motion.span>
            </div>

            <nav className="relative flex flex-1 flex-col gap-1 px-0">
                {primaryNav.map((item) => {
                    const isActive =
                        location.pathname === item.to ||
                        (item.to !== '/' && location.pathname.startsWith(item.to));

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            title={collapsed ? item.label : undefined}
                            className={`group relative flex items-center rounded-xl px-3 py-2.5 text-[14px] no-underline transition-colors duration-200 ${
                                collapsed ? 'justify-center' : 'gap-3'
                            } ${
                                isActive
                                    ? 'font-bold text-white'
                                    : 'font-medium text-dim hover:bg-white/[0.04] hover:text-mist'
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.08]"
                                    initial={false}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 30,
                                        mass: 0.8,
                                    }}
                                />
                            )}
                            <div
                                className={`relative z-10 flex w-full items-center ${
                                    collapsed ? 'justify-center' : 'gap-3'
                                }`}
                            >
                                <item.icon
                                    size={18}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-colors duration-200 ${
                                        isActive
                                            ? 'text-[#8B5CF6]'
                                            : 'text-dim group-hover:text-mist'
                                    }`}
                                />
                                <motion.span
                                    initial={false}
                                    animate={collapsed ? { opacity: 0, width: 0 } : { opacity: 1, width: 'auto' }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                                {item.badge &&
                                    (collapsed ? (
                                        <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full border border-[#0B1020] bg-coral" />
                                    ) : (
                                        <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-coral px-2 text-[11px] font-extrabold text-white shadow-[0_2px_8px_rgba(248,113,113,0.3)]">
                                            {item.badge}
                                        </span>
                                    ))}
                            </div>
                        </NavLink>
                    );
                })}

                <div className={`my-3 border-t border-white/5 ${collapsed ? 'mx-0' : 'mx-2'}`} />

                {secondaryNav.map((item) => {
                    const isActive =
                        location.pathname === item.to ||
                        (item.to !== '/' && location.pathname.startsWith(item.to));

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={collapsed ? item.label : undefined}
                            className={`group relative flex items-center rounded-xl px-3 py-2.5 text-[14px] no-underline transition-colors duration-200 ${
                                collapsed ? 'justify-center' : 'gap-3'
                            } ${
                                isActive
                                    ? 'font-bold text-white'
                                    : 'font-medium text-dim hover:bg-white/[0.04] hover:text-mist'
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active-indicator"
                                    className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.08]"
                                    initial={false}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 30,
                                        mass: 0.8,
                                    }}
                                />
                            )}
                            <div
                                className={`relative z-10 flex w-full items-center ${
                                    collapsed ? 'justify-center' : 'gap-3'
                                }`}
                            >
                                <item.icon
                                    size={18}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-colors duration-200 ${
                                        isActive
                                            ? 'text-[#8B5CF6]'
                                            : 'text-dim group-hover:text-mist'
                                    }`}
                                />
                                <motion.span
                                    initial={false}
                                    animate={collapsed ? { opacity: 0, width: 0 } : { opacity: 1, width: 'auto' }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            </div>
                        </NavLink>
                    );
                })}
            </nav>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className={`relative mt-4 overflow-hidden rounded-[18px] border border-[#8B5CF6]/20 bg-[#0A0C10]/40 shadow-[0_8px_32px_rgba(139,92,246,0.1)] backdrop-blur-md transition-all duration-300 ${
                    collapsed ? 'p-2.5' : 'p-4'
                }`}
            >
                <div className="absolute top-0 right-0 h-24 w-24 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.3),transparent_70%)]" />

                {!collapsed && (
                    <>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A78BFA]">
                            Today's Mission
                        </p>
                        <h4 className="mb-0.5 text-[15px] font-extrabold leading-snug tracking-tight text-[#FAFAFA]">
                            Guided Daily Track
                        </h4>
                        <p className="mb-3 text-[12px] leading-relaxed text-dim">
                            {progression.hasFirstEvidence
                                ? `Required ${progression.requiredMinutes} min, optional ${progression.optionalMinutes} min.`
                                : 'You are just getting started in this language. Today is a gentle starter path.'}
                        </p>
                    </>
                )}

                <div className="mb-2 h-[6px] overflow-hidden rounded-full bg-[#1A1F26]">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${missionProgress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)] shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                    />
                </div>

                {!collapsed ? (
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-dim">{requiredCount} required blocks</span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B]">
                            <Star size={11} fill="currentColor" /> {progression.targetMinutes}m target
                        </span>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B]">
                            <Star size={11} fill="currentColor" /> {progression.targetMinutes}m
                        </span>
                    </div>
                )}
            </motion.div>
        </aside>
    );
}
