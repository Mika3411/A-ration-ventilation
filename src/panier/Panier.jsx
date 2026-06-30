import { CreditCard, Minus, Plus, Tag, Trash2, X } from "lucide-react";
import { useState } from "react";

import { formatEuroWithCents } from "../utils/format.js";

export function CartCheckout({
  cartCount,
  cartLines,
  checkoutMessage,
  checkoutStatus,
  onApplyPromoCode,
  onCheckout,
  onClearCart,
  onDecreaseItem,
  onIncreaseItem,
  onRemovePromoCode,
  paymentNotice,
  promoCode,
  promoMessage,
  promoMessageType,
  promoStatus,
  promoSummary,
}) {
  const [promoCodeValue, setPromoCodeValue] = useState("");
  const subtotal =
    promoSummary?.subtotal ?? cartLines.reduce((total, line) => total + line.lineTotal, 0);
  const promoDiscountAmount = promoSummary?.discountAmount || 0;
  const total = promoSummary?.total ?? subtotal;
  const hasCartItems = cartLines.length > 0;
  const isCheckingOut = checkoutStatus === "loading";
  const isApplyingPromoCode = promoStatus === "loading";
  const hasPromoDiscount = promoCode && promoDiscountAmount > 0;
  const isPromoBelowMinimum =
    promoCode && promoCode.minimumAmount > 0 && subtotal < promoCode.minimumAmount;

  async function handlePromoSubmit(event) {
    event.preventDefault();
    await onApplyPromoCode(promoCodeValue);
  }

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
              {cartLines.map(({ discount, lineTotal, product, quantity }) => (
                <div className="cart-line" key={product.slug}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{formatEuroWithCents(lineTotal)}</span>
                    {discount && (
                      <small>
                        Remise quantité -{formatDiscountPercent(discount.percent)}
                      </small>
                    )}
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
            <form className="cart-promo-form" onSubmit={handlePromoSubmit}>
              <label>
                <span>Code promo</span>
                <div>
                  <Tag size={18} />
                  <input
                    value={promoCodeValue}
                    onChange={(event) => setPromoCodeValue(event.target.value)}
                    placeholder="Ex : PRO10"
                    disabled={isApplyingPromoCode}
                  />
                </div>
              </label>
              <button type="submit" disabled={isApplyingPromoCode}>
                {isApplyingPromoCode ? "Vérification..." : "Appliquer"}
              </button>
              {promoCode && (
                <p className={hasPromoDiscount ? "cart-promo-applied" : "cart-promo-pending"}>
                  <span>
                    {promoCode.code} -{formatDiscountPercent(promoCode.percent)}
                  </span>
                  <button type="button" onClick={onRemovePromoCode} aria-label="Retirer le code promo">
                    <X size={14} />
                  </button>
                </p>
              )}
              {isPromoBelowMinimum && (
                <small className="cart-promo-warning">
                  Valable à partir de {promoCode.minimumAmountLabel}.
                </small>
              )}
              {promoMessage && (
                <small
                  className={
                    promoMessageType === "error" ? "cart-promo-error" : "cart-promo-success"
                  }
                >
                  {promoMessage}
                </small>
              )}
            </form>
            <div className="cart-checkout-total">
              {hasPromoDiscount && (
                <>
                  <span>Sous-total</span>
                  <em>{formatEuroWithCents(subtotal)}</em>
                  <span>Code promo</span>
                  <small>-{formatEuroWithCents(promoDiscountAmount)}</small>
                </>
              )}
              <span>Total</span>
              <strong>{formatEuroWithCents(total)}</strong>
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

function formatDiscountPercent(percent) {
  return Number.isInteger(percent) ? `${percent}%` : `${String(percent).replace(".", ",")}%`;
}
