const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// PUT /api/matches/:id/score – update match score
router.put('/:id/score', async (req, res) => {
  const { team1_games, team2_games } = req.body;
  const matchId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [match] } = await client.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.is_bye) return res.status(400).json({ error: 'Cannot score a bye match' });

    const t1 = parseInt(team1_games) || 0;
    const t2 = parseInt(team2_games) || 0;
    const winnerId = t1 > t2 ? match.team1_id : match.team2_id;

    await client.query(
      `UPDATE matches SET team1_games = $1, team2_games = $2, winner_id = $3, status = 'completed'
       WHERE id = $4`,
      [t1, t2, winnerId, matchId]
    );

    // If this is a knockout match with a next_match, propagate the winner
    if (match.next_match_id && match.phase !== 'group') {
      const col = match.next_match_slot === 1 ? 'team1_id' : 'team2_id';
      await client.query(
        `UPDATE matches SET ${col} = $1 WHERE id = $2`,
        [winnerId, match.next_match_id]
      );

      // Check if that next match now has both teams and was an auto-bye (edge case)
      const { rows: [nextMatch] } = await client.query(
        'SELECT * FROM matches WHERE id = $1',
        [match.next_match_id]
      );
      if (nextMatch && nextMatch.is_bye) {
        // Reset bye status now that a real team is here
        await client.query(
          'UPDATE matches SET is_bye = FALSE, status = $1, winner_id = NULL WHERE id = $2',
          ['pending', match.next_match_id]
        );
      }
    }

    // Check if tournament is complete (Final match completed)
    if (match.phase === 'Final') {
      const { rows: [tournament] } = await client.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
      await client.query(
        "UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = $1",
        [tournament.id]
      );
    }

    await client.query('COMMIT');

    const { rows: [updated] } = await client.query(
      `SELECT m.*,
        t1.name as team1_name, t2.name as team2_name, w.name as winner_name
       FROM matches m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       LEFT JOIN teams w ON m.winner_id = w.id
       WHERE m.id = $1`,
      [matchId]
    );
    res.json({ match: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
