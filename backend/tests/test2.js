const pool = require('../database/db');

async function testQuery() {
  try {
    const result = await pool.query('INSERT INTO categories (company_id, name, type, parent_id) VALUES ($1, $2, $3, $4) RETURNING *', [1, 'Test Operations', 'Expense', null]);
    console.log(result.rows);
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    pool.end();
  }
}
testQuery();
