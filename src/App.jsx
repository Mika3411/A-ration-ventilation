import { useEffect, useMemo, useState } from "react";

import { defaultProducts, getProductCategories, getProductFromPath, normalizeProducts } from "./data/products.js";

import { pageTitles } from "./data/site.js";

import { BackToTop, Footer, Header } from "./layout/Layout.jsx";

import { CartCheckout } from "./panier/Panier.jsx";

import { cartStorageKey, getCartLines, getCheckoutItems, getInitialPaymentNotice, readStoredCartItems } from "./panier/cart.js";

import { RouteView } from "./router/AppRouter.jsx";

import { useRouter } from "./router/useRouter.js";

export default function App() {
  const { currentPath, navigate } = useRouter();
  const [products, setProducts] = useState(defaultProducts);
  const [cartItems, setCartItems] = useState(readStoredCartItems);
  const [checkoutStatus, setCheckoutStatus] = useState("idle");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [paymentNotice, setPaymentNotice] = useState(getInitialPaymentNotice);
  const [lastAddedProduct, setLastAddedProduct] = useState("");
  const productBySlug = useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products],
  );
  const productCategories = useMemo(() => getProductCategories(products), [products]);
  const cartLines = useMemo(() => getCartLines(products, cartItems), [cartItems, products]);
  const cartCount = useMemo(
    () => Object.values(cartItems).reduce((total, quantity) => total + quantity, 0),
    [cartItems],
  );

  async function refreshProducts() {
    try {
      const response = await fetch("/api/products");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les produits.");
      }

      setProducts(normalizeProducts(payload.products));
    } catch {
      setProducts(defaultProducts);
    }
  }

  useEffect(() => {
    refreshProducts();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    setCartItems((items) =>
      Object.fromEntries(Object.entries(items).filter(([slug]) => productBySlug.has(slug))),
    );
  }, [productBySlug]);

  useEffect(() => {
    if (!paymentNotice) return;

    if (paymentNotice.type === "success") {
      setCartItems({});
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
  }, [paymentNotice]);

  useEffect(() => {
    const currentProduct = getProductFromPath(currentPath, products);
    document.title = currentProduct
      ? `${currentProduct.name} - Aération Ventilation`
      : pageTitles[currentPath] || pageTitles["/"];
  }, [currentPath, products]);

  function handleAddToCart(productSlug) {
    const product = productBySlug.get(productSlug);
    if (!product) return;

    setCartItems((items) => ({
      ...items,
      [productSlug]: Math.min((items[productSlug] || 0) + 1, 99),
    }));
    setLastAddedProduct(product.name);
    setCheckoutMessage("");
  }

  function handleDecreaseCartItem(productSlug) {
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
    setCheckoutMessage("");
  }

  function handleClearCart() {
    setCartItems({});
    setCheckoutMessage("");
  }

  async function handleCheckout() {
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
  }

  return (
    <>
      <Header cartCount={cartCount} currentPath={currentPath} onNavigate={navigate} />
      <CartCheckout
        cartCount={cartCount}
        cartLines={cartLines}
        checkoutMessage={checkoutMessage}
        checkoutStatus={checkoutStatus}
        onCheckout={handleCheckout}
        onClearCart={handleClearCart}
        onDecreaseItem={handleDecreaseCartItem}
        onIncreaseItem={handleAddToCart}
        paymentNotice={paymentNotice}
      />
      <div className="sr-only" role="status" aria-live="polite">
        {lastAddedProduct
          ? `${lastAddedProduct} ajouté au panier. ${cartCount} article${cartCount > 1 ? "s" : ""} au total.`
          : ""}
      </div>
      <main>
        <RouteView
          cartItems={cartItems}
          categories={productCategories}
          currentPath={currentPath}
          onAddToCart={handleAddToCart}
          onNavigate={navigate}
          onProductsChanged={refreshProducts}
          products={products}
        />
      </main>
      <Footer currentPath={currentPath} onNavigate={navigate} />
      <BackToTop />
    </>
  );
}
