import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTournament } from '../api';

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await getTournament();
      setTournament(data.tournament);
      setTeams(data.teams || []);
      setPlayers(data.players || []);
    } catch (err) {
      console.error('Failed to load tournament:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <TournamentContext.Provider value={{ tournament, teams, players, loading, refresh, setTournament, setTeams, setPlayers }}>
      {children}
    </TournamentContext.Provider>
  );
}

export const useTournament = () => useContext(TournamentContext);
