import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../server/app.js";
import { missingProductionSiteUrlError } from "../server/config.js";
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
    assert.equal(body.products.length, 4);
    assert.deepEqual(
      body.products.map((product) => product.slug),
      [
        "ventilateurs-axiaux",
        "ventilateurs-de-canaux",
        "grilles-de-ventilation-plafond",
        "regulateurs",
      ],
    );
    assert.equal(body.products[0].price, "249 €");
    assert.ok(body.categories.includes("Ventilation industrielle"));
    assert.ok(body.categories.includes("Ventilateurs axiaux"));
  });
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
