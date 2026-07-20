const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { verifyToken, verifyAdmin, requireModule, ensureProjectAccess } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const requireClient = (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admins cannot access client data' });
  }
  next();
};

// --- PROJECTS ---
router.get('/projects', verifyToken, requireClient, requireModule('Projects', 'Transactions', 'Ledger', 'Profit & Loss', 'Reports', 'Stock', 'Sales'), async (req, res) => {
  try {
    let result;
    if (req.user.role === 'USER') {
      result = await pool.query(
        `SELECT p.*, c.name as client FROM projects p
         JOIN user_project_access upa ON p.id = upa.project_id
         LEFT JOIN people c ON p.client_id = c.id
         WHERE p.company_id = $1 AND upa.user_id = $2
         ORDER BY p.created_at DESC`,
        [req.user.company_id, req.user.id]
      );
    } else {
      result = await pool.query(`
        SELECT p.*, c.name as client 
        FROM projects p 
        LEFT JOIN people c ON p.client_id = c.id 
        WHERE p.company_id = $1 
        ORDER BY p.created_at DESC`, [req.user.company_id]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects', verifyToken, requireClient, requireModule('Projects'), async (req, res) => {
  try {
    const { name, budget, client_id, status } = req.body;
    const result = await pool.query(
      'INSERT INTO projects (company_id, name, budget, client_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.company_id, name, budget, client_id || null, status || 'Active']
    );
    const project = result.rows[0];
    // USER who creates a project gets access automatically
    if (req.user.role === 'USER') {
      await pool.query(
        'INSERT INTO user_project_access (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, project.id]
      );
    }
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/projects/:id', verifyToken, requireClient, requireModule('Projects'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await ensureProjectAccess(req, id))) {
      return res.status(403).json({ error: 'No access to this project' });
    }
    await pool.query('DELETE FROM projects WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- TRANSACTIONS ---
router.get('/transactions', verifyToken, requireClient, requireModule('Transactions', 'Ledger', 'Profit & Loss', 'Reports'), async (req, res) => {
  try {
    let result;
    if (req.user.role === 'USER') {
      result = await pool.query(`
        SELECT t.*, t.narration as description, t.payment_method as "paymentMethod", t.person_id as party_id, p.name as project_name 
        FROM transactions t 
        LEFT JOIN projects p ON t.project_id = p.id
        JOIN user_project_access upa ON p.id = upa.project_id
        WHERE t.company_id = $1 AND upa.user_id = $2
        ORDER BY t.date DESC
      `, [req.user.company_id, req.user.id]);
    } else {
      result = await pool.query(`
        SELECT t.*, t.narration as description, t.payment_method as "paymentMethod", t.person_id as party_id, p.name as project_name 
        FROM transactions t 
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.company_id = $1 
        ORDER BY t.date DESC
      `, [req.user.company_id]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/transactions', verifyToken, requireClient, requireModule('Transactions'), async (req, res) => {
  try {
    const { project_id, amount, type, description, party_id, category_id, date, status, paymentMethod } = req.body;
    if (project_id && !(await ensureProjectAccess(req, project_id))) {
      return res.status(403).json({ error: 'No access to this project' });
    }
    const result = await pool.query(
      `INSERT INTO transactions 
      (company_id, project_id, amount, type, narration, person_id, category_id, date, status, payment_method, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.user.company_id, project_id || null, amount, type, description, party_id || null, category_id || null, date, status || 'Completed', paymentMethod, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Transaction POST error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/transactions/:id', verifyToken, requireClient, requireModule('Transactions'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, description, status } = req.body;

    if (req.user.role === 'USER') {
      const owned = await pool.query(
        `SELECT t.id FROM transactions t
         JOIN user_project_access upa ON t.project_id = upa.project_id
         WHERE t.id = $1 AND t.company_id = $2 AND upa.user_id = $3`,
        [id, req.user.company_id, req.user.id]
      );
      if (owned.rows.length === 0) {
        return res.status(403).json({ error: 'No access to this transaction' });
      }
    }

    const result = await pool.query(
      `UPDATE transactions 
       SET amount = $1, type = $2, narration = $3, status = $4
       WHERE id = $5 AND company_id = $6 RETURNING *`,
      [amount, type, description, status, id, req.user.company_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/transactions/:id', verifyToken, requireClient, requireModule('Transactions'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'USER') {
      const owned = await pool.query(
        `SELECT t.id FROM transactions t
         JOIN user_project_access upa ON t.project_id = upa.project_id
         WHERE t.id = $1 AND t.company_id = $2 AND upa.user_id = $3`,
        [id, req.user.company_id, req.user.id]
      );
      if (owned.rows.length === 0) {
        return res.status(403).json({ error: 'No access to this transaction' });
      }
    }
    await pool.query('DELETE FROM transactions WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- CATEGORIES ---
router.get('/categories', verifyToken, requireClient, requireModule('Categories', 'Transactions', 'Ledger', 'Profit & Loss'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE company_id = $1', [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/categories', verifyToken, requireClient, requireModule('Categories'), async (req, res) => {
  try {
    const { name, type, parent_id } = req.body;
    const result = await pool.query('INSERT INTO categories (company_id, name, type, parent_id) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.company_id, name, type || 'Expense', parent_id || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Categories POST Error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/categories/:id', verifyToken, requireClient, requireModule('Categories'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM categories WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- CLIENTS / PARTIES ---
router.get('/people', verifyToken, requireClient, requireModule('Clients', 'Projects', 'Transactions', 'Sales'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM people WHERE company_id = $1', [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/people', verifyToken, requireClient, requireModule('Clients'), async (req, res) => {
  try {
    const { name, phone, contact, company, status } = req.body;
    const result = await pool.query(
      'INSERT INTO people (company_id, name, phone, company, status) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
      [req.user.company_id, name, phone || contact, company || null, status || 'Active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/people/:id', verifyToken, requireClient, requireModule('Clients'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM people WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- USERS (For Admin Settings) ---
router.get('/users', verifyToken, verifyAdmin, requireClient, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.access_modules,
             ARRAY_AGG(p.name) FILTER (WHERE p.name IS NOT NULL) as access
      FROM users u
      LEFT JOIN user_project_access upa ON u.id = upa.user_id
      LEFT JOIN projects p ON upa.project_id = p.id
      WHERE u.company_id = $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users', verifyToken, verifyAdmin, requireClient, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, email, password, role, project_ids, access_modules } = req.body;

    const allowedRoles = ['ADMIN', 'USER'];
    if (!allowedRoles.includes(role)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid role. Allowed: ADMIN, USER' });
    }
    if (!password || String(password).length < 6) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    
    const allModules = ["Clients", "Projects", "Transactions", "Ledger", "Profit & Loss", "Stock", "Categories", "Reports", "Sales"];
    let finalModules = Array.isArray(access_modules) ? access_modules.filter(m => allModules.includes(m)) : allModules;
    if (role === 'ADMIN') finalModules = allModules;

    const userRes = await client.query(
      `INSERT INTO users (company_id, name, email, password_hash, role, requires_password_change, access_modules) 
       VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id, name, email, role, status, access_modules`,
      [req.user.company_id, name, email, password_hash, role, JSON.stringify(finalModules)]
    );
    const newUser = userRes.rows[0];

    if (role === 'USER' && project_ids && project_ids.length > 0) {
      for (let pid of project_ids) {
        const projCheck = await client.query(
          'SELECT id FROM projects WHERE id = $1 AND company_id = $2',
          [pid, req.user.company_id]
        );
        if (projCheck.rows.length === 0) continue;
        await client.query(
          'INSERT INTO user_project_access (user_id, project_id) VALUES ($1, $2)',
          [newUser.id, pid]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json(newUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/users/:id', verifyToken, verifyAdmin, requireClient, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { name, email, role, project_ids, access_modules } = req.body;

    const allowedRoles = ['ADMIN', 'USER'];
    if (!allowedRoles.includes(role)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid role. Allowed: ADMIN, USER' });
    }
    
    const allModules = ["Clients", "Projects", "Transactions", "Ledger", "Profit & Loss", "Stock", "Categories", "Reports", "Sales"];
    let finalModules = Array.isArray(access_modules) ? access_modules.filter(m => allModules.includes(m)) : allModules;
    if (role === 'ADMIN') finalModules = allModules;

    const userRes = await client.query(
      `UPDATE users 
       SET name = $1, email = $2, role = $3, access_modules = $4 
       WHERE id = $5 AND company_id = $6 
       RETURNING id, name, email, role, status, access_modules`,
      [name, email, role, JSON.stringify(finalModules), id, req.user.company_id]
    );
    
    if (userRes.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const updatedUser = userRes.rows[0];

    await client.query('DELETE FROM user_project_access WHERE user_id = $1', [id]);

    if (role === 'USER' && project_ids && project_ids.length > 0) {
      for (let pid of project_ids) {
        const projCheck = await client.query(
          'SELECT id FROM projects WHERE id = $1 AND company_id = $2',
          [pid, req.user.company_id]
        );
        if (projCheck.rows.length === 0) continue;
        await client.query(
          'INSERT INTO user_project_access (user_id, project_id) VALUES ($1, $2)',
          [updatedUser.id, pid]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json(updatedUser);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.delete('/users/:id', verifyToken, verifyAdmin, requireClient, async (req, res) => {
  try {
    const { id } = req.params;
    // Don't let admin delete themselves
    if (id == req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    
    await pool.query('DELETE FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SUPER ADMIN: GET ALL COMPANIES ---
router.get('/companies', verifyToken, async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });
  try {
    const result = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as users_count,
        (SELECT phone FROM users u WHERE u.company_id = c.id AND u.role = 'ADMIN' LIMIT 1) as contact_phone
      FROM companies c
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/companies/:id/status', verifyToken, async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE companies SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/companies/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { company_name, contact_name, contact_email, contact_phone } = req.body;
    await client.query('BEGIN');
    
    // Update company details
    await client.query(
      'UPDATE companies SET name = $1, contact_name = $2, contact_email = $3 WHERE id = $4',
      [company_name, contact_name, contact_email, id]
    );

    // Also update the main admin user's name, email, and phone for this company so they don't lose login access
    await client.query(
      "UPDATE users SET name = $1, email = $2, phone = $3 WHERE company_id = $4 AND role = 'ADMIN'",
      [contact_name, contact_email, contact_phone, id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/projects/:id', verifyToken, requireClient, requireModule('Projects'), async (req, res) => {
  try {
    if (!(await ensureProjectAccess(req, req.params.id))) {
      return res.status(403).json({ error: 'No access to this project' });
    }
    const { name, description, budget } = req.body;
    await pool.query('UPDATE projects SET name=$1, description=$2, budget=$3 WHERE id=$4 AND company_id=$5', [name, description, budget, req.params.id, req.user.company_id]);
    res.json({success: true});
  } catch(e) { res.status(500).json({error: 'Server error'}); }
});

router.put('/people/:id', verifyToken, requireClient, requireModule('Clients'), async (req, res) => {
  try {
    const { name, phone } = req.body;
    await pool.query('UPDATE people SET name=$1, phone=$2 WHERE id=$3 AND company_id=$4', [name, phone, req.params.id, req.user.company_id]);
    res.json({success: true});
  } catch(e) { res.status(500).json({error: 'Server error'}); }
});

// --- INVENTORY ---
router.get('/inventory/items', verifyToken, requireClient, requireModule('Stock'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_items WHERE company_id = $1 ORDER BY name ASC', [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/inventory/items', verifyToken, requireClient, requireModule('Stock'), async (req, res) => {
  try {
    const { name, unit } = req.body;
    const result = await pool.query(
      'INSERT INTO inventory_items (company_id, name, unit) VALUES ($1, $2, $3) RETURNING *',
      [req.user.company_id, name, unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/inventory/items/:id', verifyToken, requireClient, requireModule('Stock'), async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory_items WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/inventory/transactions', verifyToken, requireClient, requireModule('Stock'), async (req, res) => {
  try {
    let result;
    if (req.user.role === 'USER') {
      result = await pool.query(`
        SELECT it.*, ii.name as item_name, ii.unit as item_unit, p.name as project_name 
        FROM inventory_transactions it
        JOIN inventory_items ii ON it.item_id = ii.id
        LEFT JOIN projects p ON it.project_id = p.id
        LEFT JOIN user_project_access upa ON it.project_id = upa.project_id AND upa.user_id = $2
        WHERE it.company_id = $1 AND (it.project_id IS NULL OR upa.user_id IS NOT NULL)
        ORDER BY it.date DESC, it.created_at DESC
      `, [req.user.company_id, req.user.id]);
    } else {
      result = await pool.query(`
        SELECT it.*, ii.name as item_name, ii.unit as item_unit, p.name as project_name 
        FROM inventory_transactions it
        JOIN inventory_items ii ON it.item_id = ii.id
        LEFT JOIN projects p ON it.project_id = p.id
        WHERE it.company_id = $1
        ORDER BY it.date DESC, it.created_at DESC
      `, [req.user.company_id]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/inventory/transactions', verifyToken, requireClient, requireModule('Stock'), async (req, res) => {
  try {
    const { item_id, project_id, type, quantity, date, narration } = req.body;
    if (project_id && !(await ensureProjectAccess(req, project_id))) {
      return res.status(403).json({ error: 'No access to this project' });
    }
    const result = await pool.query(
      `INSERT INTO inventory_transactions 
      (company_id, item_id, project_id, type, quantity, date, narration, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.company_id, item_id, project_id || null, type, quantity, date, narration, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/inventory/transactions/:id', verifyToken, requireClient, requireModule('Stock'), async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory_transactions WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/company-info', verifyToken, async (req, res) => {
  try {
    if (!req.user.company_id) return res.json(null);
    const result = await pool.query(`
      SELECT c.name as company_name, u.name as admin_name, c.payment_methods 
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id AND u.role = 'ADMIN'
      WHERE c.id = $1 LIMIT 1
    `, [req.user.company_id]);
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({error: 'Server error'}); }
});

module.exports = router;
