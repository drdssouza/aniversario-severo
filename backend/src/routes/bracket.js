const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/bracket – get full knockout bracket
router.get('/', async (req, res) => {
  try {
    const { rows: [tournament] } = await pool.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!tournament) return res.status(404).json({ error: 'No tournament found' });

    const phases = ['R16', 'R8', 'R4', 'Final'];
    const bracket = {};

    for (const phase of phases) {
      const { rows } = await pool.query(
        `SELECT m.*,
          t1.name as team1_name, t1.player1_name as t1_p1, t1.player2_name as t1_p2,
          t2.name as team2_name, t2.player1_name as t2_p1, t2.player2_name as t2_p2,
          w.name as winner_name
         FROM matches m
         LEFT JOIN teams t1 ON m.team1_id = t1.id
         LEFT JOIN teams t2 ON m.team2_id = t2.id
         LEFT JOIN teams w ON m.winner_id = w.id
         WHERE m.tournament_id = $1 AND m.phase = $2
         ORDER BY m.match_number`,
        [tournament.id, phase]
      );
      bracket[phase] = rows;
    }

    // Get champion if tournament is completed
    let champion = null;
    if (tournament.status === 'completed' && bracket['Final']?.length) {
      const finalMatch = bracket['Final'][0];
      if (finalMatch.winner_id) {
        const { rows: [champ] } = await pool.query('SELECT * FROM teams WHERE id = $1', [finalMatch.winner_id]);
        champion = champ;
      }
    }

    res.json({ bracket, champion, tournament });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
