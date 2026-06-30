import pg from "pg";

import { defaultShopCategories, defaultShopProducts } from "./products/defaultProducts.js";

const { Pool } = pg;

export const dbPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    })
  : null;

let databaseInitError = null;

export const databaseReady = dbPool
  ? initializeDatabase().catch((error) => {
      databaseInitError = error;
      console.error("Customer database initialization failed:", error);
    })
  : Promise.resolve();

export function getDatabaseInitError() {
  return databaseInitError;
}

export async function ensureDatabaseReady() {
  if (!dbPool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await databaseReady;

  if (databaseInitError) {
    throw databaseInitError;
  }
}

async function initializeDatabase() {
  await dbPool.query(`
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS customer_accounts_created_at_idx
      ON customer_accounts (created_at DESC);
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount INTEGER NOT NULL CHECK (amount >= 0),
      options JSONB NOT NULL DEFAULT '[]'::jsonb,
      quantity_discounts JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_key TEXT NOT NULL DEFAULT 'ductFan',
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

  await dbPool.query(`
    ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS image_data TEXT NOT NULL DEFAULT ''
  `);

  await dbPool.query(`
    ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await dbPool.query(`
    ALTER TABLE shop_products
    ADD COLUMN IF NOT EXISTS quantity_discounts JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await dbPool.query(`
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

  await dbPool.query(`
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

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      public_id TEXT NOT NULL UNIQUE,
      customer_public_id TEXT REFERENCES customer_accounts(public_id) ON DELETE SET NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      stripe_session_id TEXT UNIQUE,
      stripe_payment_intent_id TEXT NOT NULL DEFAULT '',
      stripe_customer_id TEXT NOT NULL DEFAULT '',
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

  for (const product of defaultShopProducts) {
    await dbPool.query(
      `
        INSERT INTO shop_products (
          slug,
          name,
          category,
          description,
          amount,
          options,
          quantity_discounts,
          image_key,
          image_url,
          image_data,
          featured,
          active,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (slug) DO NOTHING
      `,
      [
        product.slug,
        product.name,
        product.category,
        product.description,
        product.amount,
        JSON.stringify(product.options || []),
        JSON.stringify(product.quantityDiscounts || []),
        product.imageKey,
        product.imageUrl,
        product.imageData || "",
        product.featured,
        product.active,
        product.sortOrder,
      ],
    );
  }

  await dbPool.query(`
    UPDATE shop_products
    SET active = FALSE, updated_at = NOW()
    WHERE slug LIKE 'ventilateur-de-canal-yka-%'
      AND slug <> 'ventilateur-de-canal-yka'
  `);

  for (const [index, category] of defaultShopCategories.entries()) {
    await dbPool.query(
      `
        INSERT INTO shop_categories (name, sort_order)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
      [category, (index + 1) * 10],
    );
  }

  await dbPool.query(`
    INSERT INTO shop_categories (name, sort_order)
    SELECT DISTINCT category, 1000
    FROM shop_products
    WHERE category <> ''
    ON CONFLICT (name) DO NOTHING
  `);
}
