const pool = require('../db');

async function migrate() {
  try {
    console.log("Adding columns to projects and people...");
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES people(id)');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'Active\'');
    await pool.query('ALTER TABLE people ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'Active\'');
    await pool.query('ALTER TABLE people ADD COLUMN IF NOT EXISTS company VARCHAR(255)');
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
