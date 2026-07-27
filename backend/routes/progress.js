const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
const { Pool } = require('pg');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

router.get('/folders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM progress_folders WHERE company_id = $1 ORDER BY created_at DESC', [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

router.post('/folders', async (req, res) => {
  try {
    const { name, type } = req.body;
    const result = await pool.query(
      'INSERT INTO progress_folders (company_id, name, type) VALUES ($1, $2, $3) RETURNING *',
      [req.user.company_id, name, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

router.delete('/folders/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM progress_folders WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

router.get('/files', async (req, res) => {
  try {
    const { folder_id } = req.query;
    let query = 'SELECT * FROM progress_files WHERE company_id = $1';
    let params = [req.user.company_id];
    if (folder_id) {
      query += ' AND folder_id = $2';
      params.push(folder_id);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

router.post('/files', upload.single('file'), async (req, res) => {
  try {
    const { folder_id, upload_date } = req.body;
    const dateVal = upload_date || new Date().toISOString();
    if (!req.file || !folder_id) return res.status(400).json({ error: 'Missing file or folder_id' });

    const ext = path.extname(req.file.originalname);
    const fileKey = `progress/${req.user.company_id}/${folder_id}/${crypto.randomBytes(16).toString('hex')}${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);
    
    const result = await pool.query(
      'INSERT INTO progress_files (company_id, folder_id, file_name, file_url, file_key, upload_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.company_id, folder_id, req.file.originalname, '', fileKey, dateVal]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.get('/files/:id/url', async (req, res) => {
  try {
    const { download, filename } = req.query;
    const result = await pool.query('SELECT file_key FROM progress_files WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: result.rows[0].file_key
    };
    
    if (download === 'true') {
      params.ResponseContentDisposition = `attachment; filename="${filename || 'download'}"`;
    }
    
    const command = new GetObjectCommand(params);
    
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour expiration
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get URL' });
  }
});

router.get('/files/:id/download', async (req, res) => {
  try {
    const { filename } = req.query;
    const result = await pool.query('SELECT file_key FROM progress_files WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
    
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: result.rows[0].file_key
    });
    
    const response = await s3.send(command);
    
    res.setHeader('Content-Type', response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
    
    response.Body.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.delete('/files/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT file_key FROM progress_files WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (result.rows.length > 0) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: result.rows[0].file_key
      }));
      await pool.query('DELETE FROM progress_files WHERE id = $1', [req.params.id]);
    }
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
