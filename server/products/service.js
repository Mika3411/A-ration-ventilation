import { dbPool, ensureDatabaseReady } from "../database.js";
import {
  cleanMessage,
  cleanSingleLine,
  formatEuroAmount,
  isValidHttpsUrl,
  slugify,
} from "../helpers.js";
import { allowedImageKeys, defaultShopCategories, defaultShopProducts } from "./defaultProducts.js";
import {
  maxCartQuantity,
  maxDiscountPercent,
  minDiscountQuantity,
  normalizeQuantityDiscounts,
} from "../../shared/pricing.js";

const maxProductImageDataLength = 1_500_000;
const productImageDataPattern = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;
const defaultShopProductSlugs = new Set(defaultShopProducts.map((product) => product.slug));

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
      RETURNING *
    `,
    [
      slug,
      productInput.name,
      productInput.category,
      productInput.description,
      productInput.amount,
      JSON.stringify(productInput.options),
      JSON.stringify(productInput.quantityDiscounts),
      productInput.imageKey,
      productInput.imageUrl,
      productInput.imageData,
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
        options = $5::jsonb,
        quantity_discounts = $6::jsonb,
        image_key = $7,
        image_url = $8,
        image_data = $9,
        featured = $10,
        active = $11,
        sort_order = $12,
        updated_at = NOW()
      WHERE slug = $13
      RETURNING *
    `,
    [
      productInput.name,
      productInput.category,
      productInput.description,
      productInput.amount,
      JSON.stringify(productInput.options),
      JSON.stringify(productInput.quantityDiscounts),
      productInput.imageKey,
      productInput.imageUrl,
      productInput.imageData,
      productInput.featured,
      productInput.active,
      productInput.sortOrder,
      slug,
    ],
  );

  return result.rows[0] ? serializeProductRow(result.rows[0]) : null;
}

export async function deleteProduct(slug) {
  const isDefaultProduct = defaultShopProductSlugs.has(slug);

  if (!dbPool) {
    const productIndex = memoryShopProducts.findIndex((product) => product.slug === slug);

    if (productIndex === -1) return false;

    if (isDefaultProduct) {
      memoryShopProducts = memoryShopProducts.map((product, index) =>
        index === productIndex
          ? { ...product, active: false, updatedAt: new Date().toISOString() }
          : product,
      );
      return true;
    }

    memoryShopProducts = memoryShopProducts.filter((product) => product.slug !== slug);
    return true;
  }

  await ensureDatabaseReady();

  if (isDefaultProduct) {
    const result = await dbPool.query(
      `
        UPDATE shop_products
        SET active = FALSE, updated_at = NOW()
        WHERE slug = $1
      `,
      [slug],
    );
    return result.rowCount > 0;
  }

  const result = await dbPool.query("DELETE FROM shop_products WHERE slug = $1", [slug]);
  return result.rowCount > 0;
}

export async function normalizeCheckoutItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  const quantitiesBySlug = new Map();
  const products = await getPublicProducts();
  const checkoutProducts = getCheckoutProducts(products);
  const productBySlug = new Map(checkoutProducts.map((product) => [product.slug, product]));

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
  const imageData = normalizeProductImageData(body?.imageData);
  const requestedImageKey = cleanSingleLine(body?.imageKey, 40);
  const imageKey = allowedImageKeys.has(requestedImageKey) ? requestedImageKey : "ductFan";
  const amount = Number.parseInt(body?.amount, 10);
  const options = normalizeProductInputOptions(body?.options, name);
  const quantityDiscounts = normalizeProductInputQuantityDiscounts(body?.quantityDiscounts);
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

  if (imageUrl && !isValidHttpsUrl(imageUrl)) {
    throw new ProductInputError("L'URL de l'image doit commencer par https://.");
  }

  return {
    name,
    category,
    description,
    amount,
    options,
    quantityDiscounts,
    imageKey,
    imageUrl,
    imageData,
    featured: body?.featured === true,
    active: body?.active !== false,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
  };
}

function normalizeProductInputQuantityDiscounts(discounts) {
  if (!Array.isArray(discounts)) return [];

  const usedQuantities = new Set();

  return discounts
    .map((discount) => {
      const rawMinQuantity = String(discount?.minQuantity ?? discount?.quantity ?? "").trim();
      const rawPercent = String(discount?.percent ?? discount?.discountPercent ?? "").trim();

      if (!rawMinQuantity && !rawPercent) return null;

      const minQuantity = Number.parseInt(rawMinQuantity, 10);
      const percent = Number.parseFloat(rawPercent.replace(",", "."));

      if (
        !Number.isInteger(minQuantity) ||
        minQuantity < minDiscountQuantity ||
        minQuantity > maxCartQuantity
      ) {
        throw new ProductInputError(
          `La quantité minimale d'une remise doit être entre ${minDiscountQuantity} et ${maxCartQuantity}.`,
        );
      }

      if (!Number.isFinite(percent) || percent <= 0 || percent > maxDiscountPercent) {
        throw new ProductInputError(
          `La remise doit être un pourcentage supérieur à 0 et inférieur à 100.`,
        );
      }

      if (usedQuantities.has(minQuantity)) {
        throw new ProductInputError("Deux remises ne peuvent pas utiliser la même quantité minimale.");
      }

      usedQuantities.add(minQuantity);
      return {
        minQuantity,
        percent: Math.round(percent * 100) / 100,
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.minQuantity - second.minQuantity);
}

export function normalizeProductImageData(value) {
  if (typeof value !== "string") return "";

  const imageData = value.trim();
  if (!imageData) return "";

  if (imageData.length > maxProductImageDataLength) {
    throw new ProductInputError("L'image importée ne doit pas dépasser environ 1 Mo.");
  }

  if (!productImageDataPattern.test(imageData)) {
    throw new ProductInputError("Merci d'importer une image PNG, JPG, WebP ou GIF valide.");
  }

  return imageData;
}

function normalizeProductInputOptions(options, productName) {
  if (!Array.isArray(options)) return [];

  const usedSlugs = new Set([slugify(productName)]);

  return options
    .map((option, index) => normalizeProductInputOption(option, productName, index, usedSlugs))
    .filter(Boolean);
}

function normalizeProductInputOption(option, productName, index, usedSlugs) {
  const label = cleanSingleLine(option?.label ?? option?.name, 80);
  const amount = Number.parseInt(option?.amount, 10);
  const bgn = cleanSingleLine(option?.bgn, 40);
  const description = cleanMessage(option?.description, 500);
  const value = cleanSingleLine(option?.value, 80);
  const rawSlug = cleanSingleLine(option?.slug, 120);
  const hasContent =
    label ||
    bgn ||
    description ||
    value ||
    rawSlug ||
    String(option?.amount ?? "").trim();

  if (!hasContent) return null;

  if (!label) {
    throw new ProductInputError("Le libellé de chaque variante est obligatoire.");
  }

  if (!Number.isInteger(amount) || amount < 0) {
    throw new ProductInputError("Le prix de chaque variante doit être un montant valide.");
  }

  const baseSlug = rawSlug ? slugify(rawSlug) : slugify(`${productName}-${label}`);
  const optionSlug = getUniqueOptionSlug(baseSlug || `variante-${index + 1}`, usedSlugs);

  return {
    label,
    value: value || slugify(label),
    slug: optionSlug,
    amount,
    price: formatEuroAmount(amount),
    bgn,
    description,
  };
}

function getUniqueOptionSlug(baseSlug, usedSlugs) {
  const safeBase = baseSlug || "variante";
  let slug = safeBase;
  let suffix = 2;

  while (usedSlugs.has(slug)) {
    slug = `${safeBase}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(slug);
  return slug;
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
    price: getProductDisplayPrice(row),
    quantityDiscounts: normalizeQuantityDiscounts(row.quantity_discounts),
    imageKey: row.image_key,
    imageUrl: row.image_url,
    imageData: row.image_data || "",
    options: normalizeProductOptions(row.options),
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
    price: getProductDisplayPrice(product),
    quantityDiscounts: normalizeQuantityDiscounts(product.quantityDiscounts),
    imageKey: product.imageKey,
    imageUrl: product.imageUrl,
    imageData: product.imageData || "",
    options: normalizeProductOptions(product.options),
    featured: product.featured,
    active: product.active,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function getProductDisplayPrice(product) {
  const amount = Number.parseInt(product?.amount, 10);
  if (product?.price) return product.price;

  return amount === 0 ? "Prix sur demande" : formatEuroAmount(amount);
}

function sortProducts(first, second) {
  return first.sortOrder - second.sortOrder || first.name.localeCompare(second.name, "fr");
}

function getCheckoutProducts(products) {
  return products.flatMap((product) => getCheckoutProductEntries(product));
}

function getCheckoutProductEntries(product) {
  const options = Array.isArray(product.options) ? product.options : [];
  if (!options.length) return isPurchasableAmount(product.amount) ? [product] : [];

  return options.map((option) => {
    const { options: _options, ...baseProduct } = product;
    const baseDescription = product.description || product.text || "";
    const optionDescription =
      option.description || `${baseDescription}${baseDescription ? " " : ""}Modèle ${option.label}.`;

    return {
      ...baseProduct,
      slug: option.slug,
      name: `${product.name} ${option.label}`.trim(),
      amount: option.amount,
      price: option.price || formatEuroAmount(option.amount),
      description: optionDescription,
      text: optionDescription,
      parentSlug: product.slug,
      optionLabel: option.label,
    };
  }).filter((entry) => isPurchasableAmount(entry.amount));
}

function isPurchasableAmount(amount) {
  return Number.parseInt(amount, 10) > 0;
}

function normalizeProductOptions(options) {
  if (!Array.isArray(options)) return [];

  return options.map(normalizeProductOption).filter(Boolean);
}

function normalizeProductOption(option) {
  const amount = Number.parseInt(option?.amount, 10);
  const label = cleanSingleLine(option?.label || option?.name, 80);
  const slug = cleanSingleLine(option?.slug, 120);

  if (!label || !slug || !Number.isInteger(amount) || amount < 0) return null;

  return {
    label,
    value: cleanSingleLine(option?.value, 80) || slug,
    slug,
    amount,
    price: cleanSingleLine(option?.price, 40) || formatEuroAmount(amount),
    bgn: cleanSingleLine(option?.bgn, 40),
    description: cleanMessage(option?.description, 500),
  };
}
