import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const getTournament = () => api.get('/tournament');
export const createTournament = (data) => api.post('/tournament', data);
export const addPlayers = (names) => api.post('/tournament/players', { names });
export const deletePlayer = (id) => api.delete(`/tournament/players/${id}`);
export const addTeam = (player1_name, player2_name) => api.post('/tournament/teams', { player1_name, player2_name });
export const deleteTeam = (id) => api.delete(`/tournament/teams/${id}`);
export const assignTeamGroup = (teamId, group_name) => api.put(`/tournament/teams/${teamId}/group`, { group_name });
export const executeDraw = () => api.post('/tournament/draw');
export const getGroups = () => api.get('/groups');
export const updateMatchScore = (id, team1_games, team2_games) => api.put(`/matches/${id}/score`, { team1_games, team2_games });
export const advanceToKnockout = () => api.post('/tournament/advance');
export const getBracket = () => api.get('/bracket');

export default api;
