import fs from "node:fs/promises";
import path from "node:path";

import {
  findCategoryBySlug,
  getCategorySlugFromPath,
  isCategoryPath,
} from "../src/data/categories.js";
import {
  getPageSeo,
  getStructuredData,
  normalizeSeoPath,
  notFoundSeo,
  pageSeo,
} from "../src/data/seo.js";
import { escapeHtml, getRequestOrigin } from "./helpers.js";
import { defaultShopCategories, defaultShopProducts } from "./products/defaultProducts.js";
import { getPublicCategories, getPublicProducts } from "./products/service.js";

const indexHtmlFileName = "index.html";
const productImageFilePrefixesByKey = {
  axialFan: "product-axial-fan-",
  axialFanDraf: "product-axial-fan-draf-",
  axialFanYsa: "product-axial-fan-ysa-",
  axialFanKsa: "product-axial-fan-ksa-",
  axialFanKta: "product-axial-fan-kta-",
  axialFanDta: "product-axial-fan-dta-",
  axialFan8ka: "product-axial-fan-8ka-",
  axialFan4ka: "product-axial-fan-4ka-",
  ceilingGrille: "product-ceiling-grille-",
  wallVentilationGrille: "product-wall-ventilation-grille-",
  spiroDuctVentilationGrille: "product-spiro-duct-ventilation-grille-",
  spiroDuct: "product-round-spiro-duct-",
  fixedLouverGrille: "product-fixed-louver-grille-",
  ductFan: "product-duct-fan-",
  ductFanYka: "product-duct-fan-yka-",
  ductFanPakf: "product-duct-fan-pakf-",
  roundInlineDuctFanLkt: "product-round-inline-duct-fan-lkt-",
  bathroomFanDty: "product-bathroom-fan-dty-",
  bathroomFanApkt: "product-bathroom-fan-apkt-",
  bathroomFanAuto: "product-bathroom-fan-auto-",
  centrifugalFanAgf: "product-centrifugal-fan-agf-",
  centrifugalFanDr: "product-centrifugal-fan-dr-",
  centrifugalFanFbk: "product-centrifugal-fan-fbk-",
  centrifugalFanPobra: "product-centrifugal-fan-pobra-",
  centrifugalFanPsek: "product-centrifugal-fan-psek-",
  roofFanFkcf: "product-roof-fan-fkcf-",
  mobileLouverGrille: "product-mobile-louver-grille-",
  conicalSuctionGrille: "product-conical-suction-grille-",
  rectangularConstantAirflowDamperHcavR:
    "product-rectangular-constant-airflow-damper-hcav-r-",
  electricMotor: "product-electric-motor-11kw-cast-iron-",
  electricMotor11Kw2800Aluminum: "product-electric-motor-11kw-2800-aluminum-",
  electricMotor22Kw1430CastIron: "product-electric-motor-22kw-1430-cast-iron-",
  electricMotor22Kw: "product-electric-motor-22kw-2800-aluminum-",
  electricMotor22Kw2800CastIron: "product-electric-motor-cast-iron-22kw-2800-",
  electricMotor22Kw2800CastIronCopper:
    "product-electric-motor-cast-iron-copper-22kw-2800-",
  electricMotor3Kw1430CastIron: "product-electric-motor-3kw-1430-cast-iron-",
  electricMotorThreePhase11Kw2850: "product-electric-motor-three-phase-11kw-2850-",
  electricMotorThreePhase22Kw1430CastIronCopper:
    "product-electric-motor-three-phase-22kw-1430-cast-iron-copper-",
  electricMotorThreePhase22Kw2850CastIronCopper:
    "product-electric-motor-three-phase-22kw-2850-cast-iron-copper-",
  electricMotorThreePhase3Kw1430CastIron:
    "product-electric-motor-three-phase-3kw-1430-cast-iron-",
  electricMotorThreePhase3Kw2850CastIron:
    "product-electric-motor-three-phase-3kw-2850-cast-iron-",
  electricMotorThreePhase55Kw2850AluminumCopper:
    "product-electric-motor-three-phase-55kw-2850-aluminum-copper-",
  speedController: "product-speed-controller-",
};
const builtProductImagePathCache = new Map();

export async function sendIndexHtmlWithSeo(request, response, next, distPath) {
  try {
    const [html, routeSeo] = await Promise.all([
      fs.readFile(path.join(distPath, indexHtmlFileName), "utf8"),
      resolveRequestSeo(request.path),
    ]);

    if (routeSeo.seo.robots) {
      response.set("X-Robots-Tag", routeSeo.seo.robots);
    }

    const canonicalUrl = getCanonicalUrl(request);
    const structuredDataProduct = routeSeo.product
      ? await addBuiltProductImage(routeSeo.product, distPath)
      : undefined;
    const structuredData = getStructuredData(
      request.path,
      structuredDataProduct,
      canonicalUrl,
      routeSeo.category,
    );

    response
      .status(routeSeo.statusCode)
      .set("Cache-Control", "no-cache")
      .type("html")
      .send(injectSeoIntoHtml(html, routeSeo.seo, canonicalUrl, structuredData));
  } catch (error) {
    next(error);
  }
}

export async function resolveRequestSeo(pathname) {
  const normalizedPath = normalizeSeoPath(pathname);

  if (pageSeo[normalizedPath]) {
    return {
      seo: getPageSeo(normalizedPath),
      statusCode: 200,
    };
  }

  if (isCategoryPath(normalizedPath)) {
    const category = await findCategoryForPath(normalizedPath);

    return category
      ? {
          seo: getPageSeo(normalizedPath, undefined, category),
          category,
          statusCode: 200,
        }
      : {
          seo: notFoundSeo,
          statusCode: 404,
        };
  }

  if (!normalizedPath.startsWith("/boutique/")) {
    return {
      seo: notFoundSeo,
      statusCode: 404,
    };
  }

  const product = await findProductForPath(normalizedPath);

  return product
    ? {
        seo: getPageSeo(normalizedPath, product),
        product,
        statusCode: 200,
      }
    : {
        seo: notFoundSeo,
        statusCode: 404,
      };
}

export function injectSeoIntoHtml(html, seo, canonicalUrl = "", structuredData = null) {
  let nextHtml = upsertTitle(html, seo.title);

  nextHtml = upsertMetaTag(nextHtml, "name", "description", seo.description);
  nextHtml = upsertMetaTag(nextHtml, "property", "og:title", seo.title);
  nextHtml = upsertMetaTag(nextHtml, "property", "og:description", seo.description);
  nextHtml = upsertMetaTag(nextHtml, "name", "twitter:card", "summary");
  nextHtml = upsertMetaTag(nextHtml, "name", "twitter:title", seo.title);
  nextHtml = upsertMetaTag(nextHtml, "name", "twitter:description", seo.description);

  if (canonicalUrl) {
    nextHtml = upsertLinkTag(nextHtml, "canonical", canonicalUrl);
    nextHtml = upsertMetaTag(nextHtml, "property", "og:url", canonicalUrl);
  }

  nextHtml = upsertStructuredDataScript(nextHtml, structuredData);

  return seo.robots
    ? upsertMetaTag(nextHtml, "name", "robots", seo.robots)
    : removeMetaTag(nextHtml, "name", "robots");
}

async function findProductForPath(pathname) {
  const slug = pathname.replace(/^\/boutique\/+/, "");
  if (!slug) return undefined;

  const products = await getProductsForSeo();
  return products.find((product) => product.slug === slug);
}

async function getProductsForSeo() {
  try {
    return await getPublicProducts();
  } catch {
    return defaultShopProducts;
  }
}

async function findCategoryForPath(pathname) {
  const slug = getCategorySlugFromPath(pathname);
  if (!slug) return "";

  const categories = await getCategoriesForSeo();
  return findCategoryBySlug(categories, slug);
}

async function getCategoriesForSeo() {
  try {
    return await getPublicCategories();
  } catch {
    return defaultShopCategories;
  }
}

async function addBuiltProductImage(product, distPath) {
  if (product.image || product.imageUrl || !product.imageKey) return product;

  const image = await getBuiltProductImagePath(distPath, product.imageKey);
  return image ? { ...product, image } : product;
}

async function getBuiltProductImagePath(distPath, imageKey) {
  const cacheKey = `${distPath}:${imageKey}`;
  if (builtProductImagePathCache.has(cacheKey)) return builtProductImagePathCache.get(cacheKey);

  const prefix = productImageFilePrefixesByKey[imageKey];
  if (!prefix) {
    builtProductImagePathCache.set(cacheKey, "");
    return "";
  }

  try {
    const assetNames = await fs.readdir(path.join(distPath, "assets"));
    const imageFileName =
      assetNames.find((fileName) => isProductImageFile(fileName, prefix)) || "";
    const imagePath = imageFileName ? `/assets/${imageFileName}` : "";

    builtProductImagePathCache.set(cacheKey, imagePath);
    return imagePath;
  } catch {
    builtProductImagePathCache.set(cacheKey, "");
    return "";
  }
}

function isProductImageFile(fileName, prefix) {
  return fileName.startsWith(prefix) && /\.(?:avif|jpe?g|png|webp)$/i.test(fileName);
}

function getCanonicalUrl(request) {
  const origin = getRequestOrigin(request);
  if (!origin) return "";

  try {
    return new URL(normalizeSeoPath(request.path), `${origin}/`).toString();
  } catch {
    return "";
  }
}

function upsertTitle(html, title) {
  const tag = `<title>${escapeHtml(title)}</title>`;
  const pattern = /<title>[\s\S]*?<\/title>/i;

  if (pattern.test(html)) return html.replace(pattern, tag);

  return insertHeadTag(html, tag);
}

function upsertMetaTag(html, attributeName, attributeValue, content) {
  const tag = `<meta ${attributeName}="${escapeHtml(attributeValue)}" content="${escapeHtml(content)}">`;
  const pattern = new RegExp(
    `<meta\\s+[^>]*${escapeRegExp(attributeName)}=["']${escapeRegExp(attributeValue)}["'][^>]*>`,
    "i",
  );

  if (pattern.test(html)) return html.replace(pattern, tag);

  return insertHeadTag(html, tag);
}

function removeMetaTag(html, attributeName, attributeValue) {
  const pattern = new RegExp(
    `\\s*<meta\\s+[^>]*${escapeRegExp(attributeName)}=["']${escapeRegExp(attributeValue)}["'][^>]*>`,
    "i",
  );

  return html.replace(pattern, "");
}

function upsertLinkTag(html, rel, href) {
  const tag = `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}">`;
  const pattern = new RegExp(
    `<link\\s+[^>]*rel=["']${escapeRegExp(rel)}["'][^>]*>`,
    "i",
  );

  if (pattern.test(html)) return html.replace(pattern, tag);

  return insertHeadTag(html, tag);
}

function upsertStructuredDataScript(html, structuredData) {
  const json = serializeStructuredData(structuredData);

  if (!json) return removeStructuredDataScript(html);

  const tag = `<script type="application/ld+json" data-seo-jsonld="primary">${json}</script>`;
  const pattern =
    /\s*<script(?=[^>]*type=["']application\/ld\+json["'])(?=[^>]*data-seo-jsonld=["']primary["'])[^>]*>[\s\S]*?<\/script>/i;

  if (pattern.test(html)) return html.replace(pattern, `\n    ${tag}`);

  return insertHeadTag(html, tag);
}

function removeStructuredDataScript(html) {
  return html.replace(
    /\s*<script(?=[^>]*type=["']application\/ld\+json["'])(?=[^>]*data-seo-jsonld=["']primary["'])[^>]*>[\s\S]*?<\/script>/i,
    "",
  );
}

function serializeStructuredData(structuredData) {
  if (!structuredData) return "";

  return JSON.stringify(structuredData)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function insertHeadTag(html, tag) {
  const closingHeadPattern = /<\/head>/i;
  if (!closingHeadPattern.test(html)) return `${html}\n${tag}`;

  return html.replace(closingHeadPattern, `    ${tag}\n  </head>`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
