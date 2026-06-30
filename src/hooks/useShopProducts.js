import { useCallback, useEffect, useMemo, useState } from "react";

import {
  defaultProducts,
  getProductCategories,
  normalizeCategories,
  normalizeProducts,
} from "../data/products.js";
import { getPurchasableProducts } from "../panier/cart.js";

export function useShopProducts() {
  const [products, setProducts] = useState(defaultProducts);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [categories, setCategories] = useState(() => normalizeCategories(null, defaultProducts));
  const purchasableProducts = useMemo(() => getPurchasableProducts(products), [products]);
  const productBySlug = useMemo(
    () => new Map(purchasableProducts.map((product) => [product.slug, product])),
    [purchasableProducts],
  );
  const productCategories = useMemo(() => getProductCategories(products, categories), [categories, products]);

  const refreshProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les produits.");
      }

      const loadedProducts = normalizeProducts(payload.products);
      setProducts(loadedProducts);
      setCategories(normalizeCategories(payload.categories, loadedProducts));
    } catch {
      setProducts(defaultProducts);
      setCategories(normalizeCategories(null, defaultProducts));
    } finally {
      setProductsLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  return {
    productBySlug,
    productCategories,
    products,
    productsLoaded,
    refreshProducts,
  };
}
