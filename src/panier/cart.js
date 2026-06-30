export const cartStorageKey = "aeration-ventilation-cart-v1";

export function sanitizeCartItems(rawItems) {
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
  return getPurchasableProducts(products)
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

export function getPurchasableProducts(products) {
  if (!Array.isArray(products)) return [];

  return products.flatMap((product) => getPurchasableProductEntries(product));
}

export function getProductCartQuantity(product, cartItems) {
  if (!product || !cartItems) return 0;

  return getPurchasableProductEntries(product).reduce(
    (total, item) => total + (cartItems[item.slug] || 0),
    0,
  );
}

function getPurchasableProductEntries(product) {
  if (!product) return [];

  const options = Array.isArray(product.options) ? product.options : [];
  if (!options.length) return isPurchasableAmount(product.amount) ? [product] : [];

  return options.map((option) => {
    const { options: _options, ...baseProduct } = product;

    return {
      ...baseProduct,
      slug: option.slug,
      name: `${product.name} ${option.label}`.trim(),
      amount: option.amount,
      price: option.price,
      text: option.description || product.text,
      description: option.description || product.description,
      parentSlug: product.slug,
      optionLabel: option.label,
    };
  }).filter((entry) => isPurchasableAmount(entry.amount));
}

function isPurchasableAmount(amount) {
  return Number.parseInt(amount, 10) > 0;
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
