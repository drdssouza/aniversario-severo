/**
 * Calculate group standings from teams and their completed matches.
 * Criteria: wins → game differential → games percentage
 */
function calculateGroupStandings(teams, matches) {
  const stats = teams.map((team) => {
    let wins = 0, losses = 0, gamesWon = 0, gamesLost = 0;

    matches.forEach((match) => {
      if (match.status !== 'completed') return;

      const isTeam1 = match.team1_id === team.id;
      const isTeam2 = match.team2_id === team.id;

      if (!isTeam1 && !isTeam2) return;

      if (isTeam1) {
        gamesWon += match.team1_games || 0;
        gamesLost += match.team2_games || 0;
        if (match.winner_id === team.id) wins++;
        else losses++;
      } else {
        gamesWon += match.team2_games || 0;
        gamesLost += match.team1_games || 0;
        if (match.winner_id === team.id) wins++;
        else losses++;
      }
    });

    const gamesPlayed = gamesWon + gamesLost;
    const gamesDiff = gamesWon - gamesLost;
    const gamesPercentage = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;

    return { team, wins, losses, gamesWon, gamesLost, gamesPlayed, gamesDiff, gamesPercentage };
  });

  return stats.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
    return b.gamesPercentage - a.gamesPercentage;
  });
}

/**
 * Sort all qualifiers for bracket seeding.
 * Group 1st places seeded before 2nd places.
 * Within same position, sort by: wins → game diff → games %.
 */
function seedQualifiers(qualifiers) {
  return qualifiers.sort((a, b) => {
    if (a.groupPosition !== b.groupPosition) return a.groupPosition - b.groupPosition;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
    return b.gamesPercentage - a.gamesPercentage;
  });
}

module.exports = { calculateGroupStandings, seedQualifiers };
