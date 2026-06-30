import { defaultShopCategories, defaultShopProducts } from "../products/defaultProducts.js";

export async function seedDefaultShopProducts(pool) {
  for (const product of defaultShopProducts) {
    await pool.query(
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
}

export async function seedDefaultShopCategories(pool) {
  for (const [index, category] of defaultShopCategories.entries()) {
    await pool.query(
      `
        INSERT INTO shop_categories (name, sort_order)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
      [category, (index + 1) * 10],
    );
  }
}

export async function seedMissingProductCategories(pool) {
  await pool.query(`
    INSERT INTO shop_categories (name, sort_order)
    SELECT DISTINCT category, 1000
    FROM shop_products
    WHERE category <> ''
    ON CONFLICT (name) DO NOTHING
  `);
}
