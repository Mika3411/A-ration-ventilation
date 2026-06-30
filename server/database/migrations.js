export async function runDatabaseSchemaMigrations(pool) {
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
}

export async function runDatabaseDataMigrations(pool) {
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
