const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { verifyToken, verifyAdmin, requireModule } = require('../middleware/auth');
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

const requireClient = (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admins cannot access client data' });
  }
  next();
};

// Helper to calculate total amount to words (Indian Numbering System)
function numberToWords(number) {
    if (number === 0) return "Zero";
    
    // Simple implementation for rupees/paise
    const numStr = number.toFixed(2);
    const [rupees, paise] = numStr.split('.');
    
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(num) {
        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return; let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim();
    }
    
    let rsWord = inWords(parseInt(rupees));
    let paiseStr = parseInt(paise) > 0 ? ` and ${parseInt(paise)} paise` : '';
    return `INR ${rsWord}${paiseStr} Only`;
}

// Get all purchases for company
router.get('/purchases', verifyToken, requireClient, requireModule('Purchases'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM purchases WHERE company_id = $1 AND is_deleted = false ORDER BY created_at DESC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific purchase by ID with items and company details
router.get('/purchases/:id', verifyToken, requireClient, requireModule('Purchases'), async (req, res) => {
    try {
        const { id } = req.params;
        const purchaseRes = await pool.query(
            `SELECT i.*, 
                    c.name as company_name, c.address as company_address, c.gstin as company_gstin, 
                    c.state_name as company_state_name, c.state_code as company_state_code, 
                    c.bank_name, c.bank_account_no, c.bank_ifsc, c.authorised_signatory
             FROM purchases i 
             JOIN companies c ON i.company_id = c.id
             WHERE i.id = $1 AND i.company_id = $2`,
            [id, req.user.company_id]
        );
        
        if (purchaseRes.rows.length === 0) return res.status(404).json({ error: 'purchase not found' });
        
        const purchase = purchaseRes.rows[0];
        
        const itemsRes = await pool.query(
            `SELECT * FROM purchase_items WHERE purchase_id = $1 ORDER BY id ASC`,
            [id]
        );
        
        purchase.items = itemsRes.rows;
        res.json(purchase);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Auto generate next purchase number
router.get('/next-purchase-no', verifyToken, requireClient, requireModule('Purchases'), async (req, res) => {
    try {
        // Find latest purchase number for company
        const result = await pool.query(
            `SELECT purchase_no FROM purchases WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.user.company_id]
        );
        
        const d = new Date();
        const year = d.getFullYear();
        const nextYear = (year + 1).toString().slice(-2);
        const prefix = `INV/${year}-${nextYear}/`;
        
        if (result.rows.length === 0) {
            return res.json({ nextNo: `${prefix}001` });
        }
        
        const lastNo = result.rows[0].purchase_no;
        const match = lastNo.match(/\/(\d+)$/);
        if (match) {
            const nextNum = parseInt(match[1], 10) + 1;
            return res.json({ nextNo: `${prefix}${nextNum.toString().padStart(3, '0')}` });
        }
        
        res.json({ nextNo: `${prefix}001` });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create purchase
router.post('/purchases', verifyToken, requireClient, requireModule('Purchases'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const {
            purchase_no, date, 
            vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_state_name, vendor_state_code,
            delivery_note, payment_terms, reference_no, vendor_order_no, dispatch_doc_no,
            dispatch_through, destination, terms_of_delivery, authorised_signatory_for,
            items
        } = req.body;
        
        let total_taxable_amount = 0;
        let total_cgst = 0;
        let total_sgst = 0;
        
        // Calculate totals dynamically backend-side to prevent manipulation
        if (!Array.isArray(items) || items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'At least one purchase item is required' });
        }

        items.forEach(item => {
            const amt = parseFloat(item.amount || 0);
            const gstRate = parseFloat(item.gst_rate || 0);
            
            const cgstAmt = amt * (gstRate / 2) / 100;
            const sgstAmt = amt * (gstRate / 2) / 100;
            
            item.cgst_amount = cgstAmt.toFixed(2);
            item.sgst_amount = sgstAmt.toFixed(2);
            item.total_amount = (amt + cgstAmt + sgstAmt).toFixed(2);
            
            total_taxable_amount += amt;
            total_cgst += cgstAmt;
            total_sgst += sgstAmt;
        });
        
        const raw_total = total_taxable_amount + total_cgst + total_sgst;
        const grand_total = Math.round(raw_total);
        const round_off = (grand_total - raw_total).toFixed(2);
        
        const amount_in_words = numberToWords(grand_total);
        
        const invRes = await client.query(
            `INSERT INTO purchases (
                company_id, purchase_no, date, vendor_id, vendor_name, vendor_address, vendor_gstin, vendor_state_name, vendor_state_code,
                delivery_note, payment_terms, reference_no, vendor_order_no, dispatch_doc_no, dispatch_through, destination, terms_of_delivery,
                total_taxable_amount, total_cgst, total_sgst, round_off, grand_total, amount_in_words, created_by, authorised_signatory_for
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING id`,
            [
                req.user.company_id, purchase_no, date, vendor_id || null, vendor_name, vendor_address, vendor_gstin, vendor_state_name, vendor_state_code,
                delivery_note, payment_terms, reference_no, vendor_order_no, dispatch_doc_no, dispatch_through, destination, terms_of_delivery,
                total_taxable_amount.toFixed(2), total_cgst.toFixed(2), total_sgst.toFixed(2), round_off, grand_total.toFixed(2), amount_in_words, req.user.id, authorised_signatory_for
            ]
        );
        
        const invId = invRes.rows[0].id;
        
        for (const item of items) {
            await client.query(
                `INSERT INTO purchase_items (
                    purchase_id, description, narration, hsn_sac, quantity, rate, per, amount, gst_rate, cgst_amount, sgst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    invId, item.description || '', item.narration || null, item.hsn_sac || null, item.quantity || null, item.rate || null, item.per || 'PCS', item.amount || 0, 
                    item.gst_rate || 0, item.cgst_amount || 0, item.sgst_amount || 0, item.total_amount || 0
                ]
            );
        }
        
        await client.query('COMMIT');
        res.status(201).json({ success: true, purchase_id: invId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Upload PDF for purchase
router.post('/purchases/:id/upload-pdf', verifyToken, requireClient, requireModule('Purchases'), (req, res) => {
    upload.single('pdf')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Invalid file upload' });
        }
        try {
            const purchaseId = req.params.id;

            const check = await pool.query(
                `SELECT id FROM purchases WHERE id = $1 AND company_id = $2`,
                [purchaseId, req.user.company_id]
            );
            if (check.rows.length === 0) {
                return res.status(404).json({ error: 'purchase not found' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No PDF file provided' });
            }

            const fileKey = `purchases/${req.user.company_id}/${purchaseId}_${Date.now()}.pdf`;

            await s3.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileKey,
                Body: req.file.buffer,
                ContentType: 'application/pdf',
            }));

            await pool.query(`UPDATE purchases SET pdf_url = $1 WHERE id = $2`, [fileKey, purchaseId]);

            res.json({ success: true, pdf_url: fileKey });
        } catch (uploadErr) {
            console.error(uploadErr);
            res.status(500).json({ error: 'Failed to upload PDF' });
        }
    });
});

// Proxy PDF to bypass Cloudinary restrictions and force inline view
router.get('/purchases/:id/pdf', verifyToken, requireClient, requireModule('Purchases'), async (req, res) => {
    try {
        const purchaseId = req.params.id;
        const inv = await pool.query(`SELECT pdf_url, purchase_no FROM purchases WHERE id = $1 AND company_id = $2`, [purchaseId, req.user.company_id]);
        
        if (inv.rows.length === 0 || !inv.rows[0].pdf_url) {
            return res.status(404).json({ error: 'PDF not found' });
        }

        const fileKey = inv.rows[0].pdf_url;
        
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey
        });
        
        const response = await s3.send(command);
        
        const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
        const filename = `Purchase_${inv.rows[0].purchase_no.replace(/\//g, '-')}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
        
        response.Body.pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Company purchase Settings (Admin only)
router.put('/company-settings', verifyToken, verifyAdmin, requireClient, verifyAdmin, async (req, res) => {
    try {
        const { name, address, gstin, state_name, state_code, bank_name, bank_account_no, bank_ifsc, authorised_signatory, payment_methods } = req.body;
        
        await pool.query(
            `UPDATE companies SET 
                name = COALESCE(NULLIF($1, ''), name),
                address = $2, gstin = $3, state_name = $4, state_code = $5,
                bank_name = $6, bank_account_no = $7, bank_ifsc = $8, authorised_signatory = $9,
                payment_methods = $10
             WHERE id = $11`,
            [name, address, gstin, state_name, state_code, bank_name, bank_account_no, bank_ifsc, authorised_signatory, payment_methods, req.user.company_id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Company Settings
router.get('/company-settings', verifyToken, requireClient, requireModule('Purchases'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT name, address, gstin, state_name, state_code, bank_name, bank_account_no, bank_ifsc, authorised_signatory, payment_methods 
             FROM companies WHERE id = $1`,
            [req.user.company_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete purchase
router.delete('/purchases/:id', verifyToken, verifyAdmin, requireClient, requireModule('Purchases'), async (req, res) => {
    try {
        const purchaseId = req.params.id;
        // Ownership check first; purchase_items cascade via FK ON DELETE CASCADE
        const result = await pool.query(
            `UPDATE purchases SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING id`,
            [purchaseId, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'purchase not found' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
