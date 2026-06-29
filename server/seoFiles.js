import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pageSeo } from "../src/data/seo.js";
import { escapeHtml, getRequestOrigin } from "./helpers.js";
import { defaultShopProducts } from "./products/defaultProducts.js";
import { getPublicProducts } from "./products/service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const faviconPngPath = path.join(
  __dirname,
  "..",
  "src",
  "assets",
  "logo-aeration-ventilation-rounded-384.png",
);
const nonIndexableSitemapPaths = new Set(["/admin", "/espace-client"]);
const staticSitemapPaths = Object.keys(pageSeo).filter(
  (pathname) => !nonIndexableSitemapPaths.has(pathname),
);

let faviconBuffer;

export function createSeoFilesRouter() {
  const router = express.Router();

  router.get("/robots.txt", (request, response) => {
    response
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send(getRobotsTxt(getRequestOrigin(request)));
  });

  router.get("/sitemap.xml", async (request, response, next) => {
    try {
      response
        .type("application/xml")
        .set("Cache-Control", "public, max-age=900")
        .send(await getSitemapXml(getRequestOrigin(request)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/favicon.ico", async (_request, response, next) => {
    try {
      response
        .type("image/x-icon")
        .set("Cache-Control", "public, max-age=31536000, immutable")
        .send(await getFaviconBuffer());
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function getRobotsTxt(origin) {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
  ];

  if (origin) {
    lines.push(`Sitemap: ${getAbsoluteUrl(origin, "/sitemap.xml")}`);
  }

  return `${lines.join("\n")}\n`;
}

export async function getSitemapXml(origin) {
  const urls = await getSitemapUrls(origin);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

export async function getSitemapUrls(origin) {
  if (!origin) return [];

  const products = await getProductsForSitemap();
  const paths = new Set([
    ...staticSitemapPaths,
    ...products.filter((product) => product.slug).map((product) => `/boutique/${product.slug}`),
  ]);

  return Array.from(paths, (pathname) => getAbsoluteUrl(origin, pathname));
}

async function getProductsForSitemap() {
  try {
    return await getPublicProducts();
  } catch {
    return defaultShopProducts.filter((product) => product.active !== false);
  }
}

async function getFaviconBuffer() {
  if (!faviconBuffer) {
    faviconBuffer = createIcoFromPng(await fs.readFile(faviconPngPath));
  }

  return faviconBuffer;
}

function createIcoFromPng(pngBuffer) {
  const header = Buffer.alloc(22);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6);
  header.writeUInt8(0, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBuffer.length, 14);
  header.writeUInt32LE(header.length, 18);

  return Buffer.concat([header, pngBuffer]);
}

function getAbsoluteUrl(origin, pathname) {
  return new URL(pathname, `${origin}/`).toString();
}
