export default function StandingsTable({ standings }) {
  if (!standings?.length) return null;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-zinc-500 text-xs">
          <th className="text-left py-1.5 pr-3 font-medium w-6">#</th>
          <th className="text-left py-1.5 font-medium">Dupla</th>
          <th className="text-center py-1.5 font-medium w-8">V</th>
          <th className="text-center py-1.5 font-medium w-8">D</th>
          <th className="text-center py-1.5 font-medium w-12">Saldo</th>
          <th className="text-center py-1.5 font-medium w-10">%</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((entry, idx) => {
          const qualifies = idx < 2;
          return (
            <tr key={entry.team.id} className={`border-t border-zinc-800 ${!qualifies ? 'opacity-50' : ''}`}>
              <td className="py-2.5 pr-3 text-zinc-500 text-xs font-medium">{idx + 1}</td>
              <td className="py-2.5">
                <p className="font-medium text-zinc-100 truncate max-w-[140px] text-xs leading-snug">
                  {entry.team.name}
                </p>
                {qualifies && (
                  <p className="text-xs text-green-500 leading-none mt-0.5">classificado</p>
                )}
              </td>
              <td className="text-center py-2.5 font-semibold text-zinc-100 text-xs">{entry.wins}</td>
              <td className="text-center py-2.5 text-zinc-500 text-xs">{entry.losses}</td>
              <td className={`text-center py-2.5 text-xs font-medium ${entry.gamesDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {entry.gamesDiff > 0 ? '+' : ''}{entry.gamesDiff}
              </td>
              <td className="text-center py-2.5 text-zinc-400 text-xs">
                {entry.gamesPlayed > 0 ? `${Math.round(entry.gamesPercentage * 100)}%` : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
