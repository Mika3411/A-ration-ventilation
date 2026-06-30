import assert from "node:assert/strict";
import test from "node:test";

import {
  getCartLines,
  getCheckoutItems,
  readStoredCartItems,
  sanitizeCartItems,
} from "../src/panier/cart.js";
import { formatEuroWithCents } from "../src/utils/format.js";

const products = [
  { slug: "ventilateurs-axiaux", name: "Ventilateurs axiaux", amount: 24900 },
  {
    slug: "ventilateur-de-canal-yka",
    name: "Ventilateur de canal YKA",
    amount: 7669,
    options: [
      {
        label: "150-B",
        slug: "ventilateur-de-canal-yka-150-b",
        amount: 8436,
        price: "84,36 €",
      },
    ],
  },
  { slug: "grille-a-lamelles-mobiles", name: "Grille à lamelles mobiles", amount: 0 },
  { slug: "grille-aspiration-conique", name: "Grille d'aspiration conique", amount: 0 },
  { slug: "grilles-de-ventilation-plafond", name: "Grilles de ventilation plafond", amount: 0 },
  { slug: "grilles-de-ventilation-murales", name: "Grilles de ventilation murales", amount: 0 },
  {
    slug: "grilles-de-ventilation-pour-conduits-spiro",
    name: "Grilles de ventilation pour conduits spiro",
    amount: 0,
  },
  { slug: "grille-a-lamelles-fixes", name: "Grille à lamelles fixes", amount: 0 },
  {
    slug: "clapet-rectangulaire-debit-constant-hcav-r",
    name: "Clapet rectangulaire à débit constant HCAV-R",
    amount: 0,
  },
  { slug: "regulateurs", name: "Régulateurs", amount: 12900 },
];

test("sanitizeCartItems garde uniquement les quantités positives bornées", () => {
  assert.deepEqual(
    sanitizeCartItems({
      "ventilateurs-axiaux": "2",
      regulateurs: 120,
      ignored: "abc",
      removed: -1,
      zero: 0,
    }),
    {
      "ventilateurs-axiaux": 2,
      regulateurs: 99,
    },
  );
  assert.deepEqual(sanitizeCartItems(null), {});
  assert.deepEqual(sanitizeCartItems([]), {});
});

test("getCartLines calcule les lignes et totaux du panier", () => {
  assert.deepEqual(getCartLines(products, { "ventilateurs-axiaux": 2, unknown: 4 }), [
    {
      product: products[0],
      quantity: 2,
      lineTotal: 49800,
    },
  ]);
});

test("getCheckoutItems ne garde que slug et quantity", () => {
  assert.deepEqual(getCheckoutItems(products, { "ventilateurs-axiaux": 1, regulateurs: 3 }), [
    { slug: "ventilateurs-axiaux", quantity: 1 },
    { slug: "regulateurs", quantity: 3 },
  ]);
});

test("getCheckoutItems ignore les produits sans prix", () => {
  assert.deepEqual(
    getCheckoutItems(products, {
      "grilles-de-ventilation-plafond": 1,
      "grilles-de-ventilation-murales": 1,
      "grilles-de-ventilation-pour-conduits-spiro": 1,
      "grille-a-lamelles-fixes": 1,
      "grille-a-lamelles-mobiles": 1,
      "grille-aspiration-conique": 1,
      "clapet-rectangulaire-debit-constant-hcav-r": 1,
    }),
    [],
  );
});

test("getCartLines transforme une option produit en ligne achetable", () => {
  assert.deepEqual(getCartLines(products, { "ventilateur-de-canal-yka-150-b": 2 }), [
    {
      product: {
        slug: "ventilateur-de-canal-yka-150-b",
        name: "Ventilateur de canal YKA 150-B",
        amount: 8436,
        price: "84,36 €",
        text: undefined,
        description: undefined,
        parentSlug: "ventilateur-de-canal-yka",
        optionLabel: "150-B",
      },
      quantity: 2,
      lineTotal: 16872,
    },
  ]);
});

test("formatEuroWithCents garde deux décimales dans le panier", () => {
  assert.equal(formatEuroWithCents(5880), "58,80 €");
  assert.equal(formatEuroWithCents(24900), "249,00 €");
});

test("readStoredCartItems retourne un objet vide hors navigateur", () => {
  assert.deepEqual(readStoredCartItems(), {});
});
