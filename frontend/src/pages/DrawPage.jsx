import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const GROUP_ACCENT = [
  'text-blue-400', 'text-orange-400', 'text-purple-400', 'text-green-400',
  'text-pink-400', 'text-yellow-400', 'text-cyan-400', 'text-red-400',
];

export default function DrawPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const animSequence = state?.animSequence;

  const groups = animSequence?.groups ?? [];
  const pairing = animSequence?.pairing ?? null;
  const pairingCount = pairing?.length ?? 0;

  // Build a flat, ordered list of animation steps upfront — no recursion
  const steps = useMemo(() => {
    if (!animSequence) return [];
    const result = [];
    if (pairing?.length) {
      pairing.forEach((pair) => result.push({ type: 'pair', pair }));
    }
    let gIdx = 0;
    groups.forEach((gData) => {
      gData.teams.forEach((team) => {
        result.push({ type: 'team', group: gData.group, team, gIdx });
      });
      gIdx++;
    });
    return result;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [stepIdx, setStepIdx]         = useState(-1);  // -1 = intro
  const [isDone, setIsDone]           = useState(false);
  const [formedPairs, setFormedPairs] = useState([]);
  // groupId → { group, teams[], gIdx }
  const [groupMap, setGroupMap]       = useState({});

  // Start after intro delay
  useEffect(() => {
    if (!animSequence) { setTimeout(() => navigate('/groups'), 800); return; }
    const t = setTimeout(() => setStepIdx(0), 1200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Process one step at a time — no recursive timeouts
  useEffect(() => {
    if (stepIdx < 0) return;
    if (stepIdx >= steps.length) { setIsDone(true); return; }

    const current = steps[stepIdx];

    if (current.type === 'pair') {
      setFormedPairs((prev) => [...prev, current.pair]);
    } else {
      setGroupMap((prev) => {
        const existing = prev[current.group.id];
        if (existing) {
          return { ...prev, [current.group.id]: { ...existing, teams: [...existing.teams, current.team] } };
        }
        return { ...prev, [current.group.id]: { group: current.group, teams: [current.team], gIdx: current.gIdx } };
      });
    }

    const t = setTimeout(() => setStepIdx((i) => i + 1), 700);
    return () => clearTimeout(t);
  }, [stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived phase label
  const phase = isDone ? 'done'
    : stepIdx < 0 ? 'intro'
    : stepIdx < pairingCount ? 'pairing'
    : 'assigning';

  const assignedCount = Object.values(groupMap).reduce((s, g) => s + g.teams.length, 0);
  const totalTeams    = groups.reduce((s, g) => s + g.teams.length, 0);
  const assignedGroups = Object.values(groupMap).sort((a, b) => a.gIdx - b.gIdx);

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-20">
      {/* Status */}
      <div className="mb-8">
        {phase === 'intro' && (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin flex-shrink-0" />
            <p className="text-base font-semibold text-zinc-100">Preparando sorteio...</p>
          </div>
        )}
        {phase === 'pairing' && (
          <div>
            <p className="text-base font-semibold text-zinc-100">Formando duplas</p>
            <p className="text-sm text-zinc-500 mt-0.5">{formedPairs.length} de {pairingCount}</p>
          </div>
        )}
        {phase === 'assigning' && (
          <div>
            <p className="text-base font-semibold text-zinc-100">Sorteando grupos</p>
            <p className="text-sm text-zinc-500 mt-0.5">{assignedCount} de {totalTeams} duplas</p>
          </div>
        )}
        {phase === 'done' && (
          <div>
            <p className="text-base font-semibold text-zinc-100">Sorteio concluído</p>
            <p className="text-sm text-zinc-500 mt-0.5">{assignedGroups.length} grupos formados</p>
          </div>
        )}
      </div>

      {/* Pairs */}
      {formedPairs.length > 0 && (phase === 'pairing' || (phase !== 'intro' && pairingCount > 0)) && (
        <div className="mb-8">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Duplas formadas</p>
          <AnimatePresence initial={false}>
            {formedPairs.map((pair, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
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
      )}

      {/* Groups */}
      {assignedGroups.length > 0 && (
        <div className="space-y-3">
          {phase === 'assigning' && (
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Grupos</p>
          )}
          <AnimatePresence initial={false}>
            {assignedGroups.map(({ group, teams, gIdx }) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-zinc-800">
                  <span className={`text-xs font-bold uppercase tracking-widest ${GROUP_ACCENT[gIdx % GROUP_ACCENT.length]}`}>
                    Grupo {group.name}
                  </span>
                </div>
                <div className="px-4 py-1">
                  <AnimatePresence initial={false}>
                    {teams.map((team, tIdx) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                        className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0"
                      >
                        <span className="text-xs text-zinc-600 w-4">{tIdx + 1}.</span>
                        <span className="text-sm text-zinc-200">{team.name}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Done CTA */}
      {isDone && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
