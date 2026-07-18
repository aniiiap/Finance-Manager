const pool = require('../db');

async function runMigration() {
  try {
    console.log('Running stock tables migration...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
          id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
          name VARCHAR(255) NOT NULL,
          unit VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
          id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
          item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
          project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          type VARCHAR(50) NOT NULL, -- 'IN' or 'OUT'
          quantity NUMERIC(15, 2) NOT NULL,
          date DATE NOT NULL,
          narration TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();
