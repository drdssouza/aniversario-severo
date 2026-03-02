import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// One letter per group, cycling through colors
const GROUP_ACCENT = [
  'text-blue-400', 'text-orange-400', 'text-purple-400', 'text-green-400',
  'text-pink-400',  'text-yellow-400', 'text-cyan-400',  'text-red-400',
];

export default function DrawPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const animSequence = state?.animSequence;

  const [phase, setPhase] = useState('intro'); // intro | pairing | assigning | done
  const [currentPairIdx, setCurrentPairIdx] = useState(0);
  const [formedPairs, setFormedPairs] = useState([]);
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [currentAssignIdx, setCurrentAssignIdx] = useState(0);

  const groups = animSequence?.groups ?? [];
  const pairing = animSequence?.pairing ?? null;
  const totalTeams = groups.reduce((s, g) => s + g.teams.length, 0);

  // Kick off animation
  useEffect(() => {
    if (!animSequence) { setTimeout(() => navigate('/groups'), 800); return; }
    const t = setTimeout(() => setPhase(pairing?.length ? 'pairing' : 'assigning'), 1000);
    return () => clearTimeout(t);
  }, [animSequence, pairing, navigate]);

  // Pairing ticker
  useEffect(() => {
    if (phase !== 'pairing' || !pairing) return;
    if (currentPairIdx >= pairing.length) { setTimeout(() => setPhase('assigning'), 600); return; }
    const t = setTimeout(() => {
      setFormedPairs((prev) => [...prev, pairing[currentPairIdx]]);
      setCurrentPairIdx((i) => i + 1);
    }, 750);
    return () => clearTimeout(t);
  }, [phase, currentPairIdx, pairing]);

  // Group assignment ticker
  useEffect(() => {
    if (phase !== 'assigning') return;
    if (currentAssignIdx >= groups.length) { setTimeout(() => setPhase('done'), 600); return; }

    const group = groups[currentAssignIdx];
    let teamIdx = 0;

    const next = () => {
      if (teamIdx >= group.teams.length) { setCurrentAssignIdx((i) => i + 1); return; }
      setAssignedGroups((prev) => {
        const hit = prev.find((g) => g.group.id === group.group.id);
        if (hit) return prev.map((g) => g.group.id === group.group.id
          ? { ...g, teams: [...g.teams, group.teams[teamIdx]] } : g);
        return [...prev, { group: group.group, teams: [group.teams[teamIdx]] }];
      });
      teamIdx++;
      setTimeout(next, 600);
    };

    const t = setTimeout(next, 300);
    return () => clearTimeout(t);
  }, [phase, currentAssignIdx, groups]);

  const assignedCount = assignedGroups.reduce((s, g) => s + g.teams.length, 0);

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-20">
      {/* Status line */}
      <div className="mb-8">
        {phase === 'intro' && (
          <div>
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin mb-4" />
            <p className="text-lg font-semibold text-zinc-100">Preparando sorteio...</p>
          </div>
        )}
        {phase === 'pairing' && (
          <div>
            <p className="text-lg font-semibold text-zinc-100">Formando duplas</p>
            <p className="text-sm text-zinc-500 mt-0.5">{formedPairs.length} de {pairing?.length}</p>
          </div>
        )}
        {phase === 'assigning' && (
          <div>
            <p className="text-lg font-semibold text-zinc-100">Sorteando grupos</p>
            <p className="text-sm text-zinc-500 mt-0.5">{assignedCount} de {totalTeams} duplas alocadas</p>
          </div>
        )}
        {phase === 'done' && (
          <div>
            <p className="text-lg font-semibold text-zinc-100">Sorteio concluído</p>
            <p className="text-sm text-zinc-500 mt-0.5">Todos os grupos formados</p>
          </div>
        )}
      </div>

      {/* Pairs list */}
      {formedPairs.length > 0 && (phase === 'pairing' || (phase === 'assigning' && pairing)) && (
        <div className="mb-8">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Duplas formadas</p>
          <div className="space-y-1">
            <AnimatePresence>
              {formedPairs.map((pair, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex items-center gap-3 py-2.5 border-b border-zinc-800"
                >
                  <span className="text-xs text-zinc-600 w-5 text-right flex-shrink-0">{idx + 1}</span>
                  <span className="text-sm text-zinc-200">
                    {pair.player1.name}
                    <span className="text-zinc-600 mx-1.5">/</span>
                    {pair.player2?.name ?? '?'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Groups */}
      {assignedGroups.length > 0 && (
        <div className="space-y-4">
          {phase === 'assigning' && (
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Grupos</p>
          )}
          <AnimatePresence>
            {assignedGroups.map((gData, gIdx) => (
              <motion.div
                key={gData.group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-widest ${GROUP_ACCENT[gIdx % GROUP_ACCENT.length]}`}>
                    Grupo {gData.group.name}
                  </span>
                </div>
                <div className="px-4 py-2">
                  <AnimatePresence>
                    {gData.teams.map((team, tIdx) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0"
                      >
                        <span className="text-xs text-zinc-600 w-4">{tIdx + 1}.</span>
                        <span className="text-sm text-zinc-200">{team.name}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {/* Placeholders */}
                  {Array.from({ length: gData.group.size - gData.teams.length }).map((_, i) => (
                    <div key={i} className="h-9 animate-pulse" />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Done CTA */}
      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur border-t border-zinc-800"
        >
          <div className="max-w-xl mx-auto">
            <button
              className="w-full py-3.5 bg-white text-zinc-950 font-semibold rounded-lg text-sm
                         hover:bg-zinc-100 transition-colors"
              onClick={() => navigate('/groups')}
            >
              Ver grupos e partidas
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
