import { useState, useEffect, useCallback } from 'react';
import { getBracket } from '../api';
import ScoreModal from '../components/ScoreModal';

const PHASE_LABELS = { R16: 'Oitavas', R8: 'Quartas', R4: 'Semifinal', Final: 'Final' };

export default function BracketPage() {
  const [bracket, setBracket] = useState(null);
  const [champion, setChampion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoreMatch, setScoreMatch] = useState(null);
  const [activePhase, setActivePhase] = useState('R16');

  const fetchBracket = useCallback(async () => {
    try {
      const { data } = await getBracket();
      setBracket(data.bracket);
      setChampion(data.champion);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBracket();
    const id = setInterval(fetchBracket, 8000);
    return () => clearInterval(id);
  }, [fetchBracket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  const phases = ['R16', 'R8', 'R4', 'Final'].filter((p) => bracket?.[p]?.length);

  return (
    <div className="max-w-xl mx-auto pb-12">
      {/* Champion */}
      {champion && (
        <div className="mx-4 mt-4 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Campeão</p>
          <p className="text-lg font-bold text-zinc-100">{champion.name}</p>
        </div>
      )}

      {/* Phase tabs */}
      <div className="sticky top-12 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="px-4 flex gap-1 overflow-x-auto py-2">
          {phases.map((phase) => {
            const done = bracket?.[phase]?.every((m) => m.status === 'completed' || m.status === 'bye');
            return (
              <button
                key={phase}
                onClick={() => setActivePhase(phase)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activePhase === phase
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {PHASE_LABELS[phase]}
                {done && <span className="ml-1 text-green-500 text-xs">·</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Match list */}
      <div className="px-4 pt-4 space-y-2">
        {bracket?.[activePhase]?.map((match, idx) => (
          <MatchCard
            key={match.id}
            match={match}
            num={idx + 1}
            phase={activePhase}
            onScore={() => setScoreMatch(match)}
          />
        ))}
      </div>

      <ScoreModal match={scoreMatch} onClose={() => setScoreMatch(null)} onSaved={fetchBracket} />
    </div>
  );
}

function MatchCard({ match, num, phase, onScore }) {
  const done     = match.status === 'completed';
  const isBye    = match.status === 'bye';
  const t1Won    = done && match.winner_id === match.team1_id;
  const t2Won    = done && match.winner_id === match.team2_id;
  const hasTeams = match.team1_id && match.team2_id;
  const canScore = !isBye && hasTeams;   // allow editing even after done
  const waiting  = !isBye && !hasTeams;

  return (
    <div
      className={`bg-zinc-900 border rounded-xl overflow-hidden ${
        phase === 'Final' ? 'border-zinc-600' : 'border-zinc-800'
      }`}
    >
      {/* Match label */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-xs text-zinc-500">
          {phase === 'Final' ? 'Final' : `Jogo ${num}`}
          {isBye && <span className="ml-2 text-zinc-600">· bye</span>}
        </span>
        {waiting && <span className="text-xs text-zinc-600">aguardando</span>}
        {canScore && (
          <button
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
            onClick={onScore}
          >
            {done ? 'Editar placar' : 'Inserir placar'}
          </button>
        )}
      </div>

      {/* Teams */}
      <div
        className={canScore ? 'cursor-pointer hover:bg-zinc-800/40 transition-colors' : ''}
        onClick={() => canScore && onScore()}
      >
        <TeamRow name={match.team1_name} games={match.team1_games} won={t1Won} done={done} isBye={isBye && match.winner_id === match.team1_id} />
        <div className="h-px bg-zinc-800 mx-4" />
        <TeamRow name={match.team2_name} games={match.team2_games} won={t2Won} done={done} isBye={isBye && match.winner_id === match.team2_id} />
      </div>
    </div>
  );
}

function TeamRow({ name, games, won, done, isBye }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={`flex-1 text-sm truncate ${
        won ? 'text-zinc-100 font-semibold' : done ? 'text-zinc-500' : name ? 'text-zinc-300' : 'text-zinc-600 italic'
      }`}>
        {name ?? 'A definir'}
      </span>
      <div className="flex-shrink-0 flex items-center gap-2">
        {isBye && <span className="text-xs text-zinc-500 font-medium">BYE</span>}
        {done && !isBye && (
          <span className={`text-base font-bold ${won ? 'text-zinc-100' : 'text-zinc-500'}`}>
            {games ?? 0}
          </span>
        )}
      </div>
    </div>
  );
}
