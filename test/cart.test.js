import assert from "node:assert/strict";
import test from "node:test";

import {
  getCartLines,
  getCheckoutItems,
  readStoredCartItems,
  sanitizeCartItems,
} from "../src/panier/cart.js";

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

test("readStoredCartItems retourne un objet vide hors navigateur", () => {
  assert.deepEqual(readStoredCartItems(), {});
});
