const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL env variable is required to run database setup.");
  process.exit(1);
}

if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
  console.error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env variables are required to create the master account.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon
});

async function setup() {
  const client = await pool.connect();
  try {
    console.log("Connecting to Neon Database...");
    await client.query('BEGIN');

    // 1. Run core init.sql schema
    console.log("1. Executing core SQL schema...");
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await client.query(sql);
    console.log("Core schema created successfully!");

    // 2. Run Category hierarchical parent_id migration
    console.log("2. Migrating categories (adding parent_id relation)...");
    await client.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE;
    `);

    // 3. Run Transaction payment details migration
    console.log("3. Migrating transactions (adding payment details)...");
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed';
    `);

    // 4. Run Projects and Parties extensions migration
    console.log("4. Migrating projects and people (adding client reference and statuses)...");
    await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES people(id),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
      
      ALTER TABLE people 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active',
      ADD COLUMN IF NOT EXISTS company VARCHAR(255);
    `);

    // 5. Run Company Tax Profile migration
    console.log("5. Migrating company profile columns...");
    await client.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50),
      ADD COLUMN IF NOT EXISTS authorised_signatory VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_methods TEXT DEFAULT 'Net Banking, UPI, Cash';
    `);

    // 6. Run Invoices & Invoice Items table creation
    console.log("6. Creating Invoices and Invoice Items tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        invoice_no VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        buyer_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
        buyer_name VARCHAR(255),
        buyer_address TEXT,
        buyer_gstin VARCHAR(100),
        buyer_state_name VARCHAR(100),
        buyer_state_code VARCHAR(10),
        delivery_note VARCHAR(255),
        payment_terms VARCHAR(255),
        reference_no VARCHAR(255),
        buyer_order_no VARCHAR(255),
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
        pdf_url TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
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

    // 7. Run Access Modules migration
    console.log("7. Migrating users module permissions...");
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS access_modules JSONB DEFAULT '[]';
    `);

    // 8. Create Super Admin accounts
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const hash = await bcrypt.hash(password, 12);
    
    console.log("8. Creating Master SUPER_ADMIN account...");
    await client.query(`
      INSERT INTO users (email, password_hash, name, role, requires_password_change, access_modules)
      VALUES ($1, $2, $3, $4, false, '["Clients", "Projects", "Transactions", "Ledger", "Profit & Loss", "Stock", "Categories", "Reports", "Sales"]')
      ON CONFLICT (email) DO NOTHING
    `, [email, hash, 'System Creator', 'SUPER_ADMIN']);
    
    await client.query('COMMIT');
    console.log(`\n========================================`);
    console.log(`SETUP COMPLETE!`);
    console.log(`Your SaaS Database is ready on Neon.tech`);
    console.log(`Login: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`========================================\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error setting up database:", error);
  } finally {
    client.release();
    pool.end();
  }
}

setup();
