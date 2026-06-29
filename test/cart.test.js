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

test("readStoredCartItems retourne un objet vide hors navigateur", () => {
  assert.deepEqual(readStoredCartItems(), {});
});
