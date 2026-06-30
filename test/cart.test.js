import assert from "node:assert/strict";
import test from "node:test";

import {
  getCartLines,
  getCheckoutItems,
  readStoredCartItems,
  sanitizeCartItems,
} from "../src/panier/cart.js";
import { formatEuroWithCents } from "../src/utils/format.js";
import { buildOrderSnapshot } from "../server/orders/service.js";

const products = [
  { slug: "ventilateur-axial-draf", name: "Ventilateur axial DRAF", amount: 9203 },
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
  { slug: "regulateur-vitesse-mna", name: "Régulateur de vitesse MNA", amount: 4090 },
];

test("sanitizeCartItems garde uniquement les quantités positives bornées", () => {
  assert.deepEqual(
    sanitizeCartItems({
      "ventilateur-axial-draf": "2",
      "regulateur-vitesse-mna": 120,
      ignored: "abc",
      removed: -1,
      zero: 0,
    }),
    {
      "ventilateur-axial-draf": 2,
      "regulateur-vitesse-mna": 99,
    },
  );
  assert.deepEqual(sanitizeCartItems(null), {});
  assert.deepEqual(sanitizeCartItems([]), {});
});

test("getCartLines calcule les lignes et totaux du panier", () => {
  assert.deepEqual(getCartLines(products, { "ventilateur-axial-draf": 2, unknown: 4 }), [
    {
      product: products[0],
      quantity: 2,
      discount: null,
      unitAmount: 9203,
      lineTotal: 18406,
    },
  ]);
});

test("getCartLines applique les remises quantité", () => {
  const discountedProduct = {
    slug: "gaine-spiro",
    name: "Gaine spiro",
    amount: 10000,
    quantityDiscounts: [
      { minQuantity: 5, percent: 10 },
      { minQuantity: 10, percent: 15 },
    ],
  };

  assert.deepEqual(getCartLines([discountedProduct], { "gaine-spiro": 6 }), [
    {
      product: discountedProduct,
      quantity: 6,
      discount: { minQuantity: 5, percent: 10 },
      unitAmount: 9000,
      lineTotal: 54000,
    },
  ]);
});

test("buildOrderSnapshot applique les remises quantité côté commande", () => {
  const product = {
    slug: "gaine-spiro",
    name: "Gaine spiro",
    category: "Conduits",
    description: "Conduit rond.",
    amount: 10000,
    price: "100 €",
    quantityDiscounts: [{ minQuantity: 5, percent: 10 }],
  };

  assert.deepEqual(buildOrderSnapshot([{ product, quantity: 5 }]), {
    amountSubtotal: 45000,
    promoCode: null,
    promoDiscountAmount: 0,
    amountTotal: 45000,
    items: [
      {
        slug: "gaine-spiro",
        name: "Gaine spiro",
        category: "Conduits",
        description: "Conduit rond.",
        amount: 10000,
        price: "100 €",
        quantity: 5,
        discount: { minQuantity: 5, percent: 10 },
        unitAmount: 9000,
        promoUnitAmount: 9000,
        lineSubtotal: 45000,
        promoDiscountAmount: 0,
        lineTotal: 45000,
      },
    ],
  });
});

test("buildOrderSnapshot applique un code promo après les remises quantité", () => {
  const product = {
    slug: "gaine-spiro",
    name: "Gaine spiro",
    category: "Conduits",
    description: "Conduit rond.",
    amount: 10000,
    price: "100 €",
    quantityDiscounts: [{ minQuantity: 5, percent: 10 }],
  };

  assert.deepEqual(
    buildOrderSnapshot([{ product, quantity: 5 }], {
      code: "PRO10",
      percent: 10,
      minimumAmount: 10000,
      active: true,
    }),
    {
      amountSubtotal: 45000,
      promoCode: {
        code: "PRO10",
        percent: 10,
        minimumAmount: 10000,
        startsAt: "",
        endsAt: "",
        active: true,
      },
      promoDiscountAmount: 4500,
      amountTotal: 40500,
      items: [
        {
          slug: "gaine-spiro",
          name: "Gaine spiro",
          category: "Conduits",
          description: "Conduit rond.",
          amount: 10000,
          price: "100 €",
          quantity: 5,
          discount: { minQuantity: 5, percent: 10 },
          unitAmount: 9000,
          promoUnitAmount: 8100,
          lineSubtotal: 45000,
          promoDiscountAmount: 4500,
          lineTotal: 40500,
        },
      ],
    },
  );
});

test("getCheckoutItems ne garde que slug et quantity", () => {
  assert.deepEqual(getCheckoutItems(products, { "ventilateur-axial-draf": 1, "regulateur-vitesse-mna": 3 }), [
    { slug: "ventilateur-axial-draf", quantity: 1 },
    { slug: "regulateur-vitesse-mna", quantity: 3 },
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
      discount: null,
      unitAmount: 8436,
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
