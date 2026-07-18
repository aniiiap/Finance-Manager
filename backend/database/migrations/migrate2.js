const pool = require('../db');

async function migrate() {
  try {
    console.log("Adding columns to transactions...");
    await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)');
    await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'Completed\'');
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
