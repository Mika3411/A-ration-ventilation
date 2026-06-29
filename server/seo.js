import fs from "node:fs/promises";
import path from "node:path";

import { getPageSeo, normalizeSeoPath, notFoundSeo, pageSeo } from "../src/data/seo.js";
import { escapeHtml, getRequestOrigin } from "./helpers.js";
import { defaultShopProducts } from "./products/defaultProducts.js";
import { getPublicProducts } from "./products/service.js";

const indexHtmlFileName = "index.html";

export async function sendIndexHtmlWithSeo(request, response, next, distPath) {
  try {
    const [html, routeSeo] = await Promise.all([
      fs.readFile(path.join(distPath, indexHtmlFileName), "utf8"),
      resolveRequestSeo(request.path),
    ]);

    if (routeSeo.seo.robots) {
      response.set("X-Robots-Tag", routeSeo.seo.robots);
    }

    response
      .status(routeSeo.statusCode)
      .type("html")
      .send(injectSeoIntoHtml(html, routeSeo.seo, getCanonicalUrl(request)));
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
        statusCode: 200,
      }
    : {
        seo: notFoundSeo,
        statusCode: 404,
      };
}

export function injectSeoIntoHtml(html, seo, canonicalUrl = "") {
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

function insertHeadTag(html, tag) {
  const closingHeadPattern = /<\/head>/i;
  if (!closingHeadPattern.test(html)) return `${html}\n${tag}`;

  return html.replace(closingHeadPattern, `    ${tag}\n  </head>`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
