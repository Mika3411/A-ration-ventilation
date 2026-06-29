import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanMessage,
  cleanSingleLine,
  escapeHtml,
  formatEuroAmount,
  isValidEmail,
  normalizeEmail,
  slugify,
} from "../server/helpers.js";
import { normalizeProductInput } from "../server/products/service.js";

test("slugify normalise les accents, espaces et ponctuations", () => {
  assert.equal(slugify(" Ventilateurs axiaux Ø 400 ! "), "ventilateurs-axiaux-400");
  assert.equal(slugify("éèà / Produit spécial"), "eea-produit-special");
  assert.equal(slugify("!!!"), "produit");
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

test("formatEuroAmount formate les centimes en euros entiers", () => {
  assert.equal(formatEuroAmount(24900), "249 €");
  assert.equal(formatEuroAmount(123456), "1 235 €");
});

test("normalizeProductInput nettoie et valide un produit admin", () => {
  const product = normalizeProductInput({
    name: "  Ventilateur mural  ",
    category: "  Extraction  ",
    description: " Ligne 1\r\nLigne 2 ",
    amount: "12900",
    imageKey: "axialFan",
    imageUrl: " https://example.com/fan.webp ",
    featured: true,
    active: false,
    sortOrder: "30",
  });

  assert.deepEqual(product, {
    name: "Ventilateur mural",
    category: "Extraction",
    description: "Ligne 1\nLigne 2",
    amount: 12900,
    imageKey: "axialFan",
    imageUrl: "https://example.com/fan.webp",
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
        imageUrl: "ftp://example.com/fan.jpg",
      }),
    /URL de l'image/i,
  );
});
