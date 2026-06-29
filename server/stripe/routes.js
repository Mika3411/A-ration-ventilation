import express from "express";
import Stripe from "stripe";

import { getAuthenticatedCustomer } from "../auth/customerAuth.js";
import { getRequestOrigin } from "../helpers.js";
import {
  attachStripeSessionToOrder,
  buildStripeOrderMetadata,
  completeOrderFromCheckoutSession,
  createPendingOrder,
} from "../orders/service.js";
import { normalizeCheckoutItems } from "../products/service.js";
import { checkoutRateLimiter } from "../security/rateLimit.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    })
  : null;

export function createStripeWebhookRouter() {
  const router = express.Router();

  router.post("/webhook", express.raw({ type: "application/json" }), async (request, response) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      response.status(503).json({ error: "Webhook Stripe non configuré." });
      return;
    }

    const signature = request.get("stripe-signature");
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      console.error("Stripe webhook verification failed:", error);
      response.status(400).json({ error: "Signature Stripe invalide." });
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const order = await completeOrderFromCheckoutSession(session);

        console.log("Stripe checkout completed:", {
          sessionId: session.id,
          cart: session.metadata?.cart || "",
          orderId: order?.id || session.metadata?.orderId || "",
        });
      }

      response.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook handling failed:", error);
      response.status(500).json({ error: "Impossible de persister la commande Stripe." });
    }
  });

  return router;
}

export function createCheckoutRouter() {
  const router = express.Router();

  router.post("/checkout", checkoutRateLimiter, async (request, response) => {
    if (!stripe) {
      response.status(503).json({
        error: "Stripe n'est pas encore configuré. Ajoutez STRIPE_SECRET_KEY côté serveur.",
      });
      return;
    }

    const cartItems = await normalizeCheckoutItems(request.body?.items);

    if (cartItems.length === 0) {
      response.status(400).json({ error: "Votre panier est vide." });
      return;
    }

    try {
      const customer = await getAuthenticatedCustomer(request);
      const order = await createPendingOrder({ cartItems, customer });
      const origin = getRequestOrigin(request);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: cartItems.map(({ product, quantity }) => ({
          quantity,
          price_data: {
            currency: "eur",
            unit_amount: product.amount,
            product_data: {
              name: product.name,
              description: product.description,
              metadata: {
                category: product.category,
                slug: product.slug,
              },
            },
          },
        })),
        success_url: `${origin}/boutique?paiement=succes&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/boutique?paiement=annule`,
        billing_address_collection: "required",
        phone_number_collection: {
          enabled: true,
        },
        shipping_address_collection: {
          allowed_countries: ["FR", "BE", "CH"],
        },
        automatic_tax: {
          enabled: process.env.STRIPE_AUTOMATIC_TAX === "true",
        },
        metadata: buildStripeOrderMetadata({ order, customer }),
      });

      await attachStripeSessionToOrder(order.publicId || order.id, session);
      response.status(200).json({ url: session.url, orderId: order.publicId || order.id });
    } catch (error) {
      console.error("Stripe checkout session failed:", error);
      response.status(502).json({
        error: "Impossible d'ouvrir le paiement Stripe pour le moment.",
      });
    }
  });

  return router;
}
