import { useCallback, useState } from "react";

import { getCheckoutItems } from "../panier/cart.js";

export function useCheckout({ activePromoCode, cartItems, products }) {
  const [checkoutStatus, setCheckoutStatus] = useState("idle");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  const clearCheckoutMessage = useCallback(() => {
    setCheckoutMessage("");
  }, []);

  const checkout = useCallback(async () => {
    setCheckoutStatus("loading");
    setCheckoutMessage("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: getCheckoutItems(products, cartItems),
          promoCode: activePromoCode?.code || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Impossible d'ouvrir le paiement Stripe.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutStatus("error");
      setCheckoutMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir le paiement Stripe pour le moment.",
      );
    }
  }, [activePromoCode, cartItems, products]);

  return {
    checkout,
    checkoutMessage,
    checkoutStatus,
    clearCheckoutMessage,
  };
}
