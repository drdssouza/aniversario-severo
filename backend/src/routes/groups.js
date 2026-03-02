const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { calculateGroupStandings } = require('../utils/standings');

// GET /api/groups – get all groups with teams, matches, and standings
router.get('/', async (req, res) => {
  try {
    const { rows: [tournament] } = await pool.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
    if (!tournament) return res.status(404).json({ error: 'No tournament found' });

    const { rows: groups } = await pool.query(
      'SELECT * FROM groups WHERE tournament_id = $1 ORDER BY name',
      [tournament.id]
    );

    const result = await Promise.all(groups.map(async (group) => {
      const { rows: teams } = await pool.query(
        'SELECT * FROM teams WHERE group_id = $1 ORDER BY id',
        [group.id]
      );
      const { rows: matches } = await pool.query(
        `SELECT m.*,
          t1.name as team1_name, t1.player1_name as t1_p1, t1.player2_name as t1_p2,
          t2.name as team2_name, t2.player1_name as t2_p1, t2.player2_name as t2_p2,
          w.name as winner_name
         FROM matches m
         LEFT JOIN teams t1 ON m.team1_id = t1.id
         LEFT JOIN teams t2 ON m.team2_id = t2.id
         LEFT JOIN teams w ON m.winner_id = w.id
         WHERE m.group_id = $1
         ORDER BY m.scheduled_order`,
        [group.id]
      );

      const standings = calculateGroupStandings(teams, matches);

      return { group, teams, matches, standings };
    }));

    res.json({ groups: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
