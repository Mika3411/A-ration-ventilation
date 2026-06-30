import { useEffect, useMemo, useState } from "react";

import {
  defaultProducts,
  getProductCategories,
  getProductFromPath,
  normalizeCategories,
  normalizeProducts,
} from "./data/products.js";

import { getCategoryFromPath } from "./data/categories.js";
import { getPageSeo, getStructuredData } from "./data/seo.js";

import { BackToTop, Footer, Header } from "./layout/Layout.jsx";

import { CartCheckout } from "./panier/Panier.jsx";

import {
  cartStorageKey,
  getCartLines,
  getCheckoutItems,
  getInitialPaymentNotice,
  getPurchasableProducts,
  readStoredCartItems,
} from "./panier/cart.js";

import { RouteView } from "./router/AppRouter.jsx";

import { useRouter } from "./router/useRouter.js";
import { getPromoCartSummary, normalizePromoCode } from "../shared/pricing.js";

export default function App() {
  const { currentPath, navigate } = useRouter();
  const [products, setProducts] = useState(defaultProducts);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [categories, setCategories] = useState(() => normalizeCategories(null, defaultProducts));
  const [cartItems, setCartItems] = useState(readStoredCartItems);
  const [checkoutStatus, setCheckoutStatus] = useState("idle");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [promoCode, setPromoCode] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoMessageType, setPromoMessageType] = useState("success");
  const [promoStatus, setPromoStatus] = useState("idle");
  const [paymentNotice, setPaymentNotice] = useState(getInitialPaymentNotice);
  const [lastAddedProduct, setLastAddedProduct] = useState("");
  const purchasableProducts = useMemo(() => getPurchasableProducts(products), [products]);
  const productBySlug = useMemo(
    () => new Map(purchasableProducts.map((product) => [product.slug, product])),
    [purchasableProducts],
  );
  const productCategories = useMemo(() => getProductCategories(products, categories), [categories, products]);
  const cartLines = useMemo(() => getCartLines(products, cartItems), [cartItems, products]);
  const promoSummary = useMemo(() => getPromoCartSummary(cartLines, promoCode), [cartLines, promoCode]);
  const activePromoCode = promoSummary.discountAmount > 0 ? promoCode : null;
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

      const loadedProducts = normalizeProducts(payload.products);
      setProducts(loadedProducts);
      setCategories(normalizeCategories(payload.categories, loadedProducts));
    } catch {
      setProducts(defaultProducts);
      setCategories(normalizeCategories(null, defaultProducts));
    } finally {
      setProductsLoaded(true);
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
      setPromoCode(null);
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
  }, [paymentNotice]);

  useEffect(() => {
    const currentProduct = getProductFromPath(currentPath, products);
    const currentCategory = getCategoryFromPath(currentPath, productCategories);
    const seo = getPageSeo(currentPath, currentProduct, currentCategory);
    const canonicalUrl = getCanonicalUrl(currentPath);

    document.title = seo.title;
    setLinkHref("canonical", canonicalUrl);
    setMetaContent("description", seo.description);
    setMetaContent("twitter:title", seo.title);
    setMetaContent("twitter:description", seo.description);
    setMetaProperty("og:title", seo.title);
    setMetaProperty("og:description", seo.description);
    setMetaProperty("og:url", canonicalUrl);
    setStructuredData(getStructuredData(currentPath, currentProduct, canonicalUrl, currentCategory));

    if (seo.robots) {
      setMetaContent("robots", seo.robots);
    } else {
      removeMetaContent("robots");
    }
  }, [currentPath, productCategories, products]);

  function handleAddToCart(productSlug, quantityToAdd = 1) {
    const product = productBySlug.get(productSlug);
    if (!product) return;

    const safeQuantityToAdd = Math.min(
      Math.max(Number.parseInt(quantityToAdd, 10) || 1, 1),
      99,
    );

    setCartItems((items) => ({
      ...items,
      [productSlug]: Math.min((items[productSlug] || 0) + safeQuantityToAdd, 99),
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
    setPromoCode(null);
    setPromoMessage("");
    setCheckoutMessage("");
  }

  async function handleApplyPromoCode(code) {
    const normalizedCode = normalizePromoCode(code);

    if (!normalizedCode) {
      setPromoCode(null);
      setPromoMessageType("error");
      setPromoMessage("Indiquez un code promo.");
      return;
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
      setCheckoutMessage("");
    } catch (error) {
      setPromoCode(null);
      setPromoStatus("idle");
      setPromoMessageType("error");
      setPromoMessage(error instanceof Error ? error.message : "Code promo invalide.");
    }
  }

  function handleRemovePromoCode() {
    setPromoCode(null);
    setPromoMessage("");
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
  }

  return (
    <>
      <Header cartCount={cartCount} currentPath={currentPath} onNavigate={navigate} />
      <CartCheckout
        cartCount={cartCount}
        cartLines={cartLines}
        checkoutMessage={checkoutMessage}
        checkoutStatus={checkoutStatus}
        onApplyPromoCode={handleApplyPromoCode}
        onCheckout={handleCheckout}
        onClearCart={handleClearCart}
        onDecreaseItem={handleDecreaseCartItem}
        onIncreaseItem={handleAddToCart}
        onRemovePromoCode={handleRemovePromoCode}
        paymentNotice={paymentNotice}
        promoCode={promoCode}
        promoMessage={promoMessage}
        promoMessageType={promoMessageType}
        promoStatus={promoStatus}
        promoSummary={promoSummary}
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
          productsLoaded={productsLoaded}
        />
      </main>
      <Footer currentPath={currentPath} onNavigate={navigate} />
      <BackToTop />
    </>
  );
}

function setMetaContent(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function setMetaProperty(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function setLinkHref(rel, href) {
  let link = document.querySelector(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}

function setStructuredData(structuredData) {
  const selector = 'script[type="application/ld+json"][data-seo-jsonld="primary"]';
  let script = document.querySelector(selector);

  if (!structuredData) {
    script?.remove();
    return;
  }

  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-seo-jsonld", "primary");
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(structuredData);
}

function removeMetaContent(name) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
}

function getCanonicalUrl(pathname) {
  const currentCanonical = document.querySelector('link[rel="canonical"]')?.href;
  const origin = currentCanonical ? new URL(currentCanonical).origin : window.location.origin;

  return new URL(pathname, `${origin}/`).toString();
}
