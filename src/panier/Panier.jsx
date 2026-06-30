import { CreditCard, Minus, Plus, Trash2 } from "lucide-react";

import { formatEuroWithCents } from "../utils/format.js";

export function CartCheckout({
  cartCount,
  cartLines,
  checkoutMessage,
  checkoutStatus,
  onCheckout,
  onClearCart,
  onDecreaseItem,
  onIncreaseItem,
  paymentNotice,
}) {
  const subtotal = cartLines.reduce((total, line) => total + line.lineTotal, 0);
  const hasCartItems = cartLines.length > 0;
  const isCheckingOut = checkoutStatus === "loading";

  if (!hasCartItems && !paymentNotice) return null;

  return (
    <section className="cart-checkout-section" aria-label="Panier et paiement">
      <div className="container cart-checkout-layout">
        {paymentNotice && (
          <p className={`payment-notice payment-notice-${paymentNotice.type}`} role="status">
            {paymentNotice.text}
          </p>
        )}
        {hasCartItems && (
          <div className="cart-checkout-panel">
            <div className="cart-checkout-head">
              <div>
                <span>Panier</span>
                <strong>
                  {cartCount} article{cartCount > 1 ? "s" : ""}
                </strong>
              </div>
              <button
                className="cart-clear-button"
                type="button"
                onClick={onClearCart}
                aria-label="Vider le panier"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="cart-lines">
              {cartLines.map(({ lineTotal, product, quantity }) => (
                <div className="cart-line" key={product.slug}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{formatEuroWithCents(lineTotal)}</span>
                  </div>
                  <div className="cart-quantity-controls" aria-label={`Quantité ${product.name}`}>
                    <button
                      type="button"
                      onClick={() => onDecreaseItem(product.slug)}
                      aria-label={`Retirer un ${product.name}`}
                    >
                      <Minus size={16} />
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onIncreaseItem(product.slug)}
                      aria-label={`Ajouter un ${product.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-checkout-total">
              <span>Total</span>
              <strong>{formatEuroWithCents(subtotal)}</strong>
            </div>
            <button
              className="button button-primary cart-checkout-button"
              type="button"
              onClick={onCheckout}
              disabled={isCheckingOut}
            >
              <CreditCard size={18} />
              {isCheckingOut ? "Ouverture de Stripe..." : "Paiement sécurisé"}
            </button>
            {checkoutMessage && (
              <p className="form-error cart-checkout-message" role="alert">
                {checkoutMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
