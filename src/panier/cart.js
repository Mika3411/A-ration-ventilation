export const cartStorageKey = "aeration-ventilation-cart-v1";

function sanitizeCartItems(rawItems) {
  if (!rawItems || typeof rawItems !== "object" || Array.isArray(rawItems)) return {};

  return Object.fromEntries(
    Object.entries(rawItems)
      .map(([slug, quantity]) => [
        slug,
        Math.min(Math.max(Number.parseInt(quantity, 10) || 0, 0), 99),
      ])
      .filter(([, quantity]) => quantity > 0),
  );
}

export function readStoredCartItems() {
  if (typeof window === "undefined") return {};

  try {
    return sanitizeCartItems(JSON.parse(window.localStorage.getItem(cartStorageKey) || "{}"));
  } catch {
    return {};
  }
}

export function getCartLines(products, cartItems) {
  return products
    .map((product) => ({
      product,
      quantity: cartItems[product.slug] || 0,
    }))
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      ...line,
      lineTotal: line.product.amount * line.quantity,
    }));
}

export function getCheckoutItems(products, cartItems) {
  return getCartLines(products, cartItems).map(({ product, quantity }) => ({
    slug: product.slug,
    quantity,
  }));
}

export function getInitialPaymentNotice() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const paymentState = params.get("paiement");

  if (paymentState === "succes") {
    return {
      type: "success",
      text: "Paiement confirmé. Merci, votre commande est enregistrée.",
    };
  }

  if (paymentState === "annule") {
    return {
      type: "info",
      text: "Paiement annulé. Votre panier est conservé.",
    };
  }

  return null;
}
