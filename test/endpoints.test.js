import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../server/app.js";

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
    assert.ok(response.headers.get("content-security-policy"));
  });
});

test("GET /api/products retourne les produits publics par défaut sans Postgres", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(body.products), true);
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
