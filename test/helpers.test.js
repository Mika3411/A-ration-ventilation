import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProductionConfiguration,
  getProductionConfigurationError,
  missingProductionSiteUrlError,
} from "../server/config.js";
import {
  cleanMessage,
  cleanSingleLine,
  escapeHtml,
  formatEuroAmount,
  getRequestOrigin,
  isValidEmail,
  normalizeEmail,
  slugify,
} from "../server/helpers.js";
import { normalizeMemberInput } from "../server/members/service.js";
import { normalizeCategoryInput, normalizeProductInput } from "../server/products/service.js";

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

function createMockRequest(headers = {}, protocol = "http") {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    protocol,
    get(name) {
      return normalizedHeaders[name.toLowerCase()] || "";
    },
  };
}

test("slugify normalise les accents, espaces et ponctuations", () => {
  assert.equal(slugify(" Ventilateurs axiaux Ø 400 ! "), "ventilateurs-axiaux-400");
  assert.equal(slugify("éèà / Produit spécial"), "eea-produit-special");
  assert.equal(slugify("!!!"), "produit");
});

test("getRequestOrigin privilégie SITE_URL et normalise la fin d'URL", async () => {
  await withEnv(
    { NODE_ENV: "production", SITE_URL: " https://shop.example.com/// " },
    async () => {
      const request = createMockRequest({
        origin: "https://request.example.com",
        host: "request.example.com",
      });

      assert.equal(getRequestOrigin(request), "https://shop.example.com");
      assert.equal(getProductionConfigurationError(), "");
      assert.doesNotThrow(() => assertProductionConfiguration());
    },
  );
});

test("getRequestOrigin refuse le fallback Host en production sans SITE_URL", async () => {
  await withEnv({ NODE_ENV: "production", SITE_URL: "   " }, async () => {
    const request = createMockRequest(
      {
        origin: "https://request.example.com",
        "x-forwarded-proto": "https",
        host: "request.example.com",
      },
      "http",
    );

    assert.equal(getRequestOrigin(request), "");
    assert.equal(getProductionConfigurationError(), missingProductionSiteUrlError);
    assert.throws(() => assertProductionConfiguration(), /SITE_URL/);
  });
});

test("getRequestOrigin garde le fallback requête hors production", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    const requestWithOrigin = createMockRequest({
      origin: "https://preview.example.com/",
      host: "localhost:10000",
    });
    const requestWithHost = createMockRequest(
      {
        "x-forwarded-proto": "https",
        host: "localhost:10000",
      },
      "http",
    );

    assert.equal(getRequestOrigin(requestWithOrigin), "https://preview.example.com");
    assert.equal(getRequestOrigin(requestWithHost), "https://localhost:10000");
  });
});

test("validation et normalisation email", () => {
  assert.equal(normalizeEmail("  Client@Example.COM  "), "client@example.com");
  assert.equal(isValidEmail("client@example.com"), true);
  assert.equal(isValidEmail("client@example"), false);
  assert.equal(isValidEmail("client example.com"), false);
});

test("nettoyage des champs utilisateur", () => {
  assert.equal(cleanSingleLine("  Jean\n  Dupont\tSARL  ", 20), "Jean Dupont SARL");
  assert.equal(cleanSingleLine(42, 20), "");
  assert.equal(cleanSingleLine("abcdefgh", 4), "abcd");
  assert.equal(cleanMessage("Bonjour\r\nProjet ventilation  ", 100), "Bonjour\nProjet ventilation");
  assert.equal(cleanMessage("abcdef", 3), "abc");
  assert.equal(escapeHtml(`<b class="x">A&B</b>`), "&lt;b class=&quot;x&quot;&gt;A&amp;B&lt;/b&gt;");
});

test("formatEuroAmount formate les euros sans arrondir les centimes", () => {
  assert.equal(formatEuroAmount(24900), "249 €");
  assert.equal(formatEuroAmount(123456), "1 234,56 €");
});

test("normalizeProductInput nettoie et valide un produit admin", () => {
  const product = normalizeProductInput({
    name: "  Ventilateur mural  ",
    category: "  Extraction  ",
    description: " Ligne 1\r\nLigne 2 ",
    amount: "12900",
    imageKey: "axialFan",
    imageUrl: " https://example.com/fan.webp ",
    imageData: "data:image/png;base64,aGVsbG8=",
    options: [
      {
        label: " 200 ",
        amount: "9203",
        bgn: " 180,00 BGN ",
        description: " Modèle compact ",
        value: "diametre-200",
      },
      { label: "250", amount: "10226" },
      { label: "", amount: "" },
    ],
    featured: true,
    active: false,
    sortOrder: "30",
  });

  assert.deepEqual(product, {
    name: "Ventilateur mural",
    category: "Extraction",
    description: "Ligne 1\nLigne 2",
    amount: 12900,
    options: [
      {
        label: "200",
        value: "diametre-200",
        slug: "ventilateur-mural-200",
        amount: 9203,
        price: "92,03 €",
        bgn: "180,00 BGN",
        description: "Modèle compact",
      },
      {
        label: "250",
        value: "250",
        slug: "ventilateur-mural-250",
        amount: 10226,
        price: "102,26 €",
        bgn: "",
        description: "",
      },
    ],
    imageKey: "axialFan",
    imageUrl: "https://example.com/fan.webp",
    imageData: "data:image/png;base64,aGVsbG8=",
    featured: true,
    active: false,
    sortOrder: 30,
  });
});

test("normalizeProductInput rejette les entrées invalides", () => {
  assert.throws(
    () => normalizeProductInput({ category: "Extraction", amount: "1000" }),
    /nom du produit/i,
  );
  assert.throws(
    () => normalizeProductInput({ name: "Fan", category: "Extraction", amount: "-1" }),
    /prix/i,
  );
  assert.throws(
    () =>
      normalizeProductInput({
        name: "Fan",
        category: "Extraction",
        amount: "1000",
        imageUrl: "http://example.com/fan.jpg",
      }),
    /https:\/\//i,
  );
  assert.throws(
    () =>
      normalizeProductInput({
        name: "Fan",
        category: "Extraction",
        amount: "1000",
        imageUrl: "ftp://example.com/fan.jpg",
      }),
    /URL de l'image/i,
  );
  assert.throws(
    () =>
      normalizeProductInput({
        name: "Fan",
        category: "Extraction",
        amount: "1000",
        imageData: "data:image/svg+xml;base64,PHN2Zy8+",
      }),
    /PNG, JPG, WebP ou GIF/i,
  );
  assert.throws(
    () =>
      normalizeProductInput({
        name: "Fan",
        category: "Extraction",
        amount: "1000",
        imageData: `data:image/png;base64,${"a".repeat(1_500_001)}`,
      }),
    /1 Mo/i,
  );
  assert.throws(
    () =>
      normalizeProductInput({
        name: "Fan",
        category: "Extraction",
        amount: "1000",
        options: [{ amount: "1200" }],
      }),
    /libellé de chaque variante/i,
  );
  assert.throws(
    () =>
      normalizeProductInput({
        name: "Fan",
        category: "Extraction",
        amount: "1000",
        options: [{ label: "200", amount: "-1" }],
      }),
    /prix de chaque variante/i,
  );
});

test("normalizeCategoryInput nettoie et valide une catégorie", () => {
  assert.deepEqual(normalizeCategoryInput({ name: "  Ventilation spéciale  " }), {
    name: "Ventilation spéciale",
  });
  assert.deepEqual(normalizeCategoryInput({ category: "  Extraction cuisine\npro  " }), {
    name: "Extraction cuisine pro",
  });
  assert.throws(() => normalizeCategoryInput({ name: "   " }), /nom de la catégorie/i);
});

test("normalizeMemberInput nettoie et valide un membre", () => {
  assert.deepEqual(
    normalizeMemberInput({
      firstName: "  Marie ",
      lastName: " Martin\nDurand ",
      company: " Atelier Ventilation ",
      phone: " 01 02 03 04 05 ",
      email: "  MARIE@example.COM ",
    }),
    {
      firstName: "Marie",
      lastName: "Martin Durand",
      company: "Atelier Ventilation",
      phone: "01 02 03 04 05",
      email: "marie@example.com",
    },
  );
});

test("normalizeMemberInput rejette les membres invalides", () => {
  assert.throws(
    () => normalizeMemberInput({ lastName: "Martin", email: "marie@example.com" }),
    /prénom/i,
  );
  assert.throws(
    () => normalizeMemberInput({ firstName: "Marie", email: "marie@example.com" }),
    /nom/i,
  );
  assert.throws(
    () => normalizeMemberInput({ firstName: "Marie", lastName: "Martin", email: "marie" }),
    /email valide/i,
  );
});
