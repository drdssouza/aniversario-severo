const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT 'Aniversário - Severo',
        status VARCHAR(50) NOT NULL DEFAULT 'setup',
        setup_mode VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        team_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        player1_name VARCHAR(255) NOT NULL,
        player2_name VARCHAR(255),
        name VARCHAR(511),
        group_id INTEGER,
        group_position INTEGER,
        seed INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        name VARCHAR(10) NOT NULL,
        size INTEGER NOT NULL DEFAULT 3
      );

      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id),
        phase VARCHAR(20) NOT NULL,
        match_number INTEGER,
        team1_id INTEGER REFERENCES teams(id),
        team2_id INTEGER REFERENCES teams(id),
        team1_games INTEGER,
        team2_games INTEGER,
        winner_id INTEGER REFERENCES teams(id),
        is_bye BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'pending',
        next_match_id INTEGER,
        next_match_slot INTEGER,
        scheduled_order INTEGER
      );
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
