import { useCallback, useEffect, useMemo, useState } from "react";

import {
  cartStorageKey,
  getCartLines,
  readStoredCartItems,
} from "../panier/cart.js";

export function useCart({ products, productBySlug }) {
  const [cartItems, setCartItems] = useState(readStoredCartItems);
  const [lastAddedProduct, setLastAddedProduct] = useState("");
  const cartLines = useMemo(() => getCartLines(products, cartItems), [cartItems, products]);
  const cartCount = useMemo(
    () => Object.values(cartItems).reduce((total, quantity) => total + quantity, 0),
    [cartItems],
  );

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    setCartItems((items) =>
      Object.fromEntries(Object.entries(items).filter(([slug]) => productBySlug.has(slug))),
    );
  }, [productBySlug]);

  const addToCart = useCallback(
    (productSlug, quantityToAdd = 1) => {
      const product = productBySlug.get(productSlug);
      if (!product) return false;

      const safeQuantityToAdd = Math.min(
        Math.max(Number.parseInt(quantityToAdd, 10) || 1, 1),
        99,
      );

      setCartItems((items) => ({
        ...items,
        [productSlug]: Math.min((items[productSlug] || 0) + safeQuantityToAdd, 99),
      }));
      setLastAddedProduct(product.name);
      return true;
    },
    [productBySlug],
  );

  const decreaseCartItem = useCallback((productSlug) => {
    setCartItems((items) => {
      const quantity = (items[productSlug] || 0) - 1;

      if (quantity <= 0) {
        const nextItems = { ...items };
        delete nextItems[productSlug];
        return nextItems;
      }

      return {
        ...items,
        [productSlug]: quantity,
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems({});
  }, []);

  return {
    addToCart,
    cartCount,
    cartItems,
    cartLines,
    clearCart,
    decreaseCartItem,
    lastAddedProduct,
  };
}
