const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../database/db');

function parseModules(user) {
  const m = user?.access_modules;
  if (Array.isArray(m)) return m;
  if (typeof m === 'string') {
    try {
      const parsed = JSON.parse(m);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

const verifyToken = async (req, res, next) => {
  const header = req.headers['authorization'];

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'A token is required for authentication' });
  }

  try {
    const bearer = header.split(' ')[1];
    const decoded = jwt.verify(bearer, process.env.JWT_SECRET);

    const userRes = await pool.query(
      `SELECT u.id, u.role, u.status, u.company_id, u.access_modules, u.name, u.email,
              c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Token' });
    }

    const row = userRes.rows[0];
    if (row.status && row.status !== 'Active') {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }
    if (row.company_id && row.company_status === 'Suspended') {
      return res.status(403).json({ error: 'Your company account has been suspended.' });
    }

    req.user = {
      id: row.id,
      role: row.role,
      company_id: row.company_id,
      access_modules: row.access_modules,
      name: row.name,
      email: row.email,
    };
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token' });
  }
  return next();
};

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required.' });
};

/** ADMIN/SUPER_ADMIN bypass. USER must have at least one of the listed modules. */
const requireModule = (...modules) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') return next();

  const access = parseModules(req.user);
  if (modules.some((m) => access.includes(m))) return next();
  return res.status(403).json({ error: 'You do not have access to this module.' });
};

/** For USER role: ensure they can access the given project_id (skip if null / ADMIN). */
async function ensureProjectAccess(req, projectId) {
  if (!projectId) return true;
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') return true;

  const r = await pool.query(
    `SELECT 1 FROM user_project_access upa
     JOIN projects p ON p.id = upa.project_id
     WHERE upa.user_id = $1 AND upa.project_id = $2 AND p.company_id = $3`,
    [req.user.id, projectId, req.user.company_id]
  );
  return r.rows.length > 0;
}

module.exports = {
  verifyToken,
  verifyAdmin,
  requireModule,
  ensureProjectAccess,
  parseModules,
  generateTempPassword,
};
