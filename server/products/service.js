import { dbPool, ensureDatabaseReady } from "../database.js";
import {
  cleanMessage,
  cleanSingleLine,
  formatEuroAmount,
  isValidHttpUrl,
  slugify,
} from "../helpers.js";
import { allowedImageKeys, defaultShopCategories, defaultShopProducts } from "./defaultProducts.js";

let memoryShopProducts = defaultShopProducts.map((product, index) => ({
  id: index + 1,
  ...product,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));
let memoryShopCategories = defaultShopCategories.map((name, index) => ({
  id: index + 1,
  name,
  sortOrder: (index + 1) * 10,
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
    await ensureCategoryExists(productInput.category);
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
  await ensureCategoryExists(productInput.category);
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
    await ensureCategoryExists(productInput.category);
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
  await ensureCategoryExists(productInput.category);
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

export async function getPublicCategories() {
  if (!dbPool) {
    return sortCategoryNames([
      ...memoryShopCategories.map((category) => category.name),
      ...memoryShopProducts.filter((product) => product.active).map((product) => product.category),
    ]);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(`
    SELECT name
    FROM shop_categories
    UNION
    SELECT DISTINCT category AS name
    FROM shop_products
    WHERE active = TRUE AND category <> ''
    ORDER BY name ASC
  `);

  return result.rows.map((row) => row.name);
}

export async function getAdminCategories() {
  if (!dbPool) {
    return sortCategoryNames([
      ...memoryShopCategories.map((category) => category.name),
      ...memoryShopProducts.map((product) => product.category),
    ]);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(`
    SELECT name
    FROM shop_categories
    UNION
    SELECT DISTINCT category AS name
    FROM shop_products
    WHERE category <> ''
    ORDER BY name ASC
  `);

  return result.rows.map((row) => row.name);
}

export async function createCategory(categoryInput) {
  const { name } = normalizeCategoryInput(categoryInput);

  if (!dbPool) {
    if (categoryNameExistsInMemory(name)) {
      throw new ProductInputError("Une catégorie existe déjà avec ce nom.");
    }

    memoryShopCategories = [
      ...memoryShopCategories,
      {
        id: Date.now(),
        name,
        sortOrder: (memoryShopCategories.length + 1) * 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    return { name };
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      INSERT INTO shop_categories (name, sort_order)
      VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM shop_categories))
      ON CONFLICT (name) DO NOTHING
      RETURNING name
    `,
    [name],
  );

  if (result.rowCount === 0) {
    throw new ProductInputError("Une catégorie existe déjà avec ce nom.");
  }

  return { name: result.rows[0].name };
}

export async function renameCategory(categoryInput) {
  const { currentName, name } = normalizeRenameCategoryInput(categoryInput);

  if (currentName === name) return { name, productsUpdated: 0 };

  if (!dbPool) {
    const currentExists = categoryNameExistsInMemory(currentName);

    if (!currentExists) return null;

    if (categoryNameExistsInMemory(name)) {
      throw new ProductInputError("Une catégorie existe déjà avec ce nom.");
    }

    let categoryWasRenamed = false;
    memoryShopCategories = memoryShopCategories.map((category) => {
      if (category.name !== currentName) return category;
      categoryWasRenamed = true;
      return {
        ...category,
        name,
        updatedAt: new Date().toISOString(),
      };
    });

    if (!categoryWasRenamed) {
      await ensureCategoryExists(name);
    }

    let productsUpdated = 0;
    memoryShopProducts = memoryShopProducts.map((product) => {
      if (product.category !== currentName) return product;
      productsUpdated += 1;
      return {
        ...product,
        category: name,
        updatedAt: new Date().toISOString(),
      };
    });

    return { name, productsUpdated };
  }

  await ensureDatabaseReady();
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
        SELECT 1
        FROM shop_categories
        WHERE name = $1
        UNION
        SELECT 1
        FROM shop_products
        WHERE category = $1
        LIMIT 1
      `,
      [currentName],
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const duplicateResult = await client.query(
      `
        SELECT 1
        FROM shop_categories
        WHERE name = $1 AND name <> $2
        UNION
        SELECT 1
        FROM shop_products
        WHERE category = $1 AND category <> $2
        LIMIT 1
      `,
      [name, currentName],
    );

    if (duplicateResult.rowCount > 0) {
      throw new ProductInputError("Une catégorie existe déjà avec ce nom.");
    }

    const renamedCategory = await client.query(
      `
        UPDATE shop_categories
        SET name = $1, updated_at = NOW()
        WHERE name = $2
      `,
      [name, currentName],
    );

    if (renamedCategory.rowCount === 0) {
      await client.query(
        `
          INSERT INTO shop_categories (name, sort_order)
          VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM shop_categories))
          ON CONFLICT (name) DO NOTHING
        `,
        [name],
      );
    }

    const updatedProducts = await client.query(
      `
        UPDATE shop_products
        SET category = $1, updated_at = NOW()
        WHERE category = $2
      `,
      [name, currentName],
    );

    await client.query("COMMIT");
    return { name, productsUpdated: updatedProducts.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCategory(categoryInput) {
  const { name } = normalizeCategoryInput(categoryInput);

  if (!dbPool) {
    const productCount = memoryShopProducts.filter((product) => product.category === name).length;

    if (productCount > 0) {
      throw new ProductInputError(getCategoryInUseMessage(productCount));
    }

    const initialLength = memoryShopCategories.length;
    memoryShopCategories = memoryShopCategories.filter((category) => category.name !== name);
    return memoryShopCategories.length !== initialLength;
  }

  await ensureDatabaseReady();
  const countResult = await dbPool.query("SELECT COUNT(*)::int AS count FROM shop_products WHERE category = $1", [
    name,
  ]);
  const productCount = countResult.rows[0]?.count || 0;

  if (productCount > 0) {
    throw new ProductInputError(getCategoryInUseMessage(productCount));
  }

  const result = await dbPool.query("DELETE FROM shop_categories WHERE name = $1", [name]);
  return result.rowCount > 0;
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

export function normalizeCategoryInput(body) {
  const name = cleanSingleLine(body?.name ?? body?.category, 120);

  if (!name) {
    throw new ProductInputError("Le nom de la catégorie est obligatoire.");
  }

  return { name };
}

function normalizeRenameCategoryInput(body) {
  const currentName = cleanSingleLine(body?.currentName ?? body?.oldName, 120);
  const name = cleanSingleLine(body?.name ?? body?.newName, 120);

  if (!currentName) {
    throw new ProductInputError("La catégorie à renommer est obligatoire.");
  }

  if (!name) {
    throw new ProductInputError("Le nouveau nom de catégorie est obligatoire.");
  }

  return { currentName, name };
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

async function ensureCategoryExists(name) {
  const cleanName = cleanSingleLine(name, 120);
  if (!cleanName) return;

  if (!dbPool) {
    if (memoryShopCategories.some((category) => category.name === cleanName)) return;

    memoryShopCategories = [
      ...memoryShopCategories,
      {
        id: Date.now(),
        name: cleanName,
        sortOrder: (memoryShopCategories.length + 1) * 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    return;
  }

  await dbPool.query(
    `
      INSERT INTO shop_categories (name, sort_order)
      VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM shop_categories))
      ON CONFLICT (name) DO NOTHING
    `,
    [cleanName],
  );
}

function categoryNameExistsInMemory(name) {
  return (
    memoryShopCategories.some((category) => category.name === name) ||
    memoryShopProducts.some((product) => product.category === name)
  );
}

function sortCategoryNames(names) {
  return Array.from(new Set(names)).filter(Boolean).sort((first, second) => first.localeCompare(second, "fr"));
}

function getCategoryInUseMessage(productCount) {
  return `Impossible de supprimer une catégorie utilisée par ${productCount} produit${
    productCount > 1 ? "s" : ""
  }.`;
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
