import express from "express";

import { getAuthenticatedCustomer } from "../auth/customerAuth.js";
import { getCustomerOrders } from "./service.js";

export function createOrdersRouter() {
  const router = express.Router();

  router.get("/orders", async (request, response) => {
    try {
      const customer = await getAuthenticatedCustomer(request);

      if (!customer) {
        response.status(401).json({ error: "Connexion client requise." });
        return;
      }

      const orders = await getCustomerOrders(customer.id);
      response.status(200).json({ orders });
    } catch (error) {
      console.error("Customer orders lookup failed:", error);
      response.status(500).json({ error: "Impossible de charger les commandes." });
    }
  });

  return router;
}
