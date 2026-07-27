const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { verifyToken, requireModule, verifyAdmin } = require('../middleware/auth');

// Note: Ensure that users accessing letters have the 'Letters' module access if required.
// For now, we will require the 'Letters' module if you use the requireModule middleware.

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM letters WHERE company_id = $1 AND is_deleted = false ORDER BY created_at DESC',
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { ref_no, letter_date, content } = req.body;
    const result = await pool.query(
      'INSERT INTO letters (company_id, ref_no, letter_date, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.company_id, ref_no || '', letter_date || null, content || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { ref_no, letter_date, content } = req.body;
    const result = await pool.query(
      'UPDATE letters SET ref_no = $1, letter_date = $2, content = $3 WHERE id = $4 AND company_id = $5 RETURNING *',
      [ref_no || '', letter_date || null, content || '', id, req.user.company_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Letter not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE letters SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, req.user.company_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Letter not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
