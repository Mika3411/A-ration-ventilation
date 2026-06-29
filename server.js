import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAdminAuthRouter } from "./server/auth/adminAuth.js";
import { createCustomerAuthRouter } from "./server/auth/customerAuth.js";
import { port } from "./server/config.js";
import { createContactRouter } from "./server/contact/routes.js";
import { createOrdersRouter } from "./server/orders/routes.js";
import { createAdminProductsRouter, createPublicProductsRouter } from "./server/products/routes.js";
import { securityHeaders } from "./server/security/headers.js";
import { createCheckoutRouter, createStripeWebhookRouter } from "./server/stripe/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist");
const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);

app.use("/api/stripe", createStripeWebhookRouter());

app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_request, response) => {
  response.status(200).json({ ok: true });
});

app.use("/api", createPublicProductsRouter());
app.use("/api/auth", createCustomerAuthRouter());
app.use("/api/admin", createAdminAuthRouter());
app.use("/api/admin", createAdminProductsRouter());
app.use("/api", createOrdersRouter());
app.use("/api", createCheckoutRouter());
app.use("/api", createContactRouter());

app.use(express.static(distPath));

app.use((request, response, next) => {
  if (request.method !== "GET") {
    next();
    return;
  }

  response.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Erreur serveur." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Aération Ventilation listening on port ${port}`);
});
