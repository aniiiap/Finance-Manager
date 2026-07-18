const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const { verifyToken, verifyAdmin, generateTempPassword } = require('../middleware/auth');

// 1. Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if company is suspended
    if (user.company_id) {
      const companyRes = await pool.query('SELECT status FROM companies WHERE id = $1', [user.company_id]);
      if (companyRes.rows[0]?.status === 'Suspended') {
        return res.status(403).json({ error: 'Your company account has been suspended. Please contact the platform administrator.' });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name,
        email: user.email, 
        role: user.role, 
        company_id: user.company_id,
        access_modules: user.access_modules 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        company_id: user.company_id,
        requires_password_change: user.requires_password_change,
        access_modules: user.access_modules
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 1.5 Get Current User (Refresh Profile)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    res.json({
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      company_id: user.company_id,
      requires_password_change: user.requires_password_change,
      access_modules: user.access_modules
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// 2. Set Initial Password (for first-time login)
router.post('/set-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'Invalid user' });

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid current password' });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, requires_password_change = false WHERE email = $2',
      [passwordHash, email]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during password setup' });
  }
});

// 3. Super Admin Onboard Company
router.post('/onboard-company', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admin can onboard companies' });
    }

    const { company_name, contact_name, contact_email, contact_phone } = req.body;

    // Start transaction
    await pool.query('BEGIN');

    // Create Company
    const compResult = await pool.query(
      'INSERT INTO companies (name, contact_name, contact_email) VALUES ($1, $2, $3) RETURNING id',
      [company_name, contact_name, contact_email]
    );
    const companyId = compResult.rows[0].id;

    // Strong one-time password (shown once to Super Admin — not phone)
    const tempPassword = generateTempPassword(14);
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await pool.query(
      'INSERT INTO users (company_id, name, email, phone, password_hash, role, requires_password_change) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id',
      [companyId, contact_name, contact_email, contact_phone, passwordHash, 'ADMIN']
    );

    await pool.query('COMMIT');

    res.status(201).json({ 
      success: true, 
      message: 'Company and Admin created. Share the temporary password securely — it will not be shown again.',
      company_id: companyId,
      admin_email: contact_email,
      temporary_password: tempPassword,
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error during onboarding' });
  }
});

// 4. Admin Create User
router.post('/register', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    const company_id = req.user.company_id;

    if (!company_id) return res.status(400).json({ error: 'Missing company context' });

    const allowedRoles = ['ADMIN', 'USER'];
    const finalRole = allowedRoles.includes(role) ? role : 'USER';

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(phone, salt);

    const defaultModules = ["Clients", "Projects", "Transactions", "Ledger", "Profit & Loss", "Stock", "Categories", "Reports", "Sales"];

    const newUser = await pool.query(
      'INSERT INTO users (company_id, name, email, phone, password_hash, role, requires_password_change, access_modules) VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING id, name, email, role',
      [company_id, name, email, phone, passwordHash, finalRole, JSON.stringify(defaultModules)]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during user registration' });
  }
});

module.exports = router;
