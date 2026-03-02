/**
 * Standard 16-team bracket slot assignment.
 * BRACKET_SLOTS[i] = the seed number that goes in slot (i+1).
 * Slots pair as: (1,2), (3,4), (5,6), (7,8), (9,10), (11,12), (13,14), (15,16)
 * giving R16 matches 1-8.
 */
const BRACKET_SLOTS = [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2];

/**
 * Generate the full knockout bracket.
 * @param {Array} seededQualifiers - [{teamId, seed (1-based), ...stats}]
 * @returns {Object} { r16, r8, r4, final } arrays of match objects
 */
function generateBracket(seededQualifiers) {
  // Build seed → teamId map
  const seedMap = {};
  seededQualifiers.forEach((q) => {
    seedMap[q.seed] = q.teamId;
  });

  // Build R16 matches (8 matches)
  const r16 = [];
  for (let i = 0; i < 8; i++) {
    const seed1 = BRACKET_SLOTS[i * 2];
    const seed2 = BRACKET_SLOTS[i * 2 + 1];
    const team1Id = seedMap[seed1] || null;
    const team2Id = seedMap[seed2] || null;

    let status = 'pending';
    let winnerId = null;
    let isBye = false;

    if (!team1Id && !team2Id) {
      // Both slots empty – shouldn't happen but skip
      status = 'bye';
      isBye = true;
    } else if (!team1Id || !team2Id) {
      // One slot empty → the other team gets a bye
      status = 'bye';
      isBye = true;
      winnerId = team1Id || team2Id;
    }

    r16.push({
      phase: 'R16',
      match_number: i + 1,
      team1_id: team1Id,
      team2_id: team2Id,
      winner_id: winnerId,
      is_bye: isBye,
      status,
    });
  }

  // R8: 4 matches, winners come from R16 pairs (1&2→R8-1, 3&4→R8-2, 5&6→R8-3, 7&8→R8-4)
  const r8 = [];
  for (let i = 0; i < 4; i++) {
    // If both corresponding R16 matches are byes, R8 match may also be auto-resolvable
    r8.push({
      phase: 'R8',
      match_number: i + 1,
      team1_id: null,
      team2_id: null,
      winner_id: null,
      is_bye: false,
      status: 'pending',
    });
  }

  // R4: 2 matches
  const r4 = [];
  for (let i = 0; i < 2; i++) {
    r4.push({
      phase: 'R4',
      match_number: i + 1,
      team1_id: null,
      team2_id: null,
      winner_id: null,
      is_bye: false,
      status: 'pending',
    });
  }

  // Final: 1 match
  const final = [{
    phase: 'Final',
    match_number: 1,
    team1_id: null,
    team2_id: null,
    winner_id: null,
    is_bye: false,
    status: 'pending',
  }];

  return { r16, r8, r4, final };
}

/**
 * After inserting all bracket matches, link them with next_match_id.
 * matchIds: { r16: [id1..id8], r8: [id9..id12], r4: [id13, id14], final: [id15] }
 */
function buildNextMatchLinks(matchIds) {
  const links = [];

  // R16 → R8: matches 1&2 → R8-1 (slot 1 for R16-1 winner, slot 2 for R16-2 winner)
  for (let i = 0; i < 8; i++) {
    const r8Index = Math.floor(i / 2);
    const slot = (i % 2) + 1;
    links.push({ id: matchIds.r16[i], next_match_id: matchIds.r8[r8Index], next_match_slot: slot });
  }

  // R8 → R4: matches 1&2 → R4-1, matches 3&4 → R4-2
  for (let i = 0; i < 4; i++) {
    const r4Index = Math.floor(i / 2);
    const slot = (i % 2) + 1;
    links.push({ id: matchIds.r8[i], next_match_id: matchIds.r4[r4Index], next_match_slot: slot });
  }

  // R4 → Final
  for (let i = 0; i < 2; i++) {
    links.push({ id: matchIds.r4[i], next_match_id: matchIds.final[0], next_match_slot: i + 1 });
  }

  return links;
}

module.exports = { generateBracket, buildNextMatchLinks };
