require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function updateDb() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_modules JSONB DEFAULT '[]'`);
    await pool.query(`
      UPDATE users 
      SET access_modules = '["Clients", "Projects", "Transactions", "Ledger", "Profit & Loss", "Stock", "Categories", "Reports", "Sales"]'::jsonb 
      WHERE access_modules = '[]' OR access_modules IS NULL
    `);
    console.log('Database updated successfully.');
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await pool.end();
  }
}

updateDb();
