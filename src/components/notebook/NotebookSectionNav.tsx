import { BookMarked, Dumbbell, Library } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const sections = [
  { to: '/notebook', label: 'Notebook', icon: BookMarked },
  { to: '/notebook/library', label: 'Library', icon: Library },
  { to: '/notebook/exercises', label: 'Exercises', icon: Dumbbell },
];

export default function NotebookSectionNav() {
  return (
    <nav aria-label="Notebook sections" className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-graphite/30 p-1.5">
      {sections.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/notebook'}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${
              isActive ? 'bg-violet text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'text-dim hover:bg-white/5 hover:text-mist'
            }`
          }
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
