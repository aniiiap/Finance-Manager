const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { verifyToken, verifyAdmin, requireModule } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

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

// Get all invoices for company
router.get('/invoices', verifyToken, requireClient, requireModule('Sales'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM invoices WHERE company_id = $1 ORDER BY created_at DESC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific invoice by ID with items and company details
router.get('/invoices/:id', verifyToken, requireClient, requireModule('Sales'), async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceRes = await pool.query(
            `SELECT i.*, 
                    c.name as company_name, c.address as company_address, c.gstin as company_gstin, 
                    c.state_name as company_state_name, c.state_code as company_state_code, 
                    c.bank_name, c.bank_account_no, c.bank_ifsc, c.authorised_signatory
             FROM invoices i 
             JOIN companies c ON i.company_id = c.id
             WHERE i.id = $1 AND i.company_id = $2`,
            [id, req.user.company_id]
        );
        
        if (invoiceRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        
        const invoice = invoiceRes.rows[0];
        
        const itemsRes = await pool.query(
            `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
            [id]
        );
        
        invoice.items = itemsRes.rows;
        res.json(invoice);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Auto generate next invoice number
router.get('/next-invoice-no', verifyToken, requireClient, requireModule('Sales'), async (req, res) => {
    try {
        // Find latest invoice number for company
        const result = await pool.query(
            `SELECT invoice_no FROM invoices WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [req.user.company_id]
        );
        
        const d = new Date();
        const year = d.getFullYear();
        const nextYear = (year + 1).toString().slice(-2);
        const prefix = `INV/${year}-${nextYear}/`;
        
        if (result.rows.length === 0) {
            return res.json({ nextNo: `${prefix}001` });
        }
        
        const lastNo = result.rows[0].invoice_no;
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

// Create Invoice
router.post('/invoices', verifyToken, requireClient, requireModule('Sales'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const {
            invoice_no, date, 
            buyer_id, buyer_name, buyer_address, buyer_gstin, buyer_state_name, buyer_state_code,
            delivery_note, payment_terms, reference_no, buyer_order_no, dispatch_doc_no,
            dispatch_through, destination, terms_of_delivery,
            items
        } = req.body;
        
        let total_taxable_amount = 0;
        let total_cgst = 0;
        let total_sgst = 0;
        
        // Calculate totals dynamically backend-side to prevent manipulation
        if (!Array.isArray(items) || items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'At least one invoice item is required' });
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
            `INSERT INTO invoices (
                company_id, invoice_no, date, buyer_id, buyer_name, buyer_address, buyer_gstin, buyer_state_name, buyer_state_code,
                delivery_note, payment_terms, reference_no, buyer_order_no, dispatch_doc_no, dispatch_through, destination, terms_of_delivery,
                total_taxable_amount, total_cgst, total_sgst, round_off, grand_total, amount_in_words, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) RETURNING id`,
            [
                req.user.company_id, invoice_no, date, buyer_id || null, buyer_name, buyer_address, buyer_gstin, buyer_state_name, buyer_state_code,
                delivery_note, payment_terms, reference_no, buyer_order_no, dispatch_doc_no, dispatch_through, destination, terms_of_delivery,
                total_taxable_amount.toFixed(2), total_cgst.toFixed(2), total_sgst.toFixed(2), round_off, grand_total.toFixed(2), amount_in_words, req.user.id
            ]
        );
        
        const invId = invRes.rows[0].id;
        
        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items (
                    invoice_id, description, hsn_sac, quantity, rate, per, amount, gst_rate, cgst_amount, sgst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    invId, item.description, item.hsn_sac, item.quantity || null, item.rate || null, item.per, item.amount, 
                    item.gst_rate, item.cgst_amount, item.sgst_amount, item.total_amount
                ]
            );
        }
        
        await client.query('COMMIT');
        res.status(201).json({ success: true, invoice_id: invId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Upload PDF for Invoice
router.post('/invoices/:id/upload-pdf', verifyToken, requireClient, requireModule('Sales'), (req, res) => {
    upload.single('pdf')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Invalid file upload' });
        }
        try {
            const invoiceId = req.params.id;

            const check = await pool.query(
                `SELECT id FROM invoices WHERE id = $1 AND company_id = $2`,
                [invoiceId, req.user.company_id]
            );
            if (check.rows.length === 0) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(404).json({ error: 'Invoice not found' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No PDF file provided' });
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'finance_manager/invoices',
                public_id: `Invoice_${invoiceId}`,
                resource_type: 'raw',
                format: 'pdf',
            });

            await pool.query(`UPDATE invoices SET pdf_url = $1 WHERE id = $2`, [result.secure_url, invoiceId]);

            res.json({ success: true, pdf_url: result.secure_url });
        } catch (uploadErr) {
            console.error(uploadErr);
            res.status(500).json({ error: 'Failed to upload PDF' });
        } finally {
            if (req.file && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
        }
    });
});

// Proxy PDF to bypass Cloudinary restrictions and force inline view
router.get('/invoices/:id/pdf', verifyToken, requireClient, requireModule('Sales'), async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const inv = await pool.query(`SELECT pdf_url, invoice_no FROM invoices WHERE id = $1 AND company_id = $2`, [invoiceId, req.user.company_id]);
        
        if (inv.rows.length === 0 || !inv.rows[0].pdf_url) {
            return res.status(404).json({ error: 'PDF not found' });
        }

        const pdfUrl = inv.rows[0].pdf_url;
        
        // Extract public_id from Cloudinary URL
        const urlParts = pdfUrl.split('/upload/');
        if (urlParts.length < 2) return res.status(400).json({ error: 'Invalid Cloudinary URL' });
        
        const pathParts = urlParts[1].split('/');
        pathParts.shift(); // Remove version
        const publicId = pathParts.join('/'); 
        
        // Generate signed URL
        const signedUrl = cloudinary.url(publicId, {
            resource_type: pdfUrl.includes('/raw/') ? 'raw' : 'image',
            sign_url: true,
            secure: true
        });

        // Fetch from Cloudinary
        const https = require('https');
        https.get(signedUrl, (cloudinaryRes) => {
            if (cloudinaryRes.statusCode !== 200) {
                return res.status(cloudinaryRes.statusCode).send('Failed to fetch from Cloudinary');
            }
            
            const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
            const filename = `Invoice_${inv.rows[0].invoice_no.replace(/\\//g, '-')}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
            
            cloudinaryRes.pipe(res);
        }).on('error', (e) => {
            res.status(500).send('Error streaming PDF');
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Company Invoice Settings (Admin only)
router.put('/company-settings', verifyToken, requireClient, verifyAdmin, async (req, res) => {
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
router.get('/company-settings', verifyToken, requireClient, requireModule('Sales'), async (req, res) => {
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

// Delete Invoice
router.delete('/invoices/:id', verifyToken, requireClient, requireModule('Sales'), async (req, res) => {
    try {
        const invoiceId = req.params.id;
        // Ownership check first; invoice_items cascade via FK ON DELETE CASCADE
        const result = await pool.query(
            `DELETE FROM invoices WHERE id = $1 AND company_id = $2 RETURNING id`,
            [invoiceId, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
