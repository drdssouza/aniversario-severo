const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { shuffle, calculateGroupSizes, pairPlayers, assignTeamsToGroups, generateRoundRobin, groupLetter } = require('../utils/drawLogic');
const { calculateGroupStandings, seedQualifiers } = require('../utils/standings');
const { generateBracket, buildNextMatchLinks } = require('../utils/bracketLogic');

// GET /api/tournament – current tournament
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!rows.length) return res.json({ tournament: null });

    const tournament = rows[0];
    const { rows: teams } = await pool.query('SELECT * FROM teams WHERE tournament_id = $1 ORDER BY id', [tournament.id]);
    const { rows: players } = await pool.query('SELECT * FROM players WHERE tournament_id = $1 ORDER BY id', [tournament.id]);

    res.json({ tournament, teams, players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tournament – create new tournament (resets existing)
router.post('/', async (req, res) => {
  const { name = 'Aniversário - Severo', setup_mode } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Remove old tournament(s)
    await client.query('DELETE FROM tournaments');
    const { rows } = await client.query(
      'INSERT INTO tournaments (name, status, setup_mode) VALUES ($1, $2, $3) RETURNING *',
      [name, 'setup', setup_mode]
    );
    await client.query('COMMIT');
    res.json({ tournament: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/tournament/players – add individual players (bulk)
router.post('/players', async (req, res) => {
  const { names } = req.body; // array of strings
  const client = await pool.connect();
  try {
    const { rows: [tournament] } = await client.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!tournament) return res.status(404).json({ error: 'No tournament found' });

    const inserted = [];
    for (const name of names) {
      if (!name?.trim()) continue;
      const { rows } = await client.query(
        'INSERT INTO players (tournament_id, name) VALUES ($1, $2) RETURNING *',
        [tournament.id, name.trim()]
      );
      inserted.push(rows[0]);
    }
    res.json({ players: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/tournament/players/:id
router.delete('/players/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM players WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tournament/teams – add a team (dupla)
router.post('/teams', async (req, res) => {
  const { player1_name, player2_name } = req.body;
  try {
    const { rows: [tournament] } = await pool.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!tournament) return res.status(404).json({ error: 'No tournament found' });

    const name = `${player1_name.trim()} / ${player2_name.trim()}`;
    const { rows } = await pool.query(
      'INSERT INTO teams (tournament_id, player1_name, player2_name, name) VALUES ($1, $2, $3, $4) RETURNING *',
      [tournament.id, player1_name.trim(), player2_name.trim(), name]
    );
    res.json({ team: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tournament/teams/:id
router.delete('/teams/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tournament/teams/:id/group – assign team to specific group (manual mode)
router.put('/teams/:id/group', async (req, res) => {
  const { group_name } = req.body;
  try {
    const { rows: [tournament] } = await pool.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!tournament) return res.status(404).json({ error: 'No tournament found' });

    // Find or create the group
    let groupRow;
    const { rows: existing } = await pool.query(
      'SELECT * FROM groups WHERE tournament_id = $1 AND name = $2',
      [tournament.id, group_name]
    );
    if (existing.length) {
      groupRow = existing[0];
    } else {
      const { rows } = await pool.query(
        'INSERT INTO groups (tournament_id, name, size) VALUES ($1, $2, $3) RETURNING *',
        [tournament.id, group_name, 3]
      );
      groupRow = rows[0];
    }

    await pool.query('UPDATE teams SET group_id = $1 WHERE id = $2', [groupRow.id, req.params.id]);
    res.json({ success: true, group: groupRow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tournament/draw – execute the draw
router.post('/draw', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [tournament] } = await client.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!tournament) return res.status(404).json({ error: 'No tournament found' });

    let teams = [];
    let pairingSequence = null; // For individual mode animation

    if (tournament.setup_mode === 'individual') {
      // 1. Get all players
      const { rows: players } = await client.query(
        'SELECT * FROM players WHERE tournament_id = $1',
        [tournament.id]
      );
      if (players.length < 4) return res.status(400).json({ error: 'Need at least 4 players' });
      if (players.length % 2 !== 0) return res.status(400).json({ error: 'Need an even number of players' });

      // 2. Pair players randomly
      const pairs = pairPlayers(players);
      pairingSequence = pairs; // For animation

      // 3. Create teams in DB
      for (const pair of pairs) {
        const p1 = pair.player1.name;
        const p2 = pair.player2 ? pair.player2.name : 'TBD';
        const name = `${p1} / ${p2}`;
        const { rows } = await client.query(
          'INSERT INTO teams (tournament_id, player1_name, player2_name, name) VALUES ($1, $2, $3, $4) RETURNING *',
          [tournament.id, p1, p2, name]
        );
        teams.push(rows[0]);

        // Update players with team_id
        await client.query('UPDATE players SET team_id = $1 WHERE id = $2', [rows[0].id, pair.player1.id]);
        if (pair.player2) {
          await client.query('UPDATE players SET team_id = $1 WHERE id = $2', [rows[0].id, pair.player2.id]);
        }
      }
    } else {
      // Teams already exist
      const { rows } = await client.query(
        'SELECT * FROM teams WHERE tournament_id = $1 ORDER BY id',
        [tournament.id]
      );
      teams = rows;
    }

    if (teams.length < 3) return res.status(400).json({ error: 'Need at least 3 teams' });

    // 4. Clear existing groups and matches
    await client.query('DELETE FROM matches WHERE tournament_id = $1 AND phase = $2', [tournament.id, 'group']);
    await client.query('DELETE FROM groups WHERE tournament_id = $1', [tournament.id]);
    await client.query('UPDATE teams SET group_id = NULL WHERE tournament_id = $1', [tournament.id]);

    let groupAssignments;

    if (tournament.setup_mode === 'teams_manual') {
      // Teams already have group assignments - build from existing group_id
      const { rows: existingGroups } = await client.query(
        'SELECT * FROM groups WHERE tournament_id = $1 ORDER BY name',
        [tournament.id]
      );
      groupAssignments = existingGroups.map((g) => ({
        group: g,
        teamIds: teams.filter((t) => t.group_id === g.id).map((t) => t.id),
      }));
    } else {
      // 5. Calculate group sizes and randomly assign teams
      const groupSizes = calculateGroupSizes(teams.length);
      const assignments = assignTeamsToGroups(teams.map((t) => t.id), groupSizes);

      groupAssignments = [];
      for (let i = 0; i < assignments.length; i++) {
        const { rows: [group] } = await client.query(
          'INSERT INTO groups (tournament_id, name, size) VALUES ($1, $2, $3) RETURNING *',
          [tournament.id, groupLetter(i), assignments[i].teamIds.length]
        );
        await client.query(
          `UPDATE teams SET group_id = $1 WHERE id = ANY($2::int[])`,
          [group.id, assignments[i].teamIds]
        );
        groupAssignments.push({ group, teamIds: assignments[i].teamIds });
      }
    }

    // 6. Generate round-robin matches for each group
    let matchOrder = 1;
    for (const { group, teamIds } of groupAssignments) {
      const roundRobin = generateRoundRobin(teamIds);
      for (const match of roundRobin) {
        await client.query(
          `INSERT INTO matches (tournament_id, group_id, phase, team1_id, team2_id, status, scheduled_order)
           VALUES ($1, $2, 'group', $3, $4, 'pending', $5)`,
          [tournament.id, group.id, match.team1Id, match.team2Id, matchOrder++]
        );
      }
    }

    // 7. Update tournament status
    await client.query(
      "UPDATE tournaments SET status = 'group_stage', updated_at = NOW() WHERE id = $1",
      [tournament.id]
    );

    await client.query('COMMIT');

    // Fetch final state for response
    const { rows: finalGroups } = await client.query(
      'SELECT * FROM groups WHERE tournament_id = $1 ORDER BY name',
      [tournament.id]
    );
    const { rows: finalTeams } = await client.query(
      'SELECT * FROM teams WHERE tournament_id = $1 ORDER BY id',
      [tournament.id]
    );

    // Build animation sequence for frontend
    const animSequence = {
      pairing: pairingSequence, // null if not individual mode
      groups: finalGroups.map((g) => ({
        group: g,
        teams: finalTeams.filter((t) => t.group_id === g.id),
      })),
    };

    res.json({ success: true, animSequence });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/tournament/advance – advance to knockout stage
router.post('/advance', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [tournament] } = await client.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!tournament) return res.status(404).json({ error: 'No tournament found' });

    // Check all group matches are completed
    const { rows: pendingMatches } = await client.query(
      "SELECT COUNT(*) FROM matches WHERE tournament_id = $1 AND phase = 'group' AND status = 'pending'",
      [tournament.id]
    );
    if (parseInt(pendingMatches[0].count) > 0) {
      return res.status(400).json({ error: 'All group matches must be completed first' });
    }

    // Get all groups and their teams/matches
    const { rows: groups } = await client.query(
      'SELECT * FROM groups WHERE tournament_id = $1 ORDER BY name',
      [tournament.id]
    );

    const qualifiers = [];

    for (const group of groups) {
      const { rows: groupTeams } = await client.query(
        'SELECT * FROM teams WHERE group_id = $1',
        [group.id]
      );
      const { rows: groupMatches } = await client.query(
        "SELECT * FROM matches WHERE group_id = $1 AND phase = 'group' AND status = 'completed'",
        [group.id]
      );

      const standings = calculateGroupStandings(groupTeams, groupMatches);

      // Top 2 qualify
      for (let pos = 0; pos < Math.min(2, standings.length); pos++) {
        const entry = standings[pos];
        await client.query('UPDATE teams SET group_position = $1 WHERE id = $2', [pos + 1, entry.team.id]);
        qualifiers.push({
          teamId: entry.team.id,
          groupPosition: pos + 1,
          wins: entry.wins,
          gamesDiff: entry.gamesDiff,
          gamesPercentage: entry.gamesPercentage,
        });
      }
    }

    // Seed qualifiers
    const seeded = seedQualifiers(qualifiers);
    seeded.forEach((q, idx) => { q.seed = idx + 1; });

    // Update seeds in DB
    for (const q of seeded) {
      await client.query('UPDATE teams SET seed = $1 WHERE id = $2', [q.seed, q.teamId]);
    }

    // Generate bracket
    const { r16, r8, r4, final } = generateBracket(seeded);

    // Delete any existing knockout matches
    await client.query(
      "DELETE FROM matches WHERE tournament_id = $1 AND phase != 'group'",
      [tournament.id]
    );

    const matchIds = { r16: [], r8: [], r4: [], final: [] };

    // Insert all matches and collect IDs
    for (const match of r16) {
      const { rows } = await client.query(
        `INSERT INTO matches (tournament_id, phase, match_number, team1_id, team2_id, winner_id, is_bye, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [tournament.id, match.phase, match.match_number, match.team1_id, match.team2_id,
         match.winner_id, match.is_bye, match.status]
      );
      matchIds.r16.push(rows[0].id);
    }
    for (const match of r8) {
      const { rows } = await client.query(
        `INSERT INTO matches (tournament_id, phase, match_number, team1_id, team2_id, winner_id, is_bye, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [tournament.id, match.phase, match.match_number, match.team1_id, match.team2_id,
         match.winner_id, match.is_bye, match.status]
      );
      matchIds.r8.push(rows[0].id);
    }
    for (const match of r4) {
      const { rows } = await client.query(
        `INSERT INTO matches (tournament_id, phase, match_number, team1_id, team2_id, winner_id, is_bye, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [tournament.id, match.phase, match.match_number, match.team1_id, match.team2_id,
         match.winner_id, match.is_bye, match.status]
      );
      matchIds.r4.push(rows[0].id);
    }
    for (const match of final) {
      const { rows } = await client.query(
        `INSERT INTO matches (tournament_id, phase, match_number, team1_id, team2_id, winner_id, is_bye, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [tournament.id, match.phase, match.match_number, match.team1_id, match.team2_id,
         match.winner_id, match.is_bye, match.status]
      );
      matchIds.final.push(rows[0].id);
    }

    // Link matches with next_match_id
    const links = buildNextMatchLinks(matchIds);
    for (const link of links) {
      await client.query(
        'UPDATE matches SET next_match_id = $1, next_match_slot = $2 WHERE id = $3',
        [link.next_match_id, link.next_match_slot, link.id]
      );
    }

    // Propagate bye winners to R8
    for (let i = 0; i < 8; i++) {
      const r16Match = r16[i];
      if (r16Match.status === 'bye' && r16Match.winner_id) {
        const r8MatchId = matchIds.r8[Math.floor(i / 2)];
        const slot = (i % 2) + 1;
        const col = slot === 1 ? 'team1_id' : 'team2_id';
        await client.query(`UPDATE matches SET ${col} = $1 WHERE id = $2`, [r16Match.winner_id, r8MatchId]);
      }
    }

    // Check if any R8 matches are also auto-byes (both teams already set from byes)
    for (let i = 0; i < 4; i++) {
      const r8Id = matchIds.r8[i];
      const { rows: [r8Match] } = await client.query('SELECT * FROM matches WHERE id = $1', [r8Id]);
      if (r8Match.team1_id && r8Match.team2_id) continue;
      if (r8Match.team1_id && !r8Match.team2_id) {
        // Auto-bye
        await client.query('UPDATE matches SET is_bye = TRUE, status = $1, winner_id = $2 WHERE id = $3',
          ['bye', r8Match.team1_id, r8Id]);
      } else if (!r8Match.team1_id && r8Match.team2_id) {
        await client.query('UPDATE matches SET is_bye = TRUE, status = $1, winner_id = $2 WHERE id = $3',
          ['bye', r8Match.team2_id, r8Id]);
      }
    }

    await client.query(
      "UPDATE tournaments SET status = 'knockout', updated_at = NOW() WHERE id = $1",
      [tournament.id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
