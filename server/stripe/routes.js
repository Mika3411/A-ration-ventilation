import express from "express";
import Stripe from "stripe";

import { missingProductionSiteUrlError } from "../config.js";
import { getAuthenticatedCustomer } from "../auth/customerAuth.js";
import { ensureDatabaseReady } from "../database.js";
import { getRequestOrigin } from "../helpers.js";
import {
  attachStripeInvoiceToOrder,
  attachStripeSessionToOrder,
  buildOrderSnapshot,
  buildStripeOrderMetadata,
  completeOrderFromCheckoutSession,
  createPendingOrder,
} from "../orders/service.js";
import { getApplicablePromoCode } from "../promoCodes/service.js";
import { normalizeCheckoutItems } from "../products/service.js";
import { checkoutRateLimiter } from "../security/rateLimit.js";
import {
  getDiscountedUnitAmount,
  getPromoDiscountedUnitAmount,
  getQuantityDiscount,
} from "../../shared/pricing.js";

export const missingCheckoutDatabaseError =
  "DATABASE_URL doit être configuré en production avant d'ouvrir un paiement Stripe.";

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
        const invoice = await getSessionInvoice(session);

        if (invoice) {
          await attachStripeInvoiceToOrder(invoice, {
            orderPublicId: order?.id || session.metadata?.orderId || "",
            stripeSessionId: session.id,
          });
        }

        console.log("Stripe checkout completed:", {
          sessionId: session.id,
          orderId: order?.id || session.metadata?.orderId || "",
        });
      }

      if (event.type === "invoice.finalized" || event.type === "invoice.paid") {
        const invoice = event.data.object;
        const order = await attachStripeInvoiceToOrder(invoice);

        console.log("Stripe invoice linked:", {
          invoiceId: invoice.id,
          orderId: order?.id || invoice.metadata?.orderId || "",
          eventType: event.type,
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
    const origin = getRequestOrigin(request);

    if (!origin) {
      response.status(503).json({ error: missingProductionSiteUrlError });
      return;
    }

    const databaseError = await getProductionCheckoutDatabaseError();
    if (databaseError) {
      response.status(503).json({ error: databaseError });
      return;
    }

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

    let promoCode = null;

    try {
      if (request.body?.promoCode) {
        const subtotalSnapshot = buildOrderSnapshot(cartItems);
        promoCode = await getApplicablePromoCode(
          request.body.promoCode,
          subtotalSnapshot.amountSubtotal,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Code promo invalide.";
      response.status(message.includes("introuvable") ? 404 : 400).json({ error: message });
      return;
    }

    try {
      const customer = await getAuthenticatedCustomer(request);
      const order = await createPendingOrder({ cartItems, customer, promoCode });
      const metadata = buildStripeOrderMetadata({ order, customer });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: cartItems.map(({ product, quantity }) => {
          const discount = getQuantityDiscount(product.quantityDiscounts, quantity);
          const unitAmount = getDiscountedUnitAmount(
            product.amount,
            quantity,
            product.quantityDiscounts,
          );
          const stripeUnitAmount = getPromoDiscountedUnitAmount(unitAmount, promoCode);
          const promoDescription = promoCode
            ? `Code promo ${promoCode.code} -${formatDiscountPercent(promoCode.percent)}.`
            : "";

          return {
            quantity,
            price_data: {
              currency: "eur",
              unit_amount: stripeUnitAmount,
              product_data: {
                name: product.name,
                description: discount || promoDescription
                  ? [
                      product.description,
                      discount
                        ? `Remise quantité -${formatDiscountPercent(discount.percent)}.`
                        : "",
                      promoDescription,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : product.description,
                metadata: {
                  category: product.category,
                  slug: product.slug,
                  discountPercent: discount ? String(discount.percent) : "",
                  promoCode: promoCode?.code || "",
                  promoDiscountPercent: promoCode ? String(promoCode.percent) : "",
                },
              },
            },
          };
        }),
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
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Commande ${order.publicId || order.id}`,
            metadata,
          },
        },
        tax_id_collection: {
          enabled: true,
        },
        ...(customer?.email ? { customer_email: customer.email } : {}),
        metadata,
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

async function getProductionCheckoutDatabaseError() {
  if (process.env.NODE_ENV !== "production") return "";

  try {
    await ensureDatabaseReady();
    return "";
  } catch {
    return missingCheckoutDatabaseError;
  }
}

function formatDiscountPercent(percent) {
  return Number.isInteger(percent) ? `${percent}%` : `${String(percent).replace(".", ",")}%`;
}

async function getSessionInvoice(session) {
  const invoice = session.invoice;
  const invoiceId = getStripeObjectId(invoice);

  if (!invoiceId || !stripe) return null;
  if (invoice && typeof invoice === "object" && "hosted_invoice_url" in invoice) {
    return invoice;
  }

  try {
    return await stripe.invoices.retrieve(invoiceId);
  } catch (error) {
    console.error("Stripe invoice retrieval failed:", error);
    return { id: invoiceId, metadata: session.metadata || {} };
  }
}

function getStripeObjectId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id || "";
}
