import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAdminAuthRouter } from "./auth/adminAuth.js";
import { createCustomerAuthRouter } from "./auth/customerAuth.js";
import { createContactRouter } from "./contact/routes.js";
import { createAdminMembersRouter } from "./members/routes.js";
import { createOrdersRouter } from "./orders/routes.js";
import { createAdminPromoCodesRouter, createPublicPromoCodesRouter } from "./promoCodes/routes.js";
import { adminCsrfProtection, clientCsrfProtection } from "./security/csrf.js";
import { createAdminProductsRouter, createPublicProductsRouter } from "./products/routes.js";
import { securityHeaders } from "./security/headers.js";
import { createSeoFilesRouter } from "./seoFiles.js";
import { sendIndexHtmlWithSeo } from "./seo.js";
import { createCheckoutRouter, createStripeWebhookRouter } from "./stripe/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDistPath = path.join(__dirname, "..", "dist");
const defaultJsonParser = express.json({ limit: "64kb" });
const adminImageJsonParser = express.json({ limit: "2mb" });

export function createApp({ distPath = defaultDistPath } = {}) {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(securityHeaders);

  app.use("/api/stripe", createStripeWebhookRouter());

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ ok: true });
  });

  app.use(createSeoFilesRouter());

  app.use("/api", createPublicProductsRouter());
  app.use("/api/admin", adminCsrfProtection);
  app.use("/api/auth", clientCsrfProtection);
  app.use("/api/promo-codes", clientCsrfProtection);
  app.use("/api/checkout", clientCsrfProtection);
  app.use("/api/contact", clientCsrfProtection);
  app.use("/api/admin/products", parseJsonIfNeeded(adminImageJsonParser));
  app.use(parseJsonIfNeeded(defaultJsonParser));

  app.use("/api/auth", createCustomerAuthRouter());
  app.use("/api/admin", createAdminAuthRouter());
  app.use("/api/admin", createAdminProductsRouter());
  app.use("/api/admin", createAdminMembersRouter());
  app.use("/api/admin", createAdminPromoCodesRouter());
  app.use("/api", createPublicPromoCodesRouter());
  app.use("/api", createOrdersRouter());
  app.use("/api", createCheckoutRouter());
  app.use("/api", createContactRouter());

  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      immutable: true,
      index: false,
      maxAge: "1y",
    }),
  );
  app.use(express.static(distPath, { index: false }));

  app.use((request, response, next) => {
    if (request.method !== "GET") {
      next();
      return;
    }

    sendIndexHtmlWithSeo(request, response, next, distPath);
  });

  app.use((error, _request, response, _next) => {
    if (error?.type === "entity.too.large") {
      response.status(413).json({ error: "Requête JSON trop volumineuse." });
      return;
    }

    if (error instanceof SyntaxError && error.status === 400) {
      response.status(400).json({ error: "JSON invalide." });
      return;
    }

    console.error(error);
    response.status(500).json({ error: "Erreur serveur." });
  });

  return app;
}

function parseJsonIfNeeded(parser) {
  return (request, response, next) => {
    if (request.body !== undefined) {
      next();
      return;
    }

    parser(request, response, next);
  };
}
