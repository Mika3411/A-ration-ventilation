import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../server/app.js";
import { defaultShopProducts } from "../server/products/defaultProducts.js";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getPublicProducts,
  normalizeCheckoutItems,
  normalizeProductInput,
} from "../server/products/service.js";
import {
  createPromoCode,
  deletePromoCode,
  normalizePromoCodeInput,
  publicPromoCodeValidationError,
} from "../server/promoCodes/service.js";
import { adminCsrfError, clientCsrfError } from "../server/security/csrf.js";
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

function validatePromoCode(baseUrl, code, forwardedFor) {
  return fetch(`${baseUrl}/api/promo-codes/validate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:5173",
      "x-forwarded-for": forwardedFor,
    },
    body: JSON.stringify({
      code,
      items: [{ slug: "ventilateurs-axiaux", quantity: 1 }],
    }),
  });
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
    const productSlugs = body.products.map((product) => product.slug);
    const expectedPublicProductCount = defaultShopProducts.filter(
      (product) => product.active !== false,
    ).length;

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(body.products), true);
    assert.equal(Array.isArray(body.categories), true);
    assert.equal(body.products.length, expectedPublicProductCount);
    assert.equal(new Set(productSlugs).size, productSlugs.length);
    assert.ok(productSlugs.includes("ventilateurs-axiaux"));
    assert.ok(productSlugs.includes("ventilateur-de-canal-yka"));
    assert.ok(productSlugs.includes("pompe-a-eau-peripherique-gmax-qb80"));
    assert.ok(productSlugs.includes("panneau-protection-pompes-eau-triphasees-gmax-c3-mp1-075-4"));
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
    const dtaProduct = body.products.find((product) => product.slug === "ventilateur-axial-dta");
    assert.ok(dtaProduct);
    const dtaOptionBySlug = new Map(dtaProduct.options.map((option) => [option.slug, option]));
    const axialFan8kaProduct = body.products.find((product) => product.slug === "ventilateur-axial-8ka");
    assert.ok(axialFan8kaProduct);
    const axialFan8kaOptionBySlug = new Map(
      axialFan8kaProduct.options.map((option) => [option.slug, option]),
    );
    const axialFan4kaProduct = body.products.find((product) => product.slug === "ventilateur-axial-4ka");
    assert.ok(axialFan4kaProduct);
    const axialFan4kaOptionBySlug = new Map(
      axialFan4kaProduct.options.map((option) => [option.slug, option]),
    );
    const ykaProduct = body.products.find((product) => product.slug === "ventilateur-de-canal-yka");
    assert.ok(ykaProduct);
    const ykaOptionBySlug = new Map(ykaProduct.options.map((option) => [option.slug, option]));
    const drpktProduct = body.products.find(
      (product) => product.slug === "ventilateur-axial-conduit-drpkt",
    );
    assert.ok(drpktProduct);
    const drpktOptionBySlug = new Map(drpktProduct.options.map((option) => [option.slug, option]));
    const fdkfProduct = body.products.find(
      (product) => product.slug === "ventilateur-conduit-rectangulaire-fdkf",
    );
    assert.ok(fdkfProduct);
    const fdkfOptionBySlug = new Map(fdkfProduct.options.map((option) => [option.slug, option]));
    const pakfProduct = body.products.find(
      (product) => product.slug === "ventilateur-de-canal-pakf",
    );
    assert.ok(pakfProduct);
    const pakfOptionBySlug = new Map(pakfProduct.options.map((option) => [option.slug, option]));
    const lktProduct = body.products.find(
      (product) => product.slug === "ventilateur-conduit-rond-lkt",
    );
    assert.ok(lktProduct);
    const lktOptionBySlug = new Map(lktProduct.options.map((option) => [option.slug, option]));
    const dtyProduct = body.products.find(
      (product) => product.slug === "ventilateur-salle-de-bains-dty",
    );
    assert.ok(dtyProduct);
    const dtyOptionBySlug = new Map(dtyProduct.options.map((option) => [option.slug, option]));
    const apktProduct = body.products.find(
      (product) => product.slug === "ventilateur-salle-de-bains-apkt",
    );
    assert.ok(apktProduct);
    const apktOptionBySlug = new Map(apktProduct.options.map((option) => [option.slug, option]));
    const autoProduct = body.products.find(
      (product) => product.slug === "ventilateur-salle-de-bains-auto",
    );
    assert.ok(autoProduct);
    const autoOptionBySlug = new Map(autoProduct.options.map((option) => [option.slug, option]));
    const agfProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-agf",
    );
    assert.ok(agfProduct);
    const agfOptionBySlug = new Map(agfProduct.options.map((option) => [option.slug, option]));
    const drProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-dr",
    );
    assert.ok(drProduct);
    const drOptionBySlug = new Map(drProduct.options.map((option) => [option.slug, option]));
    const fagsMProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-fags-m",
    );
    assert.ok(fagsMProduct);
    const fagsMOptionBySlug = new Map(fagsMProduct.options.map((option) => [option.slug, option]));
    const fboProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-fbo",
    );
    assert.ok(fboProduct);
    const fboOptionBySlug = new Map(fboProduct.options.map((option) => [option.slug, option]));
    const fbkProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-fbk",
    );
    assert.ok(fbkProduct);
    const fbkOptionBySlug = new Map(fbkProduct.options.map((option) => [option.slug, option]));
    const fobrProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-fobr",
    );
    assert.ok(fobrProduct);
    const fobrOptionBySlug = new Map(fobrProduct.options.map((option) => [option.slug, option]));
    const fbsyProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-fbsy",
    );
    assert.ok(fbsyProduct);
    const fbsyOptionBySlug = new Map(fbsyProduct.options.map((option) => [option.slug, option]));
    const kagsProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-kags",
    );
    assert.ok(kagsProduct);
    const kagsOptionBySlug = new Map(kagsProduct.options.map((option) => [option.slug, option]));
    const ktsObsProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-kts-obs",
    );
    assert.ok(ktsObsProduct);
    const ktsObsOptionBySlug = new Map(
      ktsObsProduct.options.map((option) => [option.slug, option]),
    );
    const ocesProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-oces",
    );
    assert.ok(ocesProduct);
    const ocesOptionBySlug = new Map(ocesProduct.options.map((option) => [option.slug, option]));
    const obra140Product = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-obra-140",
    );
    assert.ok(obra140Product);
    const obra140OptionBySlug = new Map(
      obra140Product.options.map((option) => [option.slug, option]),
    );
    const obra200Product = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-obra-200",
    );
    assert.ok(obra200Product);
    const obra200OptionBySlug = new Map(
      obra200Product.options.map((option) => [option.slug, option]),
    );
    const obra260Product = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-obra-260",
    );
    assert.ok(obra260Product);
    const obra260OptionBySlug = new Map(
      obra260Product.options.map((option) => [option.slug, option]),
    );
    const pobraProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-pobra",
    );
    assert.ok(pobraProduct);
    const pobraOptionBySlug = new Map(
      pobraProduct.options.map((option) => [option.slug, option]),
    );
    const psekProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-psek",
    );
    assert.ok(psekProduct);
    const psekOptionBySlug = new Map(
      psekProduct.options.map((option) => [option.slug, option]),
    );
    const turboSeriesProduct = body.products.find(
      (product) => product.slug === "ventilateur-centrifuge-turbo-series",
    );
    assert.ok(turboSeriesProduct);
    const turboSeriesOptionBySlug = new Map(
      turboSeriesProduct.options.map((option) => [option.slug, option]),
    );
    const facfProduct = body.products.find((product) => product.slug === "ventilateur-axial-toiture-facf");
    assert.ok(facfProduct);
    const facfOptionBySlug = new Map(facfProduct.options.map((option) => [option.slug, option]));
    const fcfProduct = body.products.find((product) => product.slug === "ventilateur-toiture-fcf");
    assert.ok(fcfProduct);
    const fcfOptionBySlug = new Map(fcfProduct.options.map((option) => [option.slug, option]));
    const fkcfProduct = body.products.find((product) => product.slug === "ventilateur-toiture-fkcf");
    assert.ok(fkcfProduct);
    const fkcfOptionBySlug = new Map(fkcfProduct.options.map((option) => [option.slug, option]));
    const dbtaProduct = body.products.find(
      (product) => product.slug === "ventilateur-salle-de-bains-d-bta",
    );
    assert.ok(dbtaProduct);
    const dbtaOptionBySlug = new Map(dbtaProduct.options.map((option) => [option.slug, option]));
    const spiroDuctProduct = body.products.find(
      (product) => product.slug === "conduit-rond-spiro",
    );
    assert.ok(spiroDuctProduct);
    const spiroDuctOptionBySlug = new Map(
      spiroDuctProduct.options.map((option) => [option.slug, option]),
    );
    const spiroDuctElbow90Product = body.products.find(
      (product) => product.slug === "coude-90-conduit-spiro",
    );
    assert.ok(spiroDuctElbow90Product);
    const spiroDuctElbow90OptionBySlug = new Map(
      spiroDuctElbow90Product.options.map((option) => [option.slug, option]),
    );
    const spiroDuctTeeProduct = body.products.find(
      (product) => product.slug === "te-conduit-rond-spiro",
    );
    assert.ok(spiroDuctTeeProduct);
    const spiroDuctTeeOptionBySlug = new Map(
      spiroDuctTeeProduct.options.map((option) => [option.slug, option]),
    );
    const dhaSpeedControllerProduct = body.products.find(
      (product) => product.slug === "regulateur-vitesse-dha",
    );
    assert.ok(dhaSpeedControllerProduct);
    const dhaSpeedControllerOptionBySlug = new Map(
      dhaSpeedControllerProduct.options.map((option) => [option.slug, option]),
    );
    const mnaSpeedControllerProduct = body.products.find(
      (product) => product.slug === "regulateur-vitesse-mna",
    );
    assert.ok(mnaSpeedControllerProduct);
    const mnaSpeedControllerOptionBySlug = new Map(
      mnaSpeedControllerProduct.options.map((option) => [option.slug, option]),
    );

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
    assert.equal(priceBySlug.get("ventilateur-axial-dta"), "40,90 €");
    assert.equal(dtaProduct.options.length, 4);
    assert.equal(dtaOptionBySlug.get("ventilateur-axial-dta-200").price, "40,90 €");
    assert.equal(dtaOptionBySlug.get("ventilateur-axial-dta-250").price, "46,02 €");
    assert.equal(dtaOptionBySlug.get("ventilateur-axial-dta-350").price, "58,80 €");
    assert.equal(priceBySlug.get("ventilateur-axial-8ka"), "176,40 €");
    assert.equal(axialFan8kaProduct.options.length, 16);
    assert.equal(axialFan8kaOptionBySlug.get("ventilateur-axial-8ka-300-t").price, "176,40 €");
    assert.equal(axialFan8kaOptionBySlug.get("ventilateur-axial-8ka-450-m").price, "255,65 €");
    assert.equal(axialFan8kaOptionBySlug.get("ventilateur-axial-8ka-800-t").price, "858,97 €");
    assert.equal(priceBySlug.get("ventilateur-axial-4ka"), "255,65 €");
    assert.equal(axialFan4kaProduct.options.length, 21);
    assert.equal(axialFan4kaOptionBySlug.get("ventilateur-axial-4ka-300-t").price, "255,65 €");
    assert.equal(axialFan4kaOptionBySlug.get("ventilateur-axial-4ka-400-m").price, "319,56 €");
    assert.equal(axialFan4kaOptionBySlug.get("ventilateur-axial-4ka-450-t").price, "311,89 €");
    assert.equal(axialFan4kaOptionBySlug.get("ventilateur-axial-4ka-500-t").price, "373,24 €");
    assert.equal(axialFan4kaOptionBySlug.get("ventilateur-axial-4ka-700-m").price, "654,45 €");
    assert.equal(axialFan4kaOptionBySlug.get("ventilateur-axial-4ka-1000-t").price, "1283,34 €");
    assert.equal(priceBySlug.get("ventilateur-de-canal-yka"), "76,69 €");
    assert.equal(ykaProduct.options.length, 14);
    assert.equal(ykaOptionBySlug.get("ventilateur-de-canal-yka-100-a").price, "76,69 €");
    assert.equal(ykaOptionBySlug.get("ventilateur-de-canal-yka-150-b").price, "84,36 €");
    assert.equal(ykaOptionBySlug.get("ventilateur-de-canal-yka-315-b").price, "161,06 €");
    assert.equal(priceBySlug.get("ventilateur-axial-conduit-drpkt"), "81,81 €");
    assert.equal(drpktProduct.options.length, 6);
    assert.equal(drpktOptionBySlug.get("ventilateur-axial-conduit-drpkt-150").price, "81,81 €");
    assert.equal(drpktOptionBySlug.get("ventilateur-axial-conduit-drpkt-250").price, "117,60 €");
    assert.equal(drpktOptionBySlug.get("ventilateur-axial-conduit-drpkt-350").price, "138,05 €");
    assert.equal(priceBySlug.get("ventilateur-conduit-rectangulaire-fdkf"), "158,50 €");
    assert.equal(fdkfProduct.options.length, 11);
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-30-15").price, "158,50 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-40-20-a").price, "176,40 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-40-20-b").price, "181,51 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-50-25").price, "201,96 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-60-30").price, "304,22 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-60-35-a").price, "327,23 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-60-35-b").price, "342,57 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-70-40-a").price, "483,17 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-70-40-b").price, "536,86 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-80-50").price, "700,47 €");
    assert.equal(fdkfOptionBySlug.get("ventilateur-conduit-rectangulaire-fdkf-100-50").price, "792,50 €");
    assert.equal(priceBySlug.get("ventilateur-de-canal-pakf"), "264,85 €");
    assert.equal(pakfProduct.options.length, 4);
    assert.equal(pakfOptionBySlug.get("ventilateur-de-canal-pakf-400").price, "264,85 €");
    assert.equal(pakfOptionBySlug.get("ventilateur-de-canal-pakf-450").price, "288,88 €");
    assert.equal(pakfOptionBySlug.get("ventilateur-de-canal-pakf-500").price, "299,11 €");
    assert.equal(pakfOptionBySlug.get("ventilateur-de-canal-pakf-600").price, "309,33 €");
    assert.equal(priceBySlug.get("ventilateur-conduit-rond-lkt"), "76,69 €");
    assert.equal(lktProduct.options.length, 9);
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-100-b").price, "76,69 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-125-b").price, "81,81 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-160-b").price, "89,48 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-200-b").price, "115,04 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-250-b").price, "135,49 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-315-b").price, "161,06 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-315-c").price, "196,85 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-355-b").price, "240,31 €");
    assert.equal(lktOptionBySlug.get("ventilateur-conduit-rond-lkt-355-c").price, "270,98 €");
    assert.equal(priceBySlug.get("ventilateur-salle-de-bains-dty"), "15,34 €");
    assert.equal(dtyProduct.options.length, 4);
    assert.equal(dtyOptionBySlug.get("ventilateur-salle-de-bains-dty-100").price, "15,34 €");
    assert.equal(dtyOptionBySlug.get("ventilateur-salle-de-bains-dty-120").price, "17,90 €");
    assert.equal(dtyOptionBySlug.get("ventilateur-salle-de-bains-dty-150").price, "20,45 €");
    assert.equal(dtyOptionBySlug.get("ventilateur-salle-de-bains-dty-200").price, "30,68 €");
    assert.equal(priceBySlug.get("ventilateur-salle-de-bains-apkt"), "15,34 €");
    assert.equal(apktProduct.options.length, 4);
    assert.equal(apktOptionBySlug.get("ventilateur-salle-de-bains-apkt-100").price, "15,34 €");
    assert.equal(apktOptionBySlug.get("ventilateur-salle-de-bains-apkt-120").price, "17,90 €");
    assert.equal(apktOptionBySlug.get("ventilateur-salle-de-bains-apkt-150").price, "20,45 €");
    assert.equal(apktOptionBySlug.get("ventilateur-salle-de-bains-apkt-200").price, "30,68 €");
    assert.equal(priceBySlug.get("ventilateur-salle-de-bains-auto"), "10,74 €");
    assert.equal(autoProduct.options.length, 3);
    assert.equal(autoOptionBySlug.get("ventilateur-salle-de-bains-auto-100").price, "10,74 €");
    assert.equal(autoOptionBySlug.get("ventilateur-salle-de-bains-auto-125").price, "12,27 €");
    assert.equal(autoOptionBySlug.get("ventilateur-salle-de-bains-auto-150").price, "14,83 €");
    assert.equal(priceBySlug.get("ventilateur-industriel-sur-pied-fsv-750-a"), "250,53 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-agf"), "76,69 €");
    assert.equal(agfProduct.options.length, 5);
    assert.equal(agfOptionBySlug.get("ventilateur-centrifuge-agf-120e").price, "76,69 €");
    assert.equal(agfOptionBySlug.get("ventilateur-centrifuge-agf-140e").price, "86,92 €");
    assert.equal(agfOptionBySlug.get("ventilateur-centrifuge-agf-140er").price, "94,59 €");
    assert.equal(agfOptionBySlug.get("ventilateur-centrifuge-agf-160e").price, "99,70 €");
    assert.equal(agfOptionBySlug.get("ventilateur-centrifuge-agf-160er").price, "104,81 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-dr"), "66,47 €");
    assert.equal(drProduct.options.length, 6);
    assert.equal(drOptionBySlug.get("ventilateur-centrifuge-dr-drobs-125-60").price, "66,47 €");
    assert.equal(drOptionBySlug.get("ventilateur-centrifuge-dr-drtos-140-60").price, "74,14 €");
    assert.equal(drOptionBySlug.get("ventilateur-centrifuge-dr-drbtms-140-60").price, "79,25 €");
    assert.equal(drOptionBySlug.get("ventilateur-centrifuge-dr-drbtms-160-60").price, "81,81 €");
    assert.equal(drOptionBySlug.get("ventilateur-centrifuge-dr-drbtms-180-60").price, "92,03 €");
    assert.equal(drOptionBySlug.get("ventilateur-centrifuge-dr-drbtms-180-70").price, "97,15 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-fags-m"), "184,07 €");
    assert.equal(fagsMProduct.options.length, 9);
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m1").price, "184,07 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m2").price, "194,29 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m3").price, "230,08 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m4-225-90").price, "301,66 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m4-225-102").price, "319,56 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m5-250-112").price, "378,36 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m5-250-118").price, "414,15 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m6-268-112").price, "472,94 €");
    assert.equal(fagsMOptionBySlug.get("ventilateur-centrifuge-fags-m-m6-268-118").price, "501,07 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-fbo"), "434,60 €");
    assert.equal(fboProduct.options.length, 15);
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-0-5-t").price, "434,60 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-1-t").price, "562,42 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-1-5-t").price, "639,11 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-2-t").price, "741,37 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-3-t").price, "843,63 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-4-t").price, "894,76 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-5-5-t").price, "997,02 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-7-5-t").price, "1237,33 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-10-t").price, "1508,31 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-0-5-m").price, "434,60 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-1-m").price, "562,42 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-1-5-m").price, "639,11 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-2-m").price, "741,37 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-3-m").price, "843,63 €");
    assert.equal(fboOptionBySlug.get("ventilateur-centrifuge-fbo-4-m").price, "894,76 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-fbk"), "434,60 €");
    assert.equal(fbkProduct.options.length, 15);
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-0-5-t").price, "434,60 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-1-t").price, "562,42 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-1-5-t").price, "639,11 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-2-t").price, "741,37 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-3-t").price, "843,63 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-4-t").price, "894,76 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-5-5-t").price, "997,02 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-7-5-t").price, "1237,33 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-10-t").price, "1508,31 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-0-5-m").price, "434,60 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-1-m").price, "562,42 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-1-5-m").price, "639,11 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-2-m").price, "741,37 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-3-m").price, "843,63 €");
    assert.equal(fbkOptionBySlug.get("ventilateur-centrifuge-fbk-4-m").price, "894,76 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-fobr"), "199,40 €");
    assert.equal(fobrProduct.options.length, 4);
    assert.equal(fobrOptionBySlug.get("ventilateur-centrifuge-fobr-260-2-t").price, "199,40 €");
    assert.equal(fobrOptionBySlug.get("ventilateur-centrifuge-fobr-260-4-t").price, "230,08 €");
    assert.equal(fobrOptionBySlug.get("ventilateur-centrifuge-fobr-260-2-m").price, "230,08 €");
    assert.equal(fobrOptionBySlug.get("ventilateur-centrifuge-fobr-260-4-m").price, "250,53 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-fbsy"), "434,60 €");
    assert.equal(fbsyProduct.options.length, 15);
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-0-5-t").price, "434,60 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-1-t").price, "593,10 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-1-5-t").price, "639,11 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-2-t").price, "741,37 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-3-t").price, "843,63 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-4-t").price, "904,99 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-5-5-t").price, "1058,37 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-7-5-t").price, "1360,04 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-10-t").price, "1656,59 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-0-5-m").price, "434,60 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-1-m").price, "593,10 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-1-5-m").price, "639,11 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-2-m").price, "741,37 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-3-m").price, "843,63 €");
    assert.equal(fbsyOptionBySlug.get("ventilateur-centrifuge-fbsy-4-m").price, "894,76 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-kags"), "53,69 €");
    assert.equal(kagsProduct.options.length, 4);
    assert.equal(kagsOptionBySlug.get("ventilateur-centrifuge-kags-kags-125-60").price, "53,69 €");
    assert.equal(kagsOptionBySlug.get("ventilateur-centrifuge-kags-bags-140-60").price, "61,36 €");
    assert.equal(kagsOptionBySlug.get("ventilateur-centrifuge-kags-bags-160-60").price, "69,02 €");
    assert.equal(kagsOptionBySlug.get("ventilateur-centrifuge-kags-bags-180-70").price, "76,69 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-kts-obs"), "53,69 €");
    assert.equal(ktsObsProduct.options.length, 6);
    assert.equal(ktsObsOptionBySlug.get("ventilateur-centrifuge-kts-obs-kts-90-60").price, "53,69 €");
    assert.equal(ktsObsOptionBySlug.get("ventilateur-centrifuge-kts-obs-obs-125-60").price, "61,36 €");
    assert.equal(ktsObsOptionBySlug.get("ventilateur-centrifuge-kts-obs-tos-140-60").price, "63,91 €");
    assert.equal(ktsObsOptionBySlug.get("ventilateur-centrifuge-kts-obs-btms-140-60").price, "69,02 €");
    assert.equal(ktsObsOptionBySlug.get("ventilateur-centrifuge-kts-obs-btms-160-60").price, "76,69 €");
    assert.equal(ktsObsOptionBySlug.get("ventilateur-centrifuge-kts-obs-btms-180-70").price, "97,15 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-oces"), "199,40 €");
    assert.equal(ocesProduct.options.length, 2);
    assert.equal(ocesOptionBySlug.get("ventilateur-centrifuge-oces-m").price, "199,40 €");
    assert.equal(ocesOptionBySlug.get("ventilateur-centrifuge-oces-t").price, "199,40 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-obra-140"), "158,50 €");
    assert.equal(obra140Product.options.length, 4);
    assert.equal(obra140OptionBySlug.get("ventilateur-centrifuge-obra-140-2m").price, "158,50 €");
    assert.equal(obra140OptionBySlug.get("ventilateur-centrifuge-obra-140-4m").price, "158,50 €");
    assert.equal(obra140OptionBySlug.get("ventilateur-centrifuge-obra-140-2t").price, "158,50 €");
    assert.equal(obra140OptionBySlug.get("ventilateur-centrifuge-obra-140-4t").price, "158,50 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-obra-200"), "178,95 €");
    assert.equal(obra200Product.options.length, 4);
    assert.equal(obra200OptionBySlug.get("ventilateur-centrifuge-obra-200-2m").price, "178,95 €");
    assert.equal(obra200OptionBySlug.get("ventilateur-centrifuge-obra-200-4m").price, "178,95 €");
    assert.equal(obra200OptionBySlug.get("ventilateur-centrifuge-obra-200-2t").price, "178,95 €");
    assert.equal(obra200OptionBySlug.get("ventilateur-centrifuge-obra-200-4t").price, "178,95 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-obra-260"), "230,08 €");
    assert.equal(obra260Product.options.length, 4);
    assert.equal(obra260OptionBySlug.get("ventilateur-centrifuge-obra-260-4m").price, "230,08 €");
    assert.equal(obra260OptionBySlug.get("ventilateur-centrifuge-obra-260-4t").price, "230,08 €");
    assert.equal(obra260OptionBySlug.get("ventilateur-centrifuge-obra-260-2m").price, "301,66 €");
    assert.equal(obra260OptionBySlug.get("ventilateur-centrifuge-obra-260-2t").price, "301,66 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-pobra"), "150,83 €");
    assert.equal(pobraProduct.options.length, 4);
    assert.equal(pobraOptionBySlug.get("ventilateur-centrifuge-pobra-180-70-2").price, "150,83 €");
    assert.equal(pobraOptionBySlug.get("ventilateur-centrifuge-pobra-180-70-4").price, "150,83 €");
    assert.equal(pobraOptionBySlug.get("ventilateur-centrifuge-pobra-260-2").price, "253,09 €");
    assert.equal(pobraOptionBySlug.get("ventilateur-centrifuge-pobra-260-4").price, "194,29 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-psek"), "184,07 €");
    assert.equal(psekProduct.options.length, 4);
    assert.equal(psekOptionBySlug.get("ventilateur-centrifuge-psek-180-80-m").price, "184,07 €");
    assert.equal(psekOptionBySlug.get("ventilateur-centrifuge-psek-180-80-t").price, "184,07 €");
    assert.equal(psekOptionBySlug.get("ventilateur-centrifuge-psek-260-m").price, "214,74 €");
    assert.equal(psekOptionBySlug.get("ventilateur-centrifuge-psek-260-t").price, "214,74 €");
    assert.equal(priceBySlug.get("ventilateur-centrifuge-turbo-series"), "75,67 €");
    assert.equal(turboSeriesProduct.options.length, 7);
    assert.equal(turboSeriesOptionBySlug.get("ventilateur-centrifuge-turbo-series-e-100").price, "75,67 €");
    assert.equal(turboSeriesOptionBySlug.get("ventilateur-centrifuge-turbo-series-e-125").price, "79,25 €");
    assert.equal(turboSeriesOptionBySlug.get("ventilateur-centrifuge-turbo-series-e-150").price, "112,48 €");
    assert.equal(turboSeriesOptionBySlug.get("ventilateur-centrifuge-turbo-series-e-160").price, "117,60 €");
    assert.equal(turboSeriesOptionBySlug.get("ventilateur-centrifuge-turbo-series-200").price, "199,40 €");
    assert.equal(turboSeriesOptionBySlug.get("ventilateur-centrifuge-turbo-series-250").price, "247,98 €");
    assert.equal(turboSeriesOptionBySlug.get("ventilateur-centrifuge-turbo-series-315").price, "388,58 €");
    assert.equal(priceBySlug.get("ventilateur-axial-toiture-facf"), "163,61 €");
    assert.equal(facfProduct.options.length, 13);
    assert.equal(facfOptionBySlug.get("ventilateur-axial-toiture-facf-300").price, "163,61 €");
    assert.equal(facfOptionBySlug.get("ventilateur-axial-toiture-facf-450").price, "230,08 €");
    assert.equal(facfOptionBySlug.get("ventilateur-axial-toiture-facf-800").price, "858,97 €");
    assert.equal(facfOptionBySlug.get("ventilateur-axial-toiture-facf-1000").price, "1175,97 €");
    assert.equal(priceBySlug.get("ventilateur-toiture-fcf"), "117,60 €");
    assert.equal(fcfProduct.options.length, 9);
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-190").price, "117,60 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-220").price, "122,71 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-250").price, "132,94 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-315").price, "153,39 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-355").price, "230,08 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-400").price, "368,13 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-450").price, "388,58 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-500").price, "639,11 €");
    assert.equal(fcfOptionBySlug.get("ventilateur-toiture-fcf-560").price, "792,50 €");
    assert.equal(priceBySlug.get("ventilateur-toiture-fkcf"), "386,03 €");
    assert.equal(fkcfProduct.options.length, 3);
    assert.equal(fkcfOptionBySlug.get("ventilateur-toiture-fkcf-300").price, "386,03 €");
    assert.equal(fkcfOptionBySlug.get("ventilateur-toiture-fkcf-350").price, "439,71 €");
    assert.equal(fkcfOptionBySlug.get("ventilateur-toiture-fkcf-400").price, "485,73 €");
    assert.equal(priceBySlug.get("ventilateur-industriel-fsv-750-d"), "250,53 €");
    assert.equal(priceBySlug.get("ventilateur-salle-de-bains-d-bta"), "15,34 €");
    assert.equal(dbtaProduct.options.length, 4);
    assert.equal(dbtaOptionBySlug.get("ventilateur-salle-de-bains-d-bta-100").price, "15,34 €");
    assert.equal(dbtaOptionBySlug.get("ventilateur-salle-de-bains-d-bta-120").price, "17,90 €");
    assert.equal(dbtaOptionBySlug.get("ventilateur-salle-de-bains-d-bta-150").price, "20,45 €");
    assert.equal(dbtaOptionBySlug.get("ventilateur-salle-de-bains-d-bta-200").price, "30,68 €");
    assert.equal(priceBySlug.get("conduit-rond-spiro"), "7,16 €");
    assert.equal(spiroDuctProduct.options.length, 6);
    assert.equal(spiroDuctOptionBySlug.get("conduit-rond-spiro-100").price, "7,16 €");
    assert.equal(spiroDuctOptionBySlug.get("conduit-rond-spiro-125").price, "7,41 €");
    assert.equal(spiroDuctOptionBySlug.get("conduit-rond-spiro-160").price, "9,20 €");
    assert.equal(spiroDuctOptionBySlug.get("conduit-rond-spiro-200").price, "13,29 €");
    assert.equal(spiroDuctOptionBySlug.get("conduit-rond-spiro-250").price, "15,85 €");
    assert.equal(spiroDuctOptionBySlug.get("conduit-rond-spiro-315").price, "22,50 €");
    assert.equal(priceBySlug.get("coude-90-conduit-spiro"), "12,02 €");
    assert.equal(spiroDuctElbow90Product.options.length, 4);
    assert.equal(spiroDuctElbow90OptionBySlug.get("coude-90-conduit-spiro-160").price, "12,02 €");
    assert.equal(spiroDuctElbow90OptionBySlug.get("coude-90-conduit-spiro-200").price, "17,90 €");
    assert.equal(spiroDuctElbow90OptionBySlug.get("coude-90-conduit-spiro-250").price, "20,45 €");
    assert.equal(spiroDuctElbow90OptionBySlug.get("coude-90-conduit-spiro-315").price, "25,56 €");
    assert.equal(priceBySlug.get("te-conduit-rond-spiro"), "15,34 €");
    assert.equal(spiroDuctTeeProduct.options.length, 4);
    assert.equal(spiroDuctTeeOptionBySlug.get("te-conduit-rond-spiro-160").price, "15,34 €");
    assert.equal(spiroDuctTeeOptionBySlug.get("te-conduit-rond-spiro-200").price, "18,41 €");
    assert.equal(spiroDuctTeeOptionBySlug.get("te-conduit-rond-spiro-250").price, "26,59 €");
    assert.equal(spiroDuctTeeOptionBySlug.get("te-conduit-rond-spiro-315").price, "35,79 €");
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
    assert.equal(priceBySlug.get("grilles-de-ventilation-plafond"), "Prix sur demande");
    assert.equal(priceBySlug.get("grilles-de-ventilation-murales"), "Prix sur demande");
    assert.equal(
      priceBySlug.get("grilles-de-ventilation-pour-conduits-spiro"),
      "Prix sur demande",
    );
    assert.equal(priceBySlug.get("grille-a-lamelles-fixes"), "Prix sur demande");
    assert.equal(priceBySlug.get("grille-a-lamelles-mobiles"), "Prix sur demande");
    assert.equal(priceBySlug.get("grille-aspiration-conique"), "Prix sur demande");
    assert.equal(
      priceBySlug.get("clapet-rectangulaire-debit-constant-hcav-r"),
      "Prix sur demande",
    );
    assert.equal(priceBySlug.get("clapet-rond-debit-constant"), "Prix sur demande");
    assert.equal(
      priceBySlug.get("diffuseurs-plafonniers-tourbillonnaires-hswd"),
      "Prix sur demande",
    );
    assert.equal(priceBySlug.get("diffuseurs-lineaires-hsd"), "Prix sur demande");
    assert.equal(priceBySlug.get("clapet-reglage-manuel"), "Prix sur demande");
    assert.equal(priceBySlug.get("regulateur-vitesse-dha"), "322,11 €");
    assert.equal(dhaSpeedControllerProduct.options.length, 1);
    assert.equal(dhaSpeedControllerOptionBySlug.get("regulateur-vitesse-dha-5").price, "322,11 €");
    assert.equal(priceBySlug.get("regulateur-vitesse-mna"), "40,90 €");
    assert.equal(mnaSpeedControllerProduct.options.length, 2);
    assert.equal(mnaSpeedControllerOptionBySlug.get("regulateur-vitesse-mna-1").price, "40,90 €");
    assert.equal(mnaSpeedControllerOptionBySlug.get("regulateur-vitesse-mna-2").price, "61,36 €");
    assert.ok(body.categories.includes("Ventilation industrielle"));
    assert.ok(body.categories.includes("Conduits spiro et pièces façonnées"));
    assert.ok(body.categories.includes("Moteurs électriques 220/380"));
    assert.ok(body.categories.includes("Moteurs électriques triphasés"));
    assert.ok(body.categories.includes("Ventilateurs de canaux"));
    assert.ok(body.categories.includes("Ventilateurs axiaux"));
    assert.ok(body.categories.includes("Ventilateurs centrifuges"));
    assert.ok(body.categories.includes("Ventilateurs de restaurant"));
    assert.ok(body.categories.includes("Ventilateurs de salle de bains"));
    assert.ok(body.categories.includes("Ventilateurs de toiture"));
    assert.ok(body.categories.includes("Grilles et clapets de ventilation"));
  });
});

test("deleteProduct archive un produit admin sans le laisser public", async () => {
  const product = await createProduct(
    normalizeProductInput({
      name: "Produit test archive admin",
      category: "Tests",
      description: "Produit créé pour vérifier l'archivage admin.",
      amount: 1299,
      imageKey: "ductFan",
      active: true,
      sortOrder: 9999,
    }),
  );

  assert.equal(product.active, true);

  const deleted = await deleteProduct(product.slug);

  assert.equal(deleted, true);

  const publicProducts = await getPublicProducts();
  const adminProducts = await getAdminProducts();
  const archivedProduct = adminProducts.find((adminProduct) => adminProduct.slug === product.slug);

  assert.equal(publicProducts.some((publicProduct) => publicProduct.slug === product.slug), false);
  assert.ok(archivedProduct);
  assert.equal(archivedProduct.active, false);
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

test("normalizeCheckoutItems accepte les options DRPKT comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-conduit-drpkt-350", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-conduit-drpkt-350");
  assert.equal(items[0].product.name, "Ventilateur axial de conduit DRPKT 350");
  assert.equal(items[0].product.amount, 13805);
  assert.equal(items[0].product.price, "138,05 €");
});

test("normalizeCheckoutItems accepte les options FDKF comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-conduit-rectangulaire-fdkf-100-50", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-conduit-rectangulaire-fdkf-100-50");
  assert.equal(items[0].product.name, "Ventilateur de conduit rectangulaire FDKF 100-50");
  assert.equal(items[0].product.amount, 79250);
  assert.equal(items[0].product.price, "792,50 €");
});

test("normalizeCheckoutItems accepte le ventilateur FSV comme ligne achetable", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-industriel-sur-pied-fsv-750-a", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-industriel-sur-pied-fsv-750-a");
  assert.equal(items[0].product.name, "Ventilateur industriel sur pied FSV-750-A");
  assert.equal(items[0].product.amount, 25053);
  assert.equal(items[0].product.price, "250,53 €");
});

test("normalizeCheckoutItems accepte le ventilateur FSV-750-D comme ligne achetable", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-industriel-fsv-750-d", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-industriel-fsv-750-d");
  assert.equal(items[0].product.name, "Ventilateur industriel FSV-750-D");
  assert.equal(items[0].product.amount, 25053);
  assert.equal(items[0].product.price, "250,53 €");
});

test("normalizeCheckoutItems accepte les options D-BTA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-salle-de-bains-d-bta-200", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-salle-de-bains-d-bta-200");
  assert.equal(items[0].product.name, "Ventilateur de salle de bains D-BTA 200");
  assert.equal(items[0].product.amount, 3068);
  assert.equal(items[0].product.price, "30,68 €");
});

test("normalizeCheckoutItems accepte les options DTY comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-salle-de-bains-dty-200", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-salle-de-bains-dty-200");
  assert.equal(items[0].product.name, "Ventilateur de salle de bains DTY 200");
  assert.equal(items[0].product.amount, 3068);
  assert.equal(items[0].product.price, "30,68 €");
});

test("normalizeCheckoutItems accepte les options APKT comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-salle-de-bains-apkt-200", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-salle-de-bains-apkt-200");
  assert.equal(items[0].product.name, "Ventilateur de salle de bains APKT 200");
  assert.equal(items[0].product.amount, 3068);
  assert.equal(items[0].product.price, "30,68 €");
});

test("normalizeCheckoutItems accepte les options AUTO comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-salle-de-bains-auto-150", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-salle-de-bains-auto-150");
  assert.equal(items[0].product.name, "Ventilateur de salle de bains AUTO 150");
  assert.equal(items[0].product.amount, 1483);
  assert.equal(items[0].product.price, "14,83 €");
});

test("normalizeCheckoutItems accepte les options AGF comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-agf-160er", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-agf-160er");
  assert.equal(items[0].product.name, "Ventilateur centrifuge AGF 160ER");
  assert.equal(items[0].product.amount, 10481);
  assert.equal(items[0].product.price, "104,81 €");
});

test("normalizeCheckoutItems accepte les options DR comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-dr-drbtms-180-70", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-dr-drbtms-180-70");
  assert.equal(items[0].product.name, "Ventilateur centrifuge DR DRBTMS 180-70");
  assert.equal(items[0].product.amount, 9715);
  assert.equal(items[0].product.price, "97,15 €");
});

test("normalizeCheckoutItems accepte les options FAGS-M comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-fags-m-m6-268-118", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-fags-m-m6-268-118");
  assert.equal(items[0].product.name, "Ventilateur centrifuge FAGS-M FAGS-M6 268-118");
  assert.equal(items[0].product.amount, 50107);
  assert.equal(items[0].product.price, "501,07 €");
});

test("normalizeCheckoutItems accepte les options FBO comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-fbo-10-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-fbo-10-t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge FBO FBO-10 - T");
  assert.equal(items[0].product.amount, 150831);
  assert.equal(items[0].product.price, "1508,31 €");
});

test("normalizeCheckoutItems accepte les options FBK comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-fbk-10-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-fbk-10-t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge FBK FBK-10 - T");
  assert.equal(items[0].product.amount, 150831);
  assert.equal(items[0].product.price, "1508,31 €");
});

test("normalizeCheckoutItems accepte les options FOBR comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-fobr-260-4-m", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-fobr-260-4-m");
  assert.equal(items[0].product.name, "Ventilateur centrifuge FOBR FOBR-260 (4) M");
  assert.equal(items[0].product.amount, 25053);
  assert.equal(items[0].product.price, "250,53 €");
});

test("normalizeCheckoutItems accepte les options FBSY comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-fbsy-10-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-fbsy-10-t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge FBSY FBSY 10 - T");
  assert.equal(items[0].product.amount, 165659);
  assert.equal(items[0].product.price, "1656,59 €");
});

test("normalizeCheckoutItems accepte les options KAGS comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-kags-bags-180-70", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-kags-bags-180-70");
  assert.equal(items[0].product.name, "Ventilateur centrifuge KAGS BAGS 180-70");
  assert.equal(items[0].product.amount, 7669);
  assert.equal(items[0].product.price, "76,69 €");
});

test("normalizeCheckoutItems accepte les options KTS-OBS comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-kts-obs-btms-180-70", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-kts-obs-btms-180-70");
  assert.equal(items[0].product.name, "Ventilateur centrifuge KTS-OBS BTMS 180-70");
  assert.equal(items[0].product.amount, 9715);
  assert.equal(items[0].product.price, "97,15 €");
});

test("normalizeCheckoutItems accepte les options OCES comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-oces-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-oces-t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge OCES OCES-T");
  assert.equal(items[0].product.amount, 19940);
  assert.equal(items[0].product.price, "199,40 €");
});

test("normalizeCheckoutItems accepte les options OBRA-140 comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-obra-140-2t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-obra-140-2t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge OBRA-140 2T");
  assert.equal(items[0].product.amount, 15850);
  assert.equal(items[0].product.price, "158,50 €");
});

test("normalizeCheckoutItems accepte les options OBRA-200 comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-obra-200-2t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-obra-200-2t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge OBRA-200 2T");
  assert.equal(items[0].product.amount, 17895);
  assert.equal(items[0].product.price, "178,95 €");
});

test("normalizeCheckoutItems accepte les options OBRA-260 comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-obra-260-2t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-obra-260-2t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge OBRA-260 2T");
  assert.equal(items[0].product.amount, 30166);
  assert.equal(items[0].product.price, "301,66 €");
});

test("normalizeCheckoutItems accepte les options POBRA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-pobra-260-2", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-pobra-260-2");
  assert.equal(items[0].product.name, "Ventilateur centrifuge POBRA 260 (2)");
  assert.equal(items[0].product.amount, 25309);
  assert.equal(items[0].product.price, "253,09 €");
});

test("normalizeCheckoutItems accepte les options PSEK comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-psek-260-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-psek-260-t");
  assert.equal(items[0].product.name, "Ventilateur centrifuge PSEK 260-T");
  assert.equal(items[0].product.amount, 21474);
  assert.equal(items[0].product.price, "214,74 €");
});

test("normalizeCheckoutItems accepte les options Turbo Series comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-centrifuge-turbo-series-315", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-centrifuge-turbo-series-315");
  assert.equal(items[0].product.name, "Ventilateur centrifuge Turbo Series TURBO 315");
  assert.equal(items[0].product.amount, 38858);
  assert.equal(items[0].product.price, "388,58 €");
});

test("normalizeCheckoutItems accepte les options FACF comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-toiture-facf-1000", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-toiture-facf-1000");
  assert.equal(items[0].product.name, "Ventilateur axial de toiture FACF 1000");
  assert.equal(items[0].product.amount, 117597);
  assert.equal(items[0].product.price, "1175,97 €");
});

test("normalizeCheckoutItems accepte les options FCF comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-toiture-fcf-560", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-toiture-fcf-560");
  assert.equal(items[0].product.name, "Ventilateur de toiture FCF 560");
  assert.equal(items[0].product.amount, 79250);
  assert.equal(items[0].product.price, "792,50 €");
});

test("normalizeCheckoutItems accepte les options FKCF comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-toiture-fkcf-400", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-toiture-fkcf-400");
  assert.equal(items[0].product.name, "Ventilateur de toiture FKCF 400");
  assert.equal(items[0].product.amount, 48573);
  assert.equal(items[0].product.price, "485,73 €");
});

test("normalizeCheckoutItems accepte les options de conduits spiro comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "conduit-rond-spiro-315", quantity: 2 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].product.slug, "conduit-rond-spiro-315");
  assert.equal(items[0].product.name, "Conduit rond spiro galvanisé Ø315");
  assert.equal(items[0].product.amount, 2250);
  assert.equal(items[0].product.price, "22,50 €");
});

test("normalizeCheckoutItems accepte les options de coudes spiro comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "coude-90-conduit-spiro-315", quantity: 3 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].product.slug, "coude-90-conduit-spiro-315");
  assert.equal(items[0].product.name, "Coude 90° pour conduit spiro Ø315");
  assert.equal(items[0].product.amount, 2556);
  assert.equal(items[0].product.price, "25,56 €");
});

test("normalizeCheckoutItems accepte les options de tés spiro comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "te-conduit-rond-spiro-315", quantity: 2 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].product.slug, "te-conduit-rond-spiro-315");
  assert.equal(items[0].product.name, "Té pour conduit rond spiro Ø315");
  assert.equal(items[0].product.amount, 3579);
  assert.equal(items[0].product.price, "35,79 €");
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

test("normalizeCheckoutItems accepte les options DTA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-dta-350", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-dta-350");
  assert.equal(items[0].product.name, "Ventilateur axial DTA 350");
  assert.equal(items[0].product.amount, 5880);
  assert.equal(items[0].product.price, "58,80 €");
});

test("normalizeCheckoutItems accepte les options 8KA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-8ka-800-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-8ka-800-t");
  assert.equal(items[0].product.name, "Ventilateur axial 8KA 800-T");
  assert.equal(items[0].product.amount, 85897);
  assert.equal(items[0].product.price, "858,97 €");
});

test("normalizeCheckoutItems accepte les options 4KA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-axial-4ka-1000-t", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-axial-4ka-1000-t");
  assert.equal(items[0].product.name, "Ventilateur axial 4KA 1000-T");
  assert.equal(items[0].product.amount, 128334);
  assert.equal(items[0].product.price, "1283,34 €");
});

test("normalizeCheckoutItems accepte les options PAKF comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-de-canal-pakf-600", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-de-canal-pakf-600");
  assert.equal(items[0].product.name, "Ventilateur de canal PAKF 600");
  assert.equal(items[0].product.amount, 30933);
  assert.equal(items[0].product.price, "309,33 €");
});

test("normalizeCheckoutItems accepte les options LKT comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "ventilateur-conduit-rond-lkt-355-c", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "ventilateur-conduit-rond-lkt-355-c");
  assert.equal(items[0].product.name, "Ventilateur de conduit rond LKT 355 C");
  assert.equal(items[0].product.amount, 27098);
  assert.equal(items[0].product.price, "270,98 €");
});

test("normalizeCheckoutItems accepte les options DHA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "regulateur-vitesse-dha-5", quantity: 1 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "regulateur-vitesse-dha-5");
  assert.equal(items[0].product.name, "Régulateur de vitesse DHA DHA 5");
  assert.equal(items[0].product.amount, 32211);
  assert.equal(items[0].product.price, "322,11 €");
});

test("normalizeCheckoutItems accepte les options MNA comme lignes achetables", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "regulateur-vitesse-mna-1", quantity: 1 },
    { slug: "regulateur-vitesse-mna-2", quantity: 2 },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].product.slug, "regulateur-vitesse-mna-1");
  assert.equal(items[0].product.name, "Régulateur de vitesse MNA MNA 1");
  assert.equal(items[0].product.amount, 4090);
  assert.equal(items[0].product.price, "40,90 €");
  assert.equal(items[1].quantity, 2);
  assert.equal(items[1].product.slug, "regulateur-vitesse-mna-2");
  assert.equal(items[1].product.name, "Régulateur de vitesse MNA MNA 2");
  assert.equal(items[1].product.amount, 6136);
  assert.equal(items[1].product.price, "61,36 €");
});

test("normalizeCheckoutItems ignore les produits sans prix catalogue", async () => {
  const items = await normalizeCheckoutItems([
    { slug: "grilles-de-ventilation-plafond", quantity: 1 },
    { slug: "grilles-de-ventilation-murales", quantity: 1 },
    { slug: "grilles-de-ventilation-pour-conduits-spiro", quantity: 1 },
    { slug: "grille-a-lamelles-fixes", quantity: 1 },
    { slug: "grille-a-lamelles-mobiles", quantity: 1 },
    { slug: "grille-aspiration-conique", quantity: 1 },
    { slug: "clapet-rectangulaire-debit-constant-hcav-r", quantity: 1 },
    { slug: "clapet-rond-debit-constant", quantity: 1 },
    { slug: "diffuseurs-plafonniers-tourbillonnaires-hswd", quantity: 1 },
    { slug: "diffuseurs-lineaires-hsd", quantity: 1 },
    { slug: "clapet-reglage-manuel", quantity: 1 },
  ]);

  assert.equal(items.length, 0);
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

test("POST /api/promo-codes/validate ne rend pas les codes non applicables énumérables", async () => {
  const promoCodes = {
    valid: "SECUREOK",
    inactive: "SECUREOFF",
    minimum: "SECUREMIN",
  };

  await Promise.all(Object.values(promoCodes).map((code) => deletePromoCode(code)));
  await createPromoCode(
    normalizePromoCodeInput({
      code: promoCodes.valid,
      percent: "10",
      minimumAmount: "0",
      active: true,
    }),
  );
  await createPromoCode(
    normalizePromoCodeInput({
      code: promoCodes.inactive,
      percent: "10",
      minimumAmount: "0",
      active: false,
    }),
  );
  await createPromoCode(
    normalizePromoCodeInput({
      code: promoCodes.minimum,
      percent: "10",
      minimumAmount: "10000000",
      active: true,
    }),
  );

  try {
    await withServer(async (baseUrl) => {
      const validResponse = await validatePromoCode(baseUrl, promoCodes.valid, "198.51.100.20");
      const validBody = await validResponse.json();

      assert.equal(validResponse.status, 200);
      assert.equal(validBody.promoCode.code, promoCodes.valid);
      assert.equal(validBody.promoCode.percent, 10);

      for (const code of ["MISSINGSECURE", promoCodes.inactive, promoCodes.minimum]) {
        const response = await validatePromoCode(baseUrl, code, "198.51.100.21");
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.deepEqual(body, { error: publicPromoCodeValidationError });
      }
    });
  } finally {
    await Promise.all(Object.values(promoCodes).map((code) => deletePromoCode(code)));
  }
});

test("POST /api/promo-codes/validate limite les tentatives publiques", async () => {
  await withServer(async (baseUrl) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await validatePromoCode(baseUrl, `MISS${attempt}`, "198.51.100.22");
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.deepEqual(body, { error: publicPromoCodeValidationError });
    }

    const response = await validatePromoCode(baseUrl, "MISS20", "198.51.100.22");
    const body = await response.json();

    assert.equal(response.status, 429);
    assert.deepEqual(body, {
      error: "Trop de validations de code promo. Réessayez dans quelques minutes.",
    });
    assert.equal(response.headers.get("ratelimit-limit"), "20");
    assert.equal(response.headers.get("ratelimit-remaining"), "0");
    assert.ok(Number.parseInt(response.headers.get("retry-after"), 10) > 0);
  });
});

test("POST /api/checkout échoue fermé en production sans SITE_URL", async () => {
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

        assert.equal(response.status, 403);
        assert.deepEqual(body, { error: clientCsrfError });
      });
    },
  );
});

test("POST /api/checkout refuse une origine CSRF invalide", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/checkout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example.com",
        },
        body: JSON.stringify({
          items: [{ slug: "ventilateurs-axiaux", quantity: 1 }],
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 403);
      assert.deepEqual(body, { error: clientCsrfError });
    });
  });
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

test("POST /api/auth/logout refuse les mutations client sans Origin ni Referer", async () => {
  await withEnv({ NODE_ENV: "development", SITE_URL: undefined }, async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });
      const body = await response.json();

      assert.equal(response.status, 403);
      assert.deepEqual(body, { error: clientCsrfError });
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
        origin: "http://localhost:5173",
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
