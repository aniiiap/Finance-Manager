const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon pooler uses certificates that work with rejectUnauthorized:false in many Node setups.
  // Prefer DATABASE_URL with sslmode=require; do not log the connection string.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err.message);
});

module.exports = pool;
