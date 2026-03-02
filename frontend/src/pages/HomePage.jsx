import { useNavigate } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';
import { createTournament } from '../api';

const STATUS_MAP = {
  setup:       { label: 'Configuração',    route: '/setup'   },
  group_stage: { label: 'Fase de Grupos',  route: '/groups'  },
  knockout:    { label: 'Playoffs',        route: '/bracket' },
  completed:   { label: 'Encerrado',       route: '/bracket' },
};

export default function HomePage() {
  const { tournament, refresh } = useTournament();
  const navigate = useNavigate();

  const handleNew = async () => {
    if (tournament && !confirm('Apagar torneio atual e começar do zero?')) return;
    await createTournament({ name: 'Aniversário - Severo' });
    await refresh();
    navigate('/setup');
  };

  const info = tournament ? STATUS_MAP[tournament.status] : null;

  return (
    <div className="max-w-xl mx-auto px-4 pt-12 pb-16">
      {/* Title */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Aniversário Severo</h1>
        <p className="text-zinc-500 mt-1 text-sm">Torneio de Beach Tennis</p>
      </div>

      {/* Active tournament status */}
      {tournament && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Torneio em andamento</p>
              <p className="text-sm font-semibold text-zinc-100">{info?.label}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {tournament && (
          <button
            className="w-full py-3.5 bg-white text-zinc-950 font-semibold rounded-lg text-sm
                       hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
            onClick={() => navigate(info?.route ?? '/setup')}
          >
            {tournament.status === 'setup'       && 'Continuar configuração'}
            {tournament.status === 'group_stage' && 'Ver grupos'}
            {tournament.status === 'knockout'    && 'Ver chave'}
            {tournament.status === 'completed'   && 'Ver resultado final'}
          </button>
        )}

        <button
          className={`w-full py-3.5 rounded-lg text-sm font-semibold transition-colors ${
            tournament
              ? 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              : 'bg-white text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200'
          }`}
          onClick={handleNew}
        >
          {tournament ? 'Novo torneio' : 'Iniciar torneio'}
        </button>
      </div>

      {/* Rules — only before any tournament */}
      {!tournament && (
        <div className="mt-10">
          {[
            ['Grupos',        'Todos os grupos com 3 duplas'],
            ['Classificação', 'Top 2 de cada grupo avançam'],
            ['Playoffs',      'R16 → R8 → R4 → Final'],
            ['Byes',          'Melhores colocados avançam direto quando o chaveamento não fecha'],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-4 py-3 border-b border-zinc-800 last:border-0">
              <span className="text-xs font-medium text-zinc-500 w-24 flex-shrink-0 pt-0.5">{title}</span>
              <span className="text-sm text-zinc-300">{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
