/**
 * Fisher-Yates shuffle
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Calculate group sizes: minimize groups of 4, rest are groups of 3.
 * Returns array of group sizes, e.g. [3, 3, 3, 4, 4]
 */
function calculateGroupSizes(numTeams) {
  for (let b = 0; b <= Math.floor(numTeams / 4); b++) {
    const remaining = numTeams - 4 * b;
    if (remaining >= 0 && remaining % 3 === 0) {
      const a = remaining / 3;
      const sizes = [];
      for (let i = 0; i < a; i++) sizes.push(3);
      for (let i = 0; i < b; i++) sizes.push(4);
      return sizes;
    }
  }
  // Fallback: shouldn't happen for reasonable team counts
  return [numTeams];
}

/**
 * Randomly pair individual players into teams.
 * Returns array of {player1, player2} pairs.
 */
function pairPlayers(players) {
  const shuffled = shuffle(players);
  const pairs = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push({
      player1: shuffled[i],
      player2: shuffled[i + 1] || null,
    });
  }
  return pairs;
}

/**
 * Assign teams to groups randomly.
 * Returns array of {groupIndex, teamIds[]} assignments.
 */
function assignTeamsToGroups(teamIds, groupSizes) {
  const shuffled = shuffle(teamIds);
  const groups = [];
  let idx = 0;
  for (let g = 0; g < groupSizes.length; g++) {
    groups.push({
      groupIndex: g,
      teamIds: shuffled.slice(idx, idx + groupSizes[g]),
    });
    idx += groupSizes[g];
  }
  return groups;
}

/**
 * Generate round-robin match pairs for a group.
 * Returns array of {team1Id, team2Id}.
 */
function generateRoundRobin(teamIds) {
  const matches = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({ team1Id: teamIds[i], team2Id: teamIds[j] });
    }
  }
  return matches;
}

/**
 * Group letter from index: 0 → 'A', 1 → 'B', etc.
 */
function groupLetter(index) {
  return String.fromCharCode(65 + index);
}

module.exports = { shuffle, calculateGroupSizes, pairPlayers, assignTeamsToGroups, generateRoundRobin, groupLetter };
