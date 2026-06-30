export async function runDatabaseSchemaMigrations(pool) {
  await pool.query(`
    ALTER TABLE customer_accounts
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE customer_accounts
    ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT NOT NULL DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE customer_accounts
    ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMPTZ
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS customer_accounts_email_verification_token_idx
      ON customer_accounts (email_verification_token_hash)
      WHERE email_verification_token_hash <> ''
  `);

  await pool.query(`
    ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS image_data TEXT NOT NULL DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS quantity_discounts JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT NOT NULL DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stripe_invoice_url TEXT NOT NULL DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stripe_invoice_pdf_url TEXT NOT NULL DEFAULT ''
  `);
}

export async function runDatabaseDataMigrations(pool) {
  await pool.query(`
    UPDATE customer_accounts
    SET email_verified_at = COALESCE(email_verified_at, created_at)
    WHERE email_verified_at IS NULL
      AND email_verification_token_hash = ''
  `);

  await pool.query(`
    UPDATE shop_products
    SET active = FALSE, updated_at = NOW()
    WHERE slug LIKE 'ventilateur-de-canal-yka-%'
      AND slug <> 'ventilateur-de-canal-yka'
  `);

  await pool.query(
    `
      DELETE FROM shop_products
      WHERE slug = ANY($1::text[])
    `,
    [["ventilateurs-axiaux", "ventilateurs-de-canaux", "regulateurs"]],
  );
}
