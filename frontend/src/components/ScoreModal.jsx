import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateMatchScore } from '../api';

export default function ScoreModal({ match, onClose, onSaved }) {
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setT1(match?.team1_games ?? '');
    setT2(match?.team2_games ?? '');
    setError('');
  }, [match]);

  if (!match) return null;

  const handleSave = async () => {
    const g1 = parseInt(t1);
    const g2 = parseInt(t2);
    if (isNaN(g1) || isNaN(g2)) return setError('Preencha o placar das duas duplas.');
    if (g1 < 0 || g2 < 0) return setError('Placar não pode ser negativo.');
    if (g1 === g2) return setError('Não pode terminar empatado.');
    setSaving(true);
    try {
      await updateMatchScore(match.id, g1, g2);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const PHASE_LABEL = { group: 'Grupos', R16: 'Oitavas', R8: 'Quartas', R4: 'Semifinal', Final: 'Final' };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-3"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 mb-0.5">{PHASE_LABEL[match.phase] ?? match.phase}</p>
            <p className="text-base font-semibold text-zinc-100">Resultado</p>
          </div>

          {/* Score inputs */}
          <div className="px-5 py-4 space-y-3">
            {[
              { name: match.team1_name || 'Dupla 1', val: t1, set: setT1 },
              { name: match.team2_name || 'Dupla 2', val: t2, set: setT2 },
            ].map((team, i) => (
              <div key={i} className="flex items-center gap-3">
                <p className="flex-1 text-sm font-medium text-zinc-200 truncate">{team.name}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="99"
                  value={team.val}
                  onChange={(e) => team.set(e.target.value)}
                  placeholder="0"
                  className="w-14 text-center text-xl font-bold bg-zinc-800 border border-zinc-700
                             text-zinc-100 rounded-lg py-2 focus:outline-none focus:border-zinc-500"
                />
              </div>
            ))}

            {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              className="flex-1 py-3 text-sm font-semibold rounded-lg bg-zinc-800 text-zinc-300
                         hover:bg-zinc-700 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="flex-1 py-3 text-sm font-semibold rounded-lg bg-white text-zinc-950
                         hover:bg-zinc-100 transition-colors disabled:opacity-40"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
