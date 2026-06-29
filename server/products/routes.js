import express from "express";

import { requireAdmin } from "../auth/adminAuth.js";
import { cleanSingleLine } from "../helpers.js";
import {
  createCategory,
  createProduct,
  deleteCategory,
  getAdminCategories,
  deleteProduct,
  getAdminProducts,
  getPublicCategories,
  getPublicProducts,
  handleProductMutationError,
  normalizeProductInput,
  renameCategory,
  updateProduct,
} from "./service.js";

export function createPublicProductsRouter() {
  const router = express.Router();

  router.get("/products", async (_request, response) => {
    try {
      const [products, categories] = await Promise.all([getPublicProducts(), getPublicCategories()]);
      response.status(200).json({ products, categories });
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
      const [products, categories] = await Promise.all([getAdminProducts(), getAdminCategories()]);
      response.status(200).json({
        products,
        categories,
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

  router.get("/categories", requireAdmin, async (_request, response) => {
    try {
      const categories = await getAdminCategories();
      response.status(200).json({ categories });
    } catch (error) {
      console.error("Admin category lookup failed:", error);
      response.status(500).json({ error: "Impossible de charger les catégories." });
    }
  });

  router.post("/categories", requireAdmin, async (request, response) => {
    try {
      const category = await createCategory(request.body);
      response.status(201).json({ category });
    } catch (error) {
      handleProductMutationError(error, response, "Impossible de créer la catégorie.");
    }
  });

  router.put("/categories", requireAdmin, async (request, response) => {
    try {
      const category = await renameCategory(request.body);

      if (!category) {
        response.status(404).json({ error: "Catégorie introuvable." });
        return;
      }

      response.status(200).json({ category });
    } catch (error) {
      handleProductMutationError(error, response, "Impossible de renommer la catégorie.");
    }
  });

  router.delete("/categories", requireAdmin, async (request, response) => {
    try {
      const deleted = await deleteCategory(request.body);

      if (!deleted) {
        response.status(404).json({ error: "Catégorie introuvable." });
        return;
      }

      response.status(200).json({ ok: true });
    } catch (error) {
      handleProductMutationError(error, response, "Impossible de supprimer la catégorie.");
    }
  });

  return router;
}
