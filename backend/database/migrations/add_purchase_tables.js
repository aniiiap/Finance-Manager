require('dotenv').config();
const pool = require('../db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create purchases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        purchase_no VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        vendor_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
        vendor_name VARCHAR(255),
        vendor_address TEXT,
        vendor_gstin VARCHAR(100),
        vendor_state_name VARCHAR(100),
        vendor_state_code VARCHAR(10),
        delivery_note VARCHAR(255),
        payment_terms VARCHAR(255),
        reference_no VARCHAR(255),
        vendor_order_no VARCHAR(255),
        dispatch_doc_no VARCHAR(255),
        dispatch_through VARCHAR(255),
        destination VARCHAR(255),
        terms_of_delivery TEXT,
        total_taxable_amount NUMERIC(15, 2) DEFAULT 0,
        total_cgst NUMERIC(15, 2) DEFAULT 0,
        total_sgst NUMERIC(15, 2) DEFAULT 0,
        round_off NUMERIC(15, 2) DEFAULT 0,
        grand_total NUMERIC(15, 2) DEFAULT 0,
        amount_in_words VARCHAR(500),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create purchase_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
        description VARCHAR(500) NOT NULL,
        hsn_sac VARCHAR(50),
        quantity NUMERIC(15, 2),
        rate NUMERIC(15, 2),
        per VARCHAR(50),
        amount NUMERIC(15, 2) NOT NULL,
        gst_rate NUMERIC(5, 2) DEFAULT 0,
        cgst_amount NUMERIC(15, 2) DEFAULT 0,
        sgst_amount NUMERIC(15, 2) DEFAULT 0,
        total_amount NUMERIC(15, 2) NOT NULL
      );
    `);

    await client.query('COMMIT');
    console.log("Purchase tables added successfully!");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
