import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, advanceToKnockout } from '../api';
import { useTournament } from '../contexts/TournamentContext';
import StandingsTable from '../components/StandingsTable';
import ScoreModal from '../components/ScoreModal';

export default function GroupsPage() {
  const { tournament, refresh: refreshTournament } = useTournament();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scoreMatch, setScoreMatch] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await getGroups();
      setGroups(data.groups);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    const id = setInterval(fetchGroups, 8000);
    return () => clearInterval(id);
  }, [fetchGroups]);

  const allDone = groups.length > 0 && groups.every((g) => g.matches.every((m) => m.status === 'completed'));
  const isReadOnly = tournament?.status === 'knockout' || tournament?.status === 'completed';

  const handleAdvance = async () => {
    setAdvancing(true);
    setError('');
    try {
      await advanceToKnockout();
      await refreshTournament();
      navigate('/bracket');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar chave.');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  const current = groups[activeGroup];

  return (
    <div className="max-w-xl mx-auto pb-28">
      {/* Group tabs */}
      <div className="sticky top-12 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="px-4 flex gap-1 overflow-x-auto py-2">
          {groups.map((g, idx) => {
            const done = g.matches.every((m) => m.status === 'completed');
            return (
              <button
                key={g.group.id}
                onClick={() => setActiveGroup(idx)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeGroup === idx
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {g.group.name}
                {done && <span className="ml-1 text-green-500 text-xs">·</span>}
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <div key={current.group.id} className="px-4 pt-4 space-y-4">
          {/* Standings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Classificação · Grupo {current.group.name}
            </p>
            <StandingsTable standings={current.standings} />
          </div>

          {/* Matches */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 pt-4 pb-2">
              Partidas
            </p>
            {current.matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                onScore={() => setScoreMatch(match)}
                readOnly={isReadOnly}
              />
            ))}
          </div>
        </div>
      )}

      {/* Advance to knockout */}
      {allDone && tournament?.status === 'group_stage' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
          <div className="max-w-xl mx-auto">
            {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}
            <button
              className="w-full py-3.5 bg-white text-zinc-950 font-semibold rounded-lg text-sm
                         hover:bg-zinc-100 transition-colors disabled:opacity-40"
              onClick={handleAdvance}
              disabled={advancing}
            >
              {advancing ? 'Gerando chave...' : 'Avançar para playoffs'}
            </button>
          </div>
        </div>
      )}

      <ScoreModal match={scoreMatch} onClose={() => setScoreMatch(null)} onSaved={fetchGroups} />
    </div>
  );
}

function MatchRow({ match, onScore, readOnly }) {
  const done = match.status === 'completed';
  const t1Won = done && match.winner_id === match.team1_id;
  const t2Won = done && match.winner_id === match.team2_id;
  const clickable = !readOnly;

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 border-t border-zinc-800
                  text-left transition-colors touch-manipulation
                  ${clickable ? 'hover:bg-zinc-800/50 active:bg-zinc-800' : 'cursor-default'}`}
      onClick={() => clickable && onScore()}
      disabled={readOnly}
    >
      {/* Team 1 */}
      <span className={`flex-1 text-sm truncate ${t1Won ? 'text-zinc-100 font-semibold' : done ? 'text-zinc-400' : 'text-zinc-300'}`}>
        {match.team1_name}
      </span>

      {/* Score / vs */}
      <span className="flex-shrink-0 text-sm font-mono w-14 text-center">
        {done
          ? <span className="font-bold text-zinc-100">{match.team1_games}<span className="text-zinc-600 font-normal mx-0.5">–</span>{match.team2_games}</span>
          : <span className="text-zinc-600">vs</span>
        }
      </span>

      {/* Team 2 */}
      <span className={`flex-1 text-sm truncate text-right ${t2Won ? 'text-zinc-100 font-semibold' : done ? 'text-zinc-400' : 'text-zinc-300'}`}>
        {match.team2_name}
      </span>
    </button>
  );
}
