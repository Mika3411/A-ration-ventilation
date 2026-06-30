export async function createDatabaseSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_accounts (
      id BIGSERIAL PRIMARY KEY,
      public_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ,
      email_verification_token_hash TEXT NOT NULL DEFAULT '',
      email_verification_token_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS customer_accounts_created_at_idx
      ON customer_accounts (created_at DESC);

  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL CHECK (amount >= 0),
      options JSONB NOT NULL DEFAULT '[]'::jsonb,
      quantity_discounts JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_key TEXT NOT NULL DEFAULT 'ductFanYka',
      image_url TEXT NOT NULL DEFAULT '',
      image_data TEXT NOT NULL DEFAULT '',
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS shop_products_category_idx
      ON shop_products (category);

    CREATE INDEX IF NOT EXISTS shop_products_active_sort_idx
      ON shop_products (active, sort_order, name);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_categories (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS shop_categories_sort_idx
      ON shop_categories (sort_order, name);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      percent NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 99.99),
      minimum_amount INTEGER NOT NULL DEFAULT 0 CHECK (minimum_amount >= 0),
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS promo_codes_active_code_idx
      ON promo_codes (active, code);

    CREATE INDEX IF NOT EXISTS promo_codes_created_at_idx
      ON promo_codes (created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      public_id TEXT NOT NULL UNIQUE,
      customer_public_id TEXT REFERENCES customer_accounts(public_id) ON DELETE SET NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      stripe_session_id TEXT UNIQUE,
      stripe_payment_intent_id TEXT NOT NULL DEFAULT '',
      stripe_customer_id TEXT NOT NULL DEFAULT '',
      stripe_invoice_id TEXT NOT NULL DEFAULT '',
      stripe_invoice_url TEXT NOT NULL DEFAULT '',
      stripe_invoice_pdf_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'eur',
      amount_total INTEGER NOT NULL DEFAULT 0,
      cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      stripe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS orders_customer_created_at_idx
      ON orders (customer_public_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
      ON orders (status, created_at DESC);
  `);
}
