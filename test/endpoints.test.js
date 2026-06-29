import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../server/app.js";
import { missingProductionSiteUrlError } from "../server/config.js";
import { normalizeCheckoutItems } from "../server/products/service.js";
import { adminCsrfError } from "../server/security/csrf.js";
import { missingCheckoutDatabaseError } from "../server/stripe/routes.js";

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

async function withServer(callback) {
  const app = createApp();
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

test("GET /api/health retourne ok", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
    assert.equal(response.headers.get("x-powered-by"), null);
    const contentSecurityPolicy = response.headers.get("content-security-policy");
    assert.ok(contentSecurityPolicy);
    assert.equal(contentSecurityPolicy.includes("'unsafe-inline'"), false);
  });
});

test("GET /api/products retourne les produits publics par défaut sans Postgres", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(body.products), true);
    assert.equal(Array.isArray(body.categories), true);
    assert.equal(body.products.length, 22);
    assert.deepEqual(
      body.products.map((product) => product.slug),
      [
        "ventilateurs-axiaux",
        "ventilateur-axial-draf",
        "ventilateur-axial-ysa",
        "ventilateur-axial-ksa",
        "ventilateur-axial-kta",
        "ventilateurs-de-canaux",
        "ventilateur-de-canal-yka",
        "moteur-electrique-monophase-11-kw-2800-tr-min",
        "moteur-electrique-monophase-11-kw-2800-tr-min-carter-en-fonte",
        "moteur-electrique-monophase-22-kw-2800-tr-min",
        "moteur-electrique-monophase-22-kw-2800-tr-min-carter-en-fonte",
        "moteur-electrique-monophase-22-kw-2800-tr-min-carter-en-fonte-enroulement-cuivre",
        "moteur-electrique-monophase-22-kw-1430-tr-min-carter-en-fonte",
        "moteur-electrique-monophase-3-kw-1430-tr-min-en-fonte",
        "moteur-electrique-triphase-11-kw-2850-tr-min",
        "moteur-electrique-triphase-22-kw-1430-tr-min",
        "moteur-electrique-triphase-3-kw-1430-tr-min",
        "moteur-electrique-triphase-22-kw-2850-tr-min",
        "moteur-electrique-triphase-3-kw-2850-tr-min",
        "moteur-electrique-triphase-55-kw-2850-tr-min",
        "grilles-de-ventilation-plafond",
        "regulateurs",
      ],
    );
    const priceBySlug = new Map(body.products.map((product) => [product.slug, product.price]));
    const drafProduct = body.products.find((product) => product.slug === "ventilateur-axial-draf");
    assert.ok(drafProduct);
    const drafOptionBySlug = new Map(drafProduct.options.map((option) => [option.slug, option]));
    const ysaProduct = body.products.find((product) => product.slug === "ventilateur-axial-ysa");
    assert.ok(ysaProduct);
    const ysaOptionBySlug = new Map(ysaProduct.options.map((option) => [option.slug, option]));
    const ksaProduct = body.products.find((product) => product.slug === "ventilateur-axial-ksa");
    assert.ok(ksaProduct);
    const ksaOptionBySlug = new Map(ksaProduct.options.map((option) => [option.slug, option]));
    const ktaProduct = body.products.find((product) => product.slug === "ventilateur-axial-kta");
    assert.ok(ktaProduct);
    const ktaOptionBySlug = new Map(ktaProduct.options.map((option) => [option.slug, option]));
    const ykaProduct = body.products.find((product) => product.slug === "ventilateur-de-canal-yka");
    assert.ok(ykaProduct);
    const ykaOptionBySlug = new Map(ykaProduct.options.map((option) => [option.slug, option]));

    assert.equal(priceBySlug.get("ventilateurs-axiaux"), "249 €");
    assert.equal(priceBySlug.get("ventilateur-axial-draf"), "92,03 €");
    assert.equal(drafProduct.options.length, 4);
    assert.equal(drafOptionBySlug.get("ventilateur-axial-draf-200").price, "92,03 €");
    assert.equal(drafOptionBySlug.get("ventilateur-axial-draf-350").price, "127,82 €");
    assert.equal(priceBySlug.get("ventilateur-axial-ysa"), "117,60 €");
    assert.equal(ysaProduct.options.length, 20);
    assert.equal(ysaOptionBySlug.get("ventilateur-axial-ysa-250-2m").price, "117,60 €");
    assert.equal(ysaOptionBySlug.get("ventilateur-axial-ysa-400-t").price, "148,27 €");
    assert.equal(ysaOptionBySlug.get("ventilateur-axial-ysa-600-t").price, "214,74 €");
    assert.equal(priceBySlug.get("ventilateur-axial-ksa"), "143,16 €");
    assert.equal(ksaProduct.options.length, 20);
    assert.equal(ksaOptionBySlug.get("ventilateur-axial-ksa-250-2m").price, "143,16 €");
    assert.equal(ksaOptionBySlug.get("ventilateur-axial-ksa-400-t").price, "178,95 €");
    assert.equal(ksaOptionBySlug.get("ventilateur-axial-ksa-600-t").price, "230,08 €");
    assert.equal(priceBySlug.get("ventilateur-axial-kta"), "46,02 €");
    assert.equal(ktaProduct.options.length, 3);
    assert.equal(ktaOptionBySlug.get("ventilateur-axial-kta-160").price, "46,02 €");
    assert.equal(ktaOptionBySlug.get("ventilateur-axial-kta-200").price, "51,13 €");
    assert.equal(ktaOptionBySlug.get("ventilateur-axial-kta-250").price, "56,24 €");
    assert.equal(priceBySlug.get("ventilateur-de-canal-yka"), "76,69 €");
    assert.equal(ykaProduct.options.length, 14);
    assert.equal(ykaOptionBySlug.get("ventilateur-de-canal-yka-100-a").price, "76,69 €");
    assert.equal(ykaOptionBySlug.get("ventilateur-de-canal-yka-150-b").price, "84,36 €");
    assert.equal(ykaOptionBySlug.get("ventilateur-de-canal-yka-315-b").price, "161,06 €");
    assert.equal(priceBySlug.get("moteur-electrique-monophase-11-kw-2800-tr-min"), "95 €");
    assert.equal(
      priceBySlug.get("moteur-electrique-monophase-11-kw-2800-tr-min-carter-en-fonte"),
      "85 €",
    );
    assert.equal(priceBySlug.get("moteur-electrique-monophase-22-kw-2800-tr-min"), "115 €");
    assert.equal(
      priceBySlug.get("moteur-electrique-monophase-22-kw-2800-tr-min-carter-en-fonte"),
      "115 €",
    );
    assert.equal(
      priceBySlug.get(
        "moteur-electrique-monophase-22-kw-2800-tr-min-carter-en-fonte-enroulement-cuivre",
      ),
      "145 €",
    );
    assert.equal(
      priceBySlug.get("moteur-electrique-monophase-22-kw-1430-tr-min-carter-en-fonte"),
      "115 €",
    );
    assert.equal(priceBySlug.get("moteur-electrique-monophase-3-kw-1430-tr-min-en-fonte"), "149 €");
    assert.equal(priceBySlug.get("moteur-electrique-triphase-11-kw-2850-tr-min"), "95 €");
    assert.equal(priceBySlug.get("moteur-electrique-triphase-22-kw-1430-tr-min"), "139 €");
    assert.equal(priceBySlug.get("moteur-electrique-triphase-3-kw-1430-tr-min"), "149 €");
    assert.equal(priceBySlug.get("moteur-electrique-triphase-22-kw-2850-tr-min"), "139 €");
    assert.equal(priceBySlug.get("moteur-electrique-triphase-3-kw-2850-tr-min"), "149 €");
    assert.equal(priceBySlug.get("moteur-electrique-triphase-55-kw-2850-tr-min"), "325 €");
    assert.ok(body.categories.includes("Ventilation industrielle"));
    assert.ok(body.categories.includes("Moteurs électriques 220/380"));
    assert.ok(body.categories.includes("Moteurs électriques triphasés"));
    assert.ok(body.categories.includes("Ventilateurs de canaux"));
    assert.ok(body.categories.includes("Ventilateurs axiaux"));
  });
});

test("normalizeCheckoutItems accepte les options YKA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-de-canal-yka-250-b", quantity: 2 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].product.slug, "ventilateur-de-canal-yka-250-b");
  assert.equal(items[0].product.name, "Ventilateur de canal YKA 250-B");
  assert.equal(items[0].product.amount, 13549);
  assert.equal(items[0].product.price, "135,49 €");
});

test("normalizeCheckoutItems accepte les options DRAF comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-draf-350", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-draf-350");
  assert.equal(items[0].product.name, "Ventilateur axial DRAF 350");
  assert.equal(items[0].product.amount, 12782);
  assert.equal(items[0].product.price, "127,82 €");
});

test("normalizeCheckoutItems accepte les options YSA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-ysa-600-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-ysa-600-t");
  assert.equal(items[0].product.name, "Ventilateur axial YSA 600-T");
  assert.equal(items[0].product.amount, 21474);
  assert.equal(items[0].product.price, "214,74 €");
});

test("normalizeCheckoutItems accepte les options KSA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-ksa-600-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-ksa-600-t");
  assert.equal(items[0].product.name, "Ventilateur axial KSA 600-T");
  assert.equal(items[0].product.amount, 23008);
  assert.equal(items[0].product.price, "230,08 €");
});

test("normalizeCheckoutItems accepte les options KTA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-kta-250", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-kta-250");
  assert.equal(items[0].product.name, "Ventilateur axial KTA 250");
  assert.equal(items[0].product.amount, 5624);
  assert.equal(items[0].product.price, "56,24 €");
});

test("GET /api/auth/me signale auth indisponible sans DATABASE_URL", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      user: null,
      authAvailable: false,
    });
  });
});

test("POST /api/checkout refuse la production sans SITE_URL", async () => {
  await withEnv(
    {
      NODE_ENV: "production",
      SITE_URL: undefined,
      STRIPE_SECRET_KEY: undefined,
    },
    async () => {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/checkout`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://request-origin.example.com",
          },
          body: JSON.stringify({
            items: [{ slug: "ventilateurs-axiaux", quantity: 1 }],
          }),
        });
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.deepEqual(body, { error: missingProductionSiteUrlError });
      });
    },
  );
});

test("POST /api/checkout refuse la production sans base persistante", async () => {
  await withEnv(
    {
      NODE_ENV: "production",
      SITE_URL: "https://shop.example.com",
      STRIPE_SECRET_KEY: undefined,
    },
    async () => {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/checkout`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://shop.example.com",
          },
          body: JSON.stringify({
            items: [{ slug: "ventilateurs-axiaux", quantity: 1 }],
          }),
        });
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.deepEqual(body, { error: missingCheckoutDatabaseError });
      });
    },
  );
});

test("POST /api/admin/login refuse une origine CSRF invalide", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example.com",
        },
        body: JSON.stringify({
          username: "admin",
          password: "wrong",
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 403);
      assert.deepEqual(body, { error: adminCsrfError });
    });
  });
});

test("POST /api/admin/login accepte localhost et atteint la route admin", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:5173",
        },
        body: JSON.stringify({
          username: "admin",
          password: "wrong",
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.notDeepEqual(body, { error: adminCsrfError });
      assert.match(body.error, /ADMIN_PASSWORD/);
    });
  });
});

test("POST /api/admin/login refuse les gros corps JSON standard", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:5173",
        },
        body: JSON.stringify({
          username: "admin",
          password: "x".repeat(70_000),
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 413);
      assert.deepEqual(body, { error: "Requête JSON trop volumineuse." });
    });
  });
});

test("POST /api/admin/products conserve une limite dédiée aux images admin", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:5173",
        },
        body: JSON.stringify({
          imageData: `data:image/png;base64,${"a".repeat(80_000)}`,
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.notDeepEqual(body, { error: "Requête JSON trop volumineuse." });
      assert.match(body.error, /ADMIN_PASSWORD/);
    });
  });
});

test("POST /api/contact ignore les soumissions honeypot", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/contact`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        website: "https://spam.example.com",
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
  });
});
