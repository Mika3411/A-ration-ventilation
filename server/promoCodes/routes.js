import express from "express";

import { requireAdmin } from "../auth/adminAuth.js";
import { cleanSingleLine } from "../helpers.js";
import { buildOrderSnapshot } from "../orders/service.js";
import { normalizeCheckoutItems } from "../products/service.js";
import { promoCodeValidationRateLimiter } from "../security/rateLimit.js";
import {
  createPromoCode,
  deletePromoCode,
  getAdminPromoCodes,
  getApplicablePromoCode,
  handlePromoCodeMutationError,
  normalizePromoCodeInput,
  publicPromoCodeValidationError,
  serializePublicPromoCode,
  updatePromoCode,
} from "./service.js";

export function createPublicPromoCodesRouter() {
  const router = express.Router();

  router.post(
    "/promo-codes/validate",
    promoCodeValidationRateLimiter,
    async (request, response) => {
      try {
        const cartItems = await normalizeCheckoutItems(request.body?.items);

        if (cartItems.length === 0) {
          response.status(400).json({ error: "Votre panier est vide." });
          return;
        }

        const subtotalSnapshot = buildOrderSnapshot(cartItems);
        const promoCode = await getApplicablePromoCode(
          request.body?.code,
          subtotalSnapshot.amountSubtotal,
        );

        response.status(200).json({ promoCode: serializePublicPromoCode(promoCode) });
      } catch {
        response.status(400).json({ error: publicPromoCodeValidationError });
      }
    },
  );

  return router;
}

export function createAdminPromoCodesRouter() {
  const router = express.Router();

  router.get("/promo-codes", requireAdmin, async (_request, response) => {
    try {
      const promoCodes = await getAdminPromoCodes();
      response.status(200).json({ promoCodes });
    } catch (error) {
      console.error("Admin promo code lookup failed:", error);
      response.status(500).json({ error: "Impossible de charger les codes promo." });
    }
  });

  router.post("/promo-codes", requireAdmin, async (request, response) => {
    try {
      const promoCodeInput = normalizePromoCodeInput(request.body);
      const promoCode = await createPromoCode(promoCodeInput);
      response.status(201).json({ promoCode });
    } catch (error) {
      handlePromoCodeMutationError(error, response, "Impossible de créer le code promo.");
    }
  });

  router.put("/promo-codes/:code", requireAdmin, async (request, response) => {
    try {
      const code = cleanSingleLine(request.params.code, 80);
      const promoCodeInput = normalizePromoCodeInput(request.body);
      const promoCode = await updatePromoCode(code, promoCodeInput);

      if (!promoCode) {
        response.status(404).json({ error: "Code promo introuvable." });
        return;
      }

      response.status(200).json({ promoCode });
    } catch (error) {
      handlePromoCodeMutationError(error, response, "Impossible de modifier le code promo.");
    }
  });

  router.delete("/promo-codes/:code", requireAdmin, async (request, response) => {
    try {
      const deleted = await deletePromoCode(cleanSingleLine(request.params.code, 80));

      if (!deleted) {
        response.status(404).json({ error: "Code promo introuvable." });
        return;
      }

      response.status(200).json({ ok: true });
    } catch (error) {
      console.error("Promo code deletion failed:", error);
      response.status(500).json({ error: "Impossible de supprimer le code promo." });
    }
  });

  return router;
}
