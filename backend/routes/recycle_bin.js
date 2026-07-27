const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');

router.use(verifyToken);
router.use(verifyAdmin);
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/', async (req, res) => {
  try {
    const { company_id } = req.user;
    
    const tables = ['projects', 'transactions', 'categories', 'people', 'letters', 'purchases', 'inventory_items', 'inventory_transactions'];
    
    let allDeleted = [];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE company_id = $1 AND is_deleted = true`, [company_id]);
        result.rows.forEach(row => {
          allDeleted.push({
            ...row,
            _type: table
          });
        });
      } catch (err) {
        // Table might not exist or some error, skip it
        console.error(`Error fetching deleted items from ${table}:`, err.message);
      }
    }
    
    // Sort by deleted_at (descending)
    allDeleted.sort((a, b) => new Date(b.deleted_at || b.updated_at || b.created_at || b.date || 0) - new Date(a.deleted_at || a.updated_at || a.created_at || a.date || 0));
    
    res.json(allDeleted);
  } catch (error) {
    console.error('Recycle Bin GET error:', error);
    res.status(500).json({ error: 'Failed to fetch recycle bin data' });
  }
});

router.put('/restore/:type/:id', async (req, res) => {
  try {
    const { company_id } = req.user;
    const { type, id } = req.params;
    
    const allowedTables = ['projects', 'transactions', 'categories', 'people', 'letters', 'purchases', 'inventory_items', 'inventory_transactions'];
    if (!allowedTables.includes(type)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }
    
    await pool.query(`UPDATE ${type} SET is_deleted = false WHERE id = $1 AND company_id = $2`, [id, company_id]);
    res.json({ message: 'Item restored successfully' });
  } catch (error) {
    console.error('Recycle Bin RESTORE error:', error);
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

// Permanent Delete
router.delete('/permanent/:type/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;
    const company_id = req.user.company_id;
    
    const allowedTables = ['projects', 'transactions', 'categories', 'people', 'letters', 'purchases', 'inventory_items', 'inventory_transactions'];
    if (!allowedTables.includes(type)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }
    
    await pool.query(`DELETE FROM ${type} WHERE id = $1 AND company_id = $2`, [id, company_id]);
    res.json({ message: 'Item permanently deleted' });
  } catch (error) {
    console.error('Recycle Bin PERMANENT DELETE error:', error);
    res.status(500).json({ error: 'Failed to permanently delete item' });
  }
});

module.exports = router;
