import { Link, useLocation } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';

export default function Navbar() {
  const { tournament } = useTournament();
  const { pathname } = useLocation();

  const links = [
    { to: '/', label: 'Início' },
    { to: '/groups', label: 'Grupos', show: ['group_stage', 'knockout', 'completed'].includes(tournament?.status) },
    { to: '/bracket', label: 'Chave', show: ['knockout', 'completed'].includes(tournament?.status) },
  ].filter((l) => l.show !== false);

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="max-w-xl mx-auto px-4 h-12 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-100">
          Severo <span className="text-zinc-500 font-normal">· Beach Tennis</span>
        </span>
        <nav className="flex items-center gap-0.5">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.to
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
