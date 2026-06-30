import { useCallback, useMemo, useState } from "react";

import { getCheckoutItems } from "../panier/cart.js";
import { getPromoCartSummary, normalizePromoCode } from "../../shared/pricing.js";

export function usePromoCode({ cartItems, cartLines, products }) {
  const [promoCode, setPromoCode] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoMessageType, setPromoMessageType] = useState("success");
  const [promoStatus, setPromoStatus] = useState("idle");
  const promoSummary = useMemo(() => getPromoCartSummary(cartLines, promoCode), [cartLines, promoCode]);
  const activePromoCode = promoSummary.discountAmount > 0 ? promoCode : null;

  const applyPromoCode = useCallback(
    async (code) => {
      const normalizedCode = normalizePromoCode(code);

      if (!normalizedCode) {
        setPromoCode(null);
        setPromoMessageType("error");
        setPromoMessage("Indiquez un code promo.");
        return false;
      }

      setPromoStatus("loading");
      setPromoMessage("");

      try {
        const response = await fetch("/api/promo-codes/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: normalizedCode,
            items: getCheckoutItems(products, cartItems),
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.promoCode) {
          throw new Error(payload.error || "Code promo invalide.");
        }

        setPromoCode(payload.promoCode);
        setPromoStatus("idle");
        setPromoMessageType("success");
        setPromoMessage(`Code ${payload.promoCode.code} appliqué.`);
        return true;
      } catch (error) {
        setPromoCode(null);
        setPromoStatus("idle");
        setPromoMessageType("error");
        setPromoMessage(error instanceof Error ? error.message : "Code promo invalide.");
        return false;
      }
    },
    [cartItems, products],
  );

  const clearPromoCode = useCallback(() => {
    setPromoCode(null);
    setPromoMessage("");
  }, []);

  return {
    activePromoCode,
    applyPromoCode,
    clearPromoCode,
    promoCode,
    promoMessage,
    promoMessageType,
    promoStatus,
    promoSummary,
  };
}
