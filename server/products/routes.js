import express from "express";

import { requireAdmin } from "../auth/adminAuth.js";
import { cleanSingleLine } from "../helpers.js";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getCategoriesFromProducts,
  getPublicProducts,
  handleProductMutationError,
  normalizeProductInput,
  updateProduct,
} from "./service.js";

export function createPublicProductsRouter() {
  const router = express.Router();

  router.get("/products", async (_request, response) => {
    try {
      const products = await getPublicProducts();
      response.status(200).json({ products });
    } catch (error) {
      console.error("Public product lookup failed:", error);
      response.status(500).json({ error: "Impossible de charger la boutique." });
    }
  });

  return router;
}

export function createAdminProductsRouter() {
  const router = express.Router();

  router.get("/products", requireAdmin, async (_request, response) => {
    try {
      const products = await getAdminProducts();
      response.status(200).json({
        products,
        categories: getCategoriesFromProducts(products),
      });
    } catch (error) {
      console.error("Admin product lookup failed:", error);
      response.status(500).json({ error: "Impossible de charger les produits." });
    }
  });

  router.post("/products", requireAdmin, async (request, response) => {
    try {
      const productInput = normalizeProductInput(request.body);
      const product = await createProduct(productInput);
      response.status(201).json({ product });
    } catch (error) {
      handleProductMutationError(error, response, "Impossible de créer le produit.");
    }
  });

  router.put("/products/:slug", requireAdmin, async (request, response) => {
    try {
      const slug = cleanSingleLine(request.params.slug, 120);
      const productInput = normalizeProductInput(request.body);
      const product = await updateProduct(slug, productInput);

      if (!product) {
        response.status(404).json({ error: "Produit introuvable." });
        return;
      }

      response.status(200).json({ product });
    } catch (error) {
      handleProductMutationError(error, response, "Impossible de modifier le produit.");
    }
  });

  router.delete("/products/:slug", requireAdmin, async (request, response) => {
    try {
      const slug = cleanSingleLine(request.params.slug, 120);
      const deleted = await deleteProduct(slug);

      if (!deleted) {
        response.status(404).json({ error: "Produit introuvable." });
        return;
      }

      response.status(200).json({ ok: true });
    } catch (error) {
      console.error("Product deletion failed:", error);
      response.status(500).json({ error: "Impossible de supprimer le produit." });
    }
  });

  return router;
}
