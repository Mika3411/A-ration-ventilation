import { dbPool, ensureDatabaseReady } from "../database.js";
import {
  cleanMessage,
  cleanSingleLine,
  formatEuroAmount,
  isValidHttpUrl,
  slugify,
} from "../helpers.js";
import { allowedImageKeys, defaultShopProducts } from "./defaultProducts.js";

let memoryShopProducts = defaultShopProducts.map((product, index) => ({
  id: index + 1,
  ...product,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export async function getPublicProducts() {
  if (!dbPool) {
    return memoryShopProducts
      .filter((product) => product.active)
      .sort(sortProducts)
      .map(serializeMemoryProduct);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      SELECT *
      FROM shop_products
      WHERE active = TRUE
      ORDER BY sort_order ASC, name ASC
    `,
  );

  return result.rows.map(serializeProductRow);
}

export async function getAdminProducts() {
  if (!dbPool) {
    return memoryShopProducts.sort(sortProducts).map(serializeMemoryProduct);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      SELECT *
      FROM shop_products
      ORDER BY sort_order ASC, category ASC, name ASC
    `,
  );

  return result.rows.map(serializeProductRow);
}

export async function createProduct(productInput) {
  const baseSlug = slugify(productInput.name);

  if (!dbPool) {
    const slug = await getUniqueProductSlug(baseSlug);
    const now = new Date().toISOString();
    const product = {
      id: Date.now(),
      slug,
      ...productInput,
      createdAt: now,
      updatedAt: now,
    };

    memoryShopProducts = [...memoryShopProducts, product];
    return serializeMemoryProduct(product);
  }

  await ensureDatabaseReady();
  const slug = await getUniqueProductSlug(baseSlug);
  const result = await dbPool.query(
    `
      INSERT INTO shop_products (
        slug,
        name,
        category,
        description,
        amount,
        image_key,
        image_url,
        featured,
        active,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      slug,
      productInput.name,
      productInput.category,
      productInput.description,
      productInput.amount,
      productInput.imageKey,
      productInput.imageUrl,
      productInput.featured,
      productInput.active,
      productInput.sortOrder,
    ],
  );

  return serializeProductRow(result.rows[0]);
}

export async function updateProduct(slug, productInput) {
  if (!dbPool) {
    const productIndex = memoryShopProducts.findIndex((product) => product.slug === slug);

    if (productIndex === -1) return null;

    const updated = {
      ...memoryShopProducts[productIndex],
      ...productInput,
      updatedAt: new Date().toISOString(),
    };

    memoryShopProducts = memoryShopProducts.map((product, index) =>
      index === productIndex ? updated : product,
    );
    return serializeMemoryProduct(updated);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      UPDATE shop_products
      SET
        name = $1,
        category = $2,
        description = $3,
        amount = $4,
        image_key = $5,
        image_url = $6,
        featured = $7,
        active = $8,
        sort_order = $9,
        updated_at = NOW()
      WHERE slug = $10
      RETURNING *
    `,
    [
      productInput.name,
      productInput.category,
      productInput.description,
      productInput.amount,
      productInput.imageKey,
      productInput.imageUrl,
      productInput.featured,
      productInput.active,
      productInput.sortOrder,
      slug,
    ],
  );

  return result.rows[0] ? serializeProductRow(result.rows[0]) : null;
}

export async function deleteProduct(slug) {
  if (!dbPool) {
    const initialLength = memoryShopProducts.length;
    memoryShopProducts = memoryShopProducts.filter((product) => product.slug !== slug);
    return memoryShopProducts.length !== initialLength;
  }

  await ensureDatabaseReady();
  const result = await dbPool.query("DELETE FROM shop_products WHERE slug = $1", [slug]);
  return result.rowCount > 0;
}

export async function normalizeCheckoutItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  const quantitiesBySlug = new Map();
  const products = await getPublicProducts();
  const productBySlug = new Map(products.map((product) => [product.slug, product]));

  for (const item of rawItems) {
    const slug = cleanSingleLine(item?.slug, 80);
    const product = productBySlug.get(slug);

    if (!product) continue;

    const quantity = Number.parseInt(item?.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1) continue;

    const nextQuantity = Math.min((quantitiesBySlug.get(slug) || 0) + quantity, 99);
    quantitiesBySlug.set(slug, nextQuantity);
  }

  return Array.from(quantitiesBySlug, ([slug, quantity]) => ({
    product: productBySlug.get(slug),
    quantity,
  }));
}

export function normalizeProductInput(body) {
  const name = cleanSingleLine(body?.name, 140);
  const category = cleanSingleLine(body?.category, 120);
  const description = cleanMessage(body?.description ?? body?.text, 1200);
  const imageUrl = cleanSingleLine(body?.imageUrl, 500);
  const requestedImageKey = cleanSingleLine(body?.imageKey, 40);
  const imageKey = allowedImageKeys.has(requestedImageKey) ? requestedImageKey : "ductFan";
  const amount = Number.parseInt(body?.amount, 10);
  const sortOrder = Number.parseInt(body?.sortOrder, 10);

  if (!name) {
    throw new ProductInputError("Le nom du produit est obligatoire.");
  }

  if (!category) {
    throw new ProductInputError("La catégorie est obligatoire.");
  }

  if (!Number.isInteger(amount) || amount < 0) {
    throw new ProductInputError("Le prix doit être un montant valide.");
  }

  if (imageUrl && !isValidHttpUrl(imageUrl)) {
    throw new ProductInputError("L'URL de l'image doit commencer par http:// ou https://.");
  }

  return {
    name,
    category,
    description,
    amount,
    imageKey,
    imageUrl,
    featured: body?.featured === true,
    active: body?.active !== false,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
  };
}

export function handleProductMutationError(error, response, fallbackMessage) {
  if (error instanceof ProductInputError) {
    response.status(400).json({ error: error.message });
    return;
  }

  console.error(fallbackMessage, error);
  response.status(500).json({ error: fallbackMessage });
}

export function getCategoriesFromProducts(products) {
  return Array.from(new Set(products.map((product) => product.category))).sort((first, second) =>
    first.localeCompare(second, "fr"),
  );
}

class ProductInputError extends Error {}

async function getUniqueProductSlug(baseSlug) {
  const safeBase = baseSlug || "produit";
  let slug = safeBase;
  let suffix = 2;

  while (await productSlugExists(slug)) {
    slug = `${safeBase}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function productSlugExists(slug) {
  if (!dbPool) {
    return memoryShopProducts.some((product) => product.slug === slug);
  }

  const result = await dbPool.query("SELECT 1 FROM shop_products WHERE slug = $1 LIMIT 1", [slug]);
  return result.rowCount > 0;
}

function serializeProductRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    text: row.description,
    amount: row.amount,
    price: formatEuroAmount(row.amount),
    imageKey: row.image_key,
    imageUrl: row.image_url,
    featured: row.featured,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeMemoryProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    text: product.description,
    amount: product.amount,
    price: formatEuroAmount(product.amount),
    imageKey: product.imageKey,
    imageUrl: product.imageUrl,
    featured: product.featured,
    active: product.active,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function sortProducts(first, second) {
  return first.sortOrder - second.sortOrder || first.name.localeCompare(second.name, "fr");
}
