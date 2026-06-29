import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createApp } from "../server/app.js";
import { defaultShopCategories, defaultShopProducts } from "../server/products/defaultProducts.js";

const htmlTemplate = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Description par défaut">
    <title>Titre par défaut</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`;

async function withTempDist(callback) {
  const distPath = await fs.mkdtemp(path.join(os.tmpdir(), "aeration-seo-"));

  try {
    await fs.mkdir(path.join(distPath, "assets"));
    await fs.writeFile(path.join(distPath, "index.html"), htmlTemplate);
    await fs.writeFile(path.join(distPath, "assets", "app.js"), "console.log('ok');");
    await fs.writeFile(path.join(distPath, "assets", "product-axial-fan-test.jpg"), "image");

    return await callback(distPath);
  } finally {
    await fs.rm(distPath, { recursive: true, force: true });
  }
}

async function withEnv(overrides, callback) {
  const previousValues = new Map(
    Object.keys(overrides).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of previousValues.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withServer(distPath, callback) {
  const app = createApp({ distPath });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });

  try {
    const { port } = server.address();
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("GET routes HTML injectent des metas SEO spécifiques", async () => {
  await withTempDist(async (distPath) => {
    await withServer(distPath, async (baseUrl) => {
      const responses = await Promise.all(
        [
          "/boutique",
          "/categories/ventilateurs-axiaux",
          "/contact",
          "/admin",
          "/boutique/ventilateurs-axiaux",
        ].map(async (route) => {
          const response = await fetch(`${baseUrl}${route}`);
          return [route, response, await response.text()];
        }),
      );
      const htmlByRoute = new Map(responses.map(([route, _response, html]) => [route, html]));

      for (const [_route, response] of responses) {
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/html/);
      }

      assert.equal(getTitle(htmlByRoute.get("/boutique")), "Boutique - Aération Ventilation");
      assert.equal(
        getTitle(htmlByRoute.get("/categories/ventilateurs-axiaux")),
        "Ventilateurs axiaux - Aération Ventilation",
      );
      assert.equal(getTitle(htmlByRoute.get("/contact")), "Contact - Aération Ventilation");
      assert.equal(getTitle(htmlByRoute.get("/admin")), "Administration boutique - Aération Ventilation");
      assert.equal(
        getTitle(htmlByRoute.get("/boutique/ventilateurs-axiaux")),
        "Ventilateurs axiaux - Aération Ventilation",
      );

      assert.match(
        getMetaContent(htmlByRoute.get("/boutique"), "description"),
        /Parcourez les ventilateurs/,
      );
      assert.match(
        getMetaContent(htmlByRoute.get("/categories/ventilateurs-axiaux"), "description"),
        /catégorie Ventilateurs axiaux/,
      );
      assert.match(
        getMetaContent(htmlByRoute.get("/contact"), "description"),
        /réponse écrite/,
      );
      assert.match(
        getMetaContent(htmlByRoute.get("/boutique/ventilateurs-axiaux"), "description"),
        /Ventilateurs haute performance/,
      );
      assert.equal(getMetaContent(htmlByRoute.get("/admin"), "robots"), "noindex, nofollow");

      assert.notEqual(
        getMetaContent(htmlByRoute.get("/boutique"), "description"),
        getMetaContent(htmlByRoute.get("/contact"), "description"),
      );
    });
  });
});

test("GET routes HTML injectent une canonical absolue basée sur SITE_URL", async () => {
  await withEnv({ SITE_URL: "https://www.aeration-ventilation.fr///" }, async () => {
    await withTempDist(async (distPath) => {
      await withServer(distPath, async (baseUrl) => {
        const homeResponse = await fetch(`${baseUrl}/`);
        const homeHtml = await homeResponse.text();
        const contactResponse = await fetch(`${baseUrl}/contact`);
        const contactHtml = await contactResponse.text();
        const categoryResponse = await fetch(`${baseUrl}/categories/ventilateurs-axiaux`);
        const categoryHtml = await categoryResponse.text();
        const productResponse = await fetch(`${baseUrl}/boutique/ventilateurs-axiaux`);
        const productHtml = await productResponse.text();

        assert.equal(homeResponse.status, 200);
        assert.equal(getLinkHref(homeHtml, "canonical"), "https://www.aeration-ventilation.fr/");
        assert.equal(
          getMetaPropertyContent(homeHtml, "og:url"),
          "https://www.aeration-ventilation.fr/",
        );

        assert.equal(contactResponse.status, 200);
        assert.equal(
          getLinkHref(contactHtml, "canonical"),
          "https://www.aeration-ventilation.fr/contact",
        );
        assert.equal(
          getMetaPropertyContent(contactHtml, "og:url"),
          "https://www.aeration-ventilation.fr/contact",
        );

        assert.equal(categoryResponse.status, 200);
        assert.equal(
          getLinkHref(categoryHtml, "canonical"),
          "https://www.aeration-ventilation.fr/categories/ventilateurs-axiaux",
        );
        assert.equal(
          getMetaPropertyContent(categoryHtml, "og:url"),
          "https://www.aeration-ventilation.fr/categories/ventilateurs-axiaux",
        );

        assert.equal(productResponse.status, 200);
        assert.equal(
          getLinkHref(productHtml, "canonical"),
          "https://www.aeration-ventilation.fr/boutique/ventilateurs-axiaux",
        );
        assert.equal(
          getMetaPropertyContent(productHtml, "og:url"),
          "https://www.aeration-ventilation.fr/boutique/ventilateurs-axiaux",
        );
      });
    });
  });
});

test("GET routes HTML injectent les données structurées JSON-LD adaptées", async () => {
  await withEnv({ SITE_URL: "https://www.aeration-ventilation.fr" }, async () => {
    await withTempDist(async (distPath) => {
      await withServer(distPath, async (baseUrl) => {
        const contactResponse = await fetch(`${baseUrl}/contact`);
        const contactHtml = await contactResponse.text();
        const contactGraph = getJsonLdGraph(contactHtml);
        const organization = findJsonLdNode(contactGraph, "Organization");
        const localBusiness = findJsonLdNode(contactGraph, "LocalBusiness");
        const contactBreadcrumb = findJsonLdNode(contactGraph, "BreadcrumbList");

        assert.equal(contactResponse.status, 200);
        assert.equal(organization.name, "Aération Ventilation");
        assert.equal(organization.url, "https://www.aeration-ventilation.fr/");
        assert.equal(localBusiness.address.addressCountry, "BG");
        assert.deepEqual(
          contactBreadcrumb.itemListElement.map((item) => item.name),
          ["Accueil", "Contact"],
        );
        assert.equal(
          contactBreadcrumb.itemListElement.at(-1).item,
          "https://www.aeration-ventilation.fr/contact",
        );

        const categoryResponse = await fetch(`${baseUrl}/categories/ventilateurs-axiaux`);
        const categoryHtml = await categoryResponse.text();
        const categoryGraph = getJsonLdGraph(categoryHtml);
        const categoryBreadcrumb = findJsonLdNode(categoryGraph, "BreadcrumbList");

        assert.equal(categoryResponse.status, 200);
        assert.equal(findOptionalJsonLdNode(categoryGraph, "Product"), null);
        assert.deepEqual(
          categoryBreadcrumb.itemListElement.map((item) => item.name),
          ["Accueil", "Boutique", "Ventilateurs axiaux"],
        );

        const productResponse = await fetch(`${baseUrl}/boutique/ventilateurs-axiaux`);
        const productHtml = await productResponse.text();
        const productGraph = getJsonLdGraph(productHtml);
        const product = findJsonLdNode(productGraph, "Product");
        const productBreadcrumb = findJsonLdNode(productGraph, "BreadcrumbList");

        assert.equal(productResponse.status, 200);
        assert.equal(product.name, "Ventilateurs axiaux");
        assert.equal(product.url, "https://www.aeration-ventilation.fr/boutique/ventilateurs-axiaux");
        assert.equal(product.offers.priceCurrency, "EUR");
        assert.equal(product.offers.price, "249.00");
        assert.equal(product.offers.availability, "https://schema.org/InStock");
        assert.deepEqual(product.image, [
          "https://www.aeration-ventilation.fr/assets/product-axial-fan-test.jpg",
        ]);
        assert.deepEqual(
          productBreadcrumb.itemListElement.map((item) => item.name),
          ["Accueil", "Boutique", "Ventilateurs axiaux"],
        );

        const adminResponse = await fetch(`${baseUrl}/admin`);
        const adminHtml = await adminResponse.text();

        assert.equal(adminResponse.status, 200);
        assert.equal(getJsonLdGraph(adminHtml), null);
      });
    });
  });
});

test("GET pages et produits exposent des meta descriptions uniques", async () => {
  await withTempDist(async (distPath) => {
    await withServer(distPath, async (baseUrl) => {
      const genericIndexDescription =
        "Aération Ventilation fournit des ventilateurs industriels et systèmes de ventilation en France, Belgique et Suisse.";
      const routes = [
        "/",
        "/boutique",
        "/a-propos",
        "/livraison",
        "/contact",
        "/espace-client",
        "/confidentialite",
        "/conditions-generales-de-vente",
        "/admin",
        ...defaultShopCategories.map((category) => `/categories/${slugifyForTest(category)}`),
        ...defaultShopProducts.map((product) => `/boutique/${product.slug}`),
      ];
      const descriptionsByRoute = new Map();

      for (const route of routes) {
        const response = await fetch(`${baseUrl}${route}`);
        const html = await response.text();
        const description = getMetaContent(html, "description");

        assert.equal(response.status, 200);
        assert.ok(description, `Description manquante pour ${route}`);
        descriptionsByRoute.set(route, description);

        if (route !== "/") {
          assert.notEqual(
            description,
            genericIndexDescription,
            `${route} reprend la description générique de index.html`,
          );
        }
      }

      const seenDescriptions = new Map();
      for (const [route, description] of descriptionsByRoute.entries()) {
        assert.equal(
          seenDescriptions.has(description),
          false,
          `${route} partage sa description avec ${seenDescriptions.get(description)}`,
        );
        seenDescriptions.set(description, route);
      }
    });
  });
});

test("GET / passe aussi par l'injection et les assets restent statiques", async () => {
  await withTempDist(async (distPath) => {
    await withServer(distPath, async (baseUrl) => {
      const homeResponse = await fetch(`${baseUrl}/`);
      const homeHtml = await homeResponse.text();
      const assetResponse = await fetch(`${baseUrl}/assets/app.js`);

      assert.equal(homeResponse.status, 200);
      assert.equal(getTitle(homeHtml), "Aération Ventilation - Ventilateurs industriels");
      assert.match(getMetaContent(homeHtml, "description"), /France, Belgique et Suisse/);
      assert.equal(assetResponse.status, 200);
      assert.equal(await assetResponse.text(), "console.log('ok');");
    });
  });
});

test("GET assets hashés utilisent un cache long et le HTML reste revalidé", async () => {
  await withTempDist(async (distPath) => {
    await withServer(distPath, async (baseUrl) => {
      const assetResponse = await fetch(`${baseUrl}/assets/app.js`);
      const homeResponse = await fetch(`${baseUrl}/`);
      const indexResponse = await fetch(`${baseUrl}/index.html`);

      assert.equal(assetResponse.status, 200);
      assert.match(
        assetResponse.headers.get("cache-control") || "",
        /public, max-age=31536000, immutable/,
      );

      assert.equal(homeResponse.status, 200);
      assert.equal(homeResponse.headers.get("cache-control"), "no-cache");

      assert.equal(indexResponse.status, 200);
      assert.doesNotMatch(
        indexResponse.headers.get("cache-control") || "",
        /max-age=31536000|immutable/,
      );
    });
  });
});

test("GET fichiers SEO essentiels ne tombent pas dans le fallback SPA", async () => {
  await withTempDist(async (distPath) => {
    await withServer(distPath, async (baseUrl) => {
      const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
      const robotsText = await robotsResponse.text();
      const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`);
      const sitemapXml = await sitemapResponse.text();
      const faviconResponse = await fetch(`${baseUrl}/favicon.ico`);
      const faviconBytes = Buffer.from(await faviconResponse.arrayBuffer());

      assert.equal(robotsResponse.status, 200);
      assert.match(robotsResponse.headers.get("content-type"), /text\/plain/);
      assert.match(robotsText, /User-agent: \*/);
      assert.match(robotsText, /Disallow: \/admin/);
      assert.match(robotsText, new RegExp(`Sitemap: ${escapeRegExp(baseUrl)}/sitemap\\.xml`));
      assert.doesNotMatch(robotsText, /<!doctype html/i);

      assert.equal(sitemapResponse.status, 200);
      assert.match(sitemapResponse.headers.get("content-type"), /application\/xml/);
      assert.match(sitemapXml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
      assert.match(sitemapXml, new RegExp(`<loc>${escapeRegExp(baseUrl)}/</loc>`));
      assert.match(sitemapXml, new RegExp(`<loc>${escapeRegExp(baseUrl)}/boutique</loc>`));
      assert.match(
        sitemapXml,
        new RegExp(`<loc>${escapeRegExp(baseUrl)}/categories/ventilateurs-axiaux</loc>`),
      );
      assert.match(
        sitemapXml,
        new RegExp(`<loc>${escapeRegExp(baseUrl)}/boutique/ventilateurs-axiaux</loc>`),
      );
      assert.doesNotMatch(sitemapXml, /<loc>.*\/admin<\/loc>/);
      assert.doesNotMatch(sitemapXml, /<loc>.*\/espace-client<\/loc>/);
      assert.doesNotMatch(sitemapXml, /<!doctype html/i);

      assert.equal(faviconResponse.status, 200);
      assert.match(faviconResponse.headers.get("content-type"), /image\/x-icon/);
      assert.equal(faviconBytes.subarray(0, 4).toString("hex"), "00000100");
      assert.equal(faviconBytes.subarray(22, 30).toString("hex"), "89504e470d0a1a0a");
    });
  });
});

test("GET pages privées renvoient meta robots et X-Robots-Tag noindex", async () => {
  await withTempDist(async (distPath) => {
    await withServer(distPath, async (baseUrl) => {
      const privateRoutes = ["/admin", "/espace-client"];

      for (const route of privateRoutes) {
        const response = await fetch(`${baseUrl}${route}`);
        const html = await response.text();

        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.equal(getMetaContent(html, "robots"), "noindex, nofollow");
        assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
      }
    });
  });
});

test("GET routes inconnues renvoient une vraie 404 HTML noindex", async () => {
  await withTempDist(async (distPath) => {
    await withServer(distPath, async (baseUrl) => {
      const missingPageResponse = await fetch(`${baseUrl}/page-inexistante`);
      const missingPageHtml = await missingPageResponse.text();
      const missingProductResponse = await fetch(`${baseUrl}/boutique/produit-inexistant`);
      const missingProductHtml = await missingProductResponse.text();
      const missingCategoryResponse = await fetch(`${baseUrl}/categories/categorie-inexistante`);
      const missingCategoryHtml = await missingCategoryResponse.text();
      const existingProductResponse = await fetch(`${baseUrl}/boutique/ventilateurs-axiaux`);
      const existingCategoryResponse = await fetch(`${baseUrl}/categories/ventilateurs-axiaux`);

      assert.equal(missingPageResponse.status, 404);
      assert.match(missingPageResponse.headers.get("content-type"), /text\/html/);
      assert.equal(getTitle(missingPageHtml), "Page introuvable - Aération Ventilation");
      assert.equal(getMetaContent(missingPageHtml, "robots"), "noindex, nofollow");
      assert.match(getMetaContent(missingPageHtml, "description"), /n&#39;existe pas/);

      assert.equal(missingProductResponse.status, 404);
      assert.match(missingProductResponse.headers.get("content-type"), /text\/html/);
      assert.equal(getTitle(missingProductHtml), "Page introuvable - Aération Ventilation");
      assert.equal(getMetaContent(missingProductHtml, "robots"), "noindex, nofollow");

      assert.equal(missingCategoryResponse.status, 404);
      assert.match(missingCategoryResponse.headers.get("content-type"), /text\/html/);
      assert.equal(getTitle(missingCategoryHtml), "Page introuvable - Aération Ventilation");
      assert.equal(getMetaContent(missingCategoryHtml, "robots"), "noindex, nofollow");

      assert.equal(existingProductResponse.status, 200);
      assert.equal(existingCategoryResponse.status, 200);
    });
  });
});

function getTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "";
}

function getMetaContent(html, name) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*name=["']${escapeRegExp(name)}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );

  return html.match(pattern)?.[1] || "";
}

function getMetaPropertyContent(html, property) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*property=["']${escapeRegExp(property)}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );

  return html.match(pattern)?.[1] || "";
}

function getLinkHref(html, rel) {
  const pattern = new RegExp(
    `<link\\s+[^>]*rel=["']${escapeRegExp(rel)}["'][^>]*href=["']([^"']*)["'][^>]*>`,
    "i",
  );

  return html.match(pattern)?.[1] || "";
}

function getJsonLdGraph(html) {
  const match = html.match(
    /<script(?=[^>]*type=["']application\/ld\+json["'])(?=[^>]*data-seo-jsonld=["']primary["'])[^>]*>([\s\S]*?)<\/script>/i,
  );

  if (!match) return null;

  return JSON.parse(match[1])["@graph"];
}

function findJsonLdNode(graph, type) {
  assert.ok(Array.isArray(graph), `Graphe JSON-LD manquant pour ${type}`);

  const node = findOptionalJsonLdNode(graph, type);

  assert.ok(node, `Noeud JSON-LD ${type} manquant`);
  return node;
}

function findOptionalJsonLdNode(graph, type) {
  assert.ok(Array.isArray(graph), `Graphe JSON-LD manquant pour ${type}`);

  const node = graph.find((entry) => {
    const entryTypes = Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]];
    return entryTypes.includes(type);
  });

  return node || null;
}

function slugifyForTest(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "categorie";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
