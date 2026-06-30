import assert from "node:assert/strict";
import test from "node:test";

import {
  adminCsrfError,
  adminCsrfProtection,
  clientCsrfError,
  clientCsrfProtection,
  isAllowedAdminRequestOrigin,
  isAllowedClientRequestOrigin,
} from "../server/security/csrf.js";

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

function createMockRequest({ method = "POST", headers = {} } = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    method,
    protocol: "http",
    get(name) {
      return normalizedHeaders[name.toLowerCase()] || "";
    },
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("CSRF admin accepte localhost hors production", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const request = createMockRequest({
      headers: {
        origin: "http://localhost:5173",
      },
    });

    assert.equal(isAllowedAdminRequestOrigin(request), true);
  });
});

test("CSRF admin accepte le Referer localhost hors production", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const request = createMockRequest({
      headers: {
        referer: "http://127.0.0.1:10000/admin?tab=products",
      },
    });

    assert.equal(isAllowedAdminRequestOrigin(request), true);
  });
});

test("CSRF admin refuse les origines distantes hors production", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const request = createMockRequest({
      headers: {
        origin: "https://attacker.example.com",
      },
    });

    assert.equal(isAllowedAdminRequestOrigin(request), false);
  });
});

test("CSRF admin accepte uniquement SITE_URL en production", async () => {
  await withEnv(
    { NODE_ENV: "production", SITE_URL: "https://shop.example.com///" },
    async () => {
      const acceptedRequest = createMockRequest({
        headers: {
          referer: "https://shop.example.com/admin/products",
        },
      });
      const rejectedRequest = createMockRequest({
        headers: {
          origin: "https://localhost:5173",
        },
      });

      assert.equal(isAllowedAdminRequestOrigin(acceptedRequest), true);
      assert.equal(isAllowedAdminRequestOrigin(rejectedRequest), false);
    },
  );
});

test("CSRF admin refuse les mutations sans Origin ni Referer", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const response = createMockResponse();
    let nextCalled = false;

    adminCsrfProtection(createMockRequest(), response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { error: adminCsrfError });
  });
});

test("CSRF admin ignore les méthodes non mutantes", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const response = createMockResponse();
    let nextCalled = false;

    adminCsrfProtection(createMockRequest({ method: "GET" }), response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, null);
  });
});

test("CSRF client accepte l'origine de la requête hors production", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const request = createMockRequest({
      headers: {
        host: "127.0.0.1:10000",
        origin: "http://127.0.0.1:10000",
      },
    });

    assert.equal(isAllowedClientRequestOrigin(request), true);
  });
});

test("CSRF client accepte localhost hors production", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const request = createMockRequest({
      headers: {
        host: "127.0.0.1:10000",
        origin: "http://localhost:5173",
      },
    });

    assert.equal(isAllowedClientRequestOrigin(request), true);
  });
});

test("CSRF client refuse les origines distantes hors production", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const request = createMockRequest({
      headers: {
        host: "127.0.0.1:10000",
        origin: "https://attacker.example.com",
      },
    });

    assert.equal(isAllowedClientRequestOrigin(request), false);
  });
});

test("CSRF client accepte uniquement SITE_URL en production", async () => {
  await withEnv(
    { NODE_ENV: "production", SITE_URL: "https://shop.example.com///" },
    async () => {
      const acceptedRequest = createMockRequest({
        headers: {
          host: "internal.example.net",
          referer: "https://shop.example.com/boutique",
        },
      });
      const rejectedRequest = createMockRequest({
        headers: {
          host: "shop.example.com",
          origin: "https://attacker.example.com",
        },
      });

      assert.equal(isAllowedClientRequestOrigin(acceptedRequest), true);
      assert.equal(isAllowedClientRequestOrigin(rejectedRequest), false);
    },
  );
});

test("CSRF client refuse les mutations sans Origin ni Referer", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const response = createMockResponse();
    let nextCalled = false;

    clientCsrfProtection(createMockRequest(), response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { error: clientCsrfError });
  });
});

test("CSRF client ignore les méthodes non mutantes", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const response = createMockResponse();
    let nextCalled = false;

    clientCsrfProtection(createMockRequest({ method: "GET" }), response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, null);
  });
});
