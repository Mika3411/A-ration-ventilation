import { useCallback } from "react";

import { useCart } from "./hooks/useCart.js";
import { useCheckout } from "./hooks/useCheckout.js";
import { usePageSeo } from "./hooks/usePageSeo.js";
import { usePaymentNotice } from "./hooks/usePaymentNotice.js";
import { usePromoCode } from "./hooks/usePromoCode.js";
import { useShopProducts } from "./hooks/useShopProducts.js";
import { BackToTop, Footer, Header } from "./layout/Layout.jsx";
import { CartCheckout } from "./panier/Panier.jsx";
import { RouteView } from "./router/AppRouter.jsx";
import { useRouter } from "./router/useRouter.js";

export default function App() {
  const { currentPath, navigate } = useRouter();
  const {
    productBySlug,
    productCategories,
    products,
    productsLoaded,
    refreshProducts,
  } = useShopProducts();
  const {
    addToCart,
    cartCount,
    cartItems,
    cartLines,
    clearCart,
    decreaseCartItem,
    lastAddedProduct,
  } = useCart({ products, productBySlug });
  const {
    activePromoCode,
    applyPromoCode,
    clearPromoCode,
    promoCode,
    promoMessage,
    promoMessageType,
    promoStatus,
    promoSummary,
  } = usePromoCode({ cartItems, cartLines, products });
  const {
    checkout,
    checkoutMessage,
    checkoutStatus,
    clearCheckoutMessage,
  } = useCheckout({ activePromoCode, cartItems, products });

  const handlePaymentSuccess = useCallback(() => {
    clearCart();
    clearPromoCode();
  }, [clearCart, clearPromoCode]);
  const paymentNotice = usePaymentNotice({ onSuccess: handlePaymentSuccess });

  usePageSeo({ currentPath, productCategories, products });

  const handleAddToCart = useCallback(
    (productSlug, quantityToAdd = 1) => {
      if (addToCart(productSlug, quantityToAdd)) {
        clearCheckoutMessage();
      }
    },
    [addToCart, clearCheckoutMessage],
  );

  const handleDecreaseCartItem = useCallback(
    (productSlug) => {
      decreaseCartItem(productSlug);
      clearCheckoutMessage();
    },
    [clearCheckoutMessage, decreaseCartItem],
  );

  const handleClearCart = useCallback(() => {
    clearCart();
    clearPromoCode();
    clearCheckoutMessage();
  }, [clearCart, clearCheckoutMessage, clearPromoCode]);

  const handleApplyPromoCode = useCallback(
    async (code) => {
      const promoApplied = await applyPromoCode(code);

      if (promoApplied) {
        clearCheckoutMessage();
      }
    },
    [applyPromoCode, clearCheckoutMessage],
  );

  return (
    <>
      <Header cartCount={cartCount} currentPath={currentPath} onNavigate={navigate} />
      <CartCheckout
        cartCount={cartCount}
        cartLines={cartLines}
        checkoutMessage={checkoutMessage}
        checkoutStatus={checkoutStatus}
        onApplyPromoCode={handleApplyPromoCode}
        onCheckout={checkout}
        onClearCart={handleClearCart}
        onDecreaseItem={handleDecreaseCartItem}
        onIncreaseItem={handleAddToCart}
        onRemovePromoCode={clearPromoCode}
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
