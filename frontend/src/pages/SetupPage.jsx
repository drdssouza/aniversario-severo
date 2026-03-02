import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTournament } from '../contexts/TournamentContext';
import {
  createTournament, addPlayers, addTeam, deletePlayer, deleteTeam,
  assignTeamGroup, executeDraw,
} from '../api';

const MODES = [
  {
    id: 'individual',
    title: 'Jogadores individuais',
    desc: 'Adicione os nomes — o sistema forma as duplas e sorteia os grupos.',
  },
  {
    id: 'teams_random',
    title: 'Duplas prontas · grupos aleatórios',
    desc: 'Você define as duplas, o sistema sorteia os grupos.',
  },
  {
    id: 'teams_manual',
    title: 'Duplas prontas · grupos manuais',
    desc: 'Você define as duplas e escolhe o grupo de cada uma.',
  },
];

const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J'];

export default function SetupPage() {
  const { tournament, teams, players, refresh } = useTournament();
  const navigate = useNavigate();

  const [mode, setMode] = useState(tournament?.setup_mode ?? null);
  const [step, setStep] = useState(mode ? 2 : 1);

  const [playerInput, setPlayerInput] = useState('');
  const playerInputRef = useRef(null);

  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [teamGroups, setTeamGroups] = useState({});

  const [loading, setLoading] = useState(false);
  const [drawLoading, setDrawLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectMode = async (selectedMode) => {
    setLoading(true);
    setError('');
    try {
      await createTournament({ name: 'Aniversário - Severo', setup_mode: selectedMode });
      await refresh();
      setMode(selectedMode);
      setStep(2);
    } catch {
      setError('Erro ao criar torneio.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    const name = playerInput.trim();
    if (!name) return;
    try {
      await addPlayers([name]);
      setPlayerInput('');
      playerInputRef.current?.focus();
      await refresh();
    } catch {
      setError('Erro ao adicionar jogador.');
    }
  };

  const handleAddTeam = async () => {
    if (!p1.trim() || !p2.trim()) return setError('Preencha os dois jogadores.');
    try {
      await addTeam(p1.trim(), p2.trim());
      setP1(''); setP2('');
      setError('');
      await refresh();
    } catch {
      setError('Erro ao adicionar dupla.');
    }
  };

  const handleDraw = async () => {
    if (mode === 'individual' && players.length < 4) return setError('Adicione pelo menos 4 jogadores.');
    if (mode === 'individual' && players.length % 2 !== 0) return setError('Número de jogadores deve ser par.');
    if (mode !== 'individual' && teams.length < 3) return setError('Adicione pelo menos 3 duplas.');

    if (mode === 'teams_manual') {
      for (const team of teams) {
        const g = teamGroups[team.id];
        if (g) await assignTeamGroup(team.id, g);
      }
    }

    setDrawLoading(true);
    setError('');
    try {
      const { data } = await executeDraw();
      await refresh();
      navigate('/draw', { state: { animSequence: data.animSequence } });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao realizar sorteio.');
    } finally {
      setDrawLoading(false);
    }
  };

  const countLabel = mode === 'individual'
    ? `${players.length} jogador${players.length !== 1 ? 'es' : ''}`
    : `${teams.length} dupla${teams.length !== 1 ? 's' : ''}`;

  const numGroups = mode === 'individual'
    ? Math.ceil(players.length / 2 / 3)
    : Math.ceil(teams.length / 3);

  const canDraw = mode === 'individual'
    ? players.length >= 4 && players.length % 2 === 0
    : teams.length >= 3;

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-20">
      {/* Step 1 — mode selection */}
      {step === 1 && (
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-1">Configurar torneio</h1>
          <p className="text-sm text-zinc-500 mb-6">Como quer organizar as duplas e grupos?</p>

          <div className="space-y-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600
                           rounded-xl p-4 transition-colors touch-manipulation disabled:opacity-40"
                onClick={() => handleSelectMode(m.id)}
                disabled={loading}
              >
                <p className="text-sm font-semibold text-zinc-100">{m.title}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{m.desc}</p>
              </button>
            ))}
          </div>

          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </div>
      )}

      {/* Step 2 — add players / teams */}
      {step === 2 && (
        <div>
          {/* Header */}
          <div className="flex items-baseline gap-3 mb-6">
            <button
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => setStep(1)}
            >
              Voltar
            </button>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-500">{countLabel}</span>
            {mode === 'individual' && players.length % 2 !== 0 && players.length > 0 && (
              <span className="text-xs text-yellow-500">número ímpar</span>
            )}
          </div>

          {/* Individual mode */}
          {mode === 'individual' && (
            <div>
              <div className="flex gap-2 mb-1">
                <input
                  ref={playerInputRef}
                  type="text"
                  className="input flex-1"
                  placeholder="Nome do jogador"
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                  autoFocus
                />
                <button
                  className="px-4 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg
                             hover:bg-zinc-700 transition-colors font-semibold text-sm"
                  onClick={handleAddPlayer}
                >
                  +
                </button>
              </div>
              <p className="text-xs text-zinc-600 mb-4">Enter para adicionar</p>

              <AnimatePresence initial={false}>
                {players.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between border-b border-zinc-800 py-2.5"
                  >
                    <span className="text-sm text-zinc-200">{p.name}</span>
                    <button
                      className="text-zinc-600 hover:text-red-400 text-base leading-none px-2 transition-colors"
                      onClick={async () => { await deletePlayer(p.id); await refresh(); }}
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {players.length > 1 && (
                <p className="text-xs text-zinc-600 mt-4">
                  {Math.floor(players.length / 2)} duplas · {numGroups} grupos aproximados
                </p>
              )}
            </div>
          )}

          {/* Teams mode */}
          {(mode === 'teams_random' || mode === 'teams_manual') && (
            <div>
              {/* Add team form */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
                <p className="text-xs text-zinc-500 font-medium mb-3">Nova dupla</p>
                <input
                  type="text"
                  className="input mb-2"
                  placeholder="Jogador 1"
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('p2')?.focus()}
                />
                <input
                  id="p2"
                  type="text"
                  className="input mb-3"
                  placeholder="Jogador 2"
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                />
                {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                <button
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                             text-zinc-200 text-sm font-medium rounded-lg transition-colors"
                  onClick={handleAddTeam}
                >
                  Adicionar dupla
                </button>
              </div>

              {/* Team list */}
              <AnimatePresence initial={false}>
                {teams.map((team) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-zinc-800 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 font-medium">{team.name}</p>
                        {mode === 'teams_manual' && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {GROUP_LETTERS.slice(0, Math.max(numGroups + 2, 6)).map((letter) => (
                              <button
                                key={letter}
                                className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${
                                  teamGroups[team.id] === letter
                                    ? 'bg-zinc-100 text-zinc-900'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                                onClick={() => setTeamGroups((prev) => ({ ...prev, [team.id]: letter }))}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        className="text-zinc-600 hover:text-red-400 text-lg leading-none flex-shrink-0 transition-colors"
                        onClick={async () => { await deleteTeam(team.id); await refresh(); }}
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {teams.length > 1 && (
                <p className="text-xs text-zinc-600 mt-4">
                  {teams.length} duplas · ~{numGroups} grupos
                </p>
              )}
            </div>
          )}

          {error && mode === 'individual' && (
            <p className="text-red-400 text-xs mt-3">{error}</p>
          )}

          {/* Draw button */}
          {canDraw && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
              <div className="max-w-xl mx-auto">
                {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}
                <button
                  className="w-full py-3.5 bg-white text-zinc-950 font-semibold rounded-lg text-sm
                             hover:bg-zinc-100 transition-colors disabled:opacity-40"
                  onClick={handleDraw}
                  disabled={drawLoading}
                >
                  {drawLoading ? 'Sorteando...' : 'Realizar sorteio'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
