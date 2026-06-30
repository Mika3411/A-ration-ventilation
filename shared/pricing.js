export const maxCartQuantity = 99;
export const minDiscountQuantity = 2;
export const maxDiscountPercent = 99.99;
export const maxPromoCodeLength = 32;

export function normalizeQuantityDiscounts(discounts) {
  if (!Array.isArray(discounts)) return [];

  return discounts
    .map((discount) => {
      const minQuantity = Number.parseInt(discount?.minQuantity, 10);
      const percent = Number.parseFloat(String(discount?.percent).replace(",", "."));

      if (
        !Number.isInteger(minQuantity) ||
        minQuantity < minDiscountQuantity ||
        minQuantity > maxCartQuantity ||
        !Number.isFinite(percent) ||
        percent <= 0 ||
        percent > maxDiscountPercent
      ) {
        return null;
      }

      return {
        minQuantity,
        percent: Math.round(percent * 100) / 100,
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.minQuantity - second.minQuantity);
}

export function normalizeCartQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  if (!Number.isInteger(quantity)) return 1;

  return Math.min(Math.max(quantity, 1), maxCartQuantity);
}

export function getQuantityDiscount(discounts, quantity) {
  const normalizedQuantity = normalizeCartQuantity(quantity);

  return normalizeQuantityDiscounts(discounts).reduce(
    (activeDiscount, discount) =>
      normalizedQuantity >= discount.minQuantity ? discount : activeDiscount,
    null,
  );
}

export function getDiscountedUnitAmount(amount, quantity, discounts) {
  const unitAmount = Number.parseInt(amount, 10);
  if (!Number.isInteger(unitAmount) || unitAmount <= 0) return 0;

  const discount = getQuantityDiscount(discounts, quantity);
  if (!discount) return unitAmount;

  return Math.max(0, Math.round(unitAmount * ((100 - discount.percent) / 100)));
}

export function getDiscountedLineTotal(amount, quantity, discounts) {
  const normalizedQuantity = normalizeCartQuantity(quantity);
  return getDiscountedUnitAmount(amount, normalizedQuantity, discounts) * normalizedQuantity;
}

export function normalizePromoCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, maxPromoCodeLength);
}

export function normalizePromoCodeRecord(promoCode) {
  if (!promoCode || typeof promoCode !== "object") return null;

  const code = normalizePromoCode(promoCode.code);
  const percent = Number.parseFloat(String(promoCode.percent).replace(",", "."));
  const minimumAmount = Number.parseInt(promoCode.minimumAmount, 10);

  if (!code || !Number.isFinite(percent) || percent <= 0 || percent > maxDiscountPercent) {
    return null;
  }

  return {
    code,
    percent: Math.round(percent * 100) / 100,
    minimumAmount: Number.isInteger(minimumAmount) && minimumAmount > 0 ? minimumAmount : 0,
    startsAt: promoCode.startsAt || "",
    endsAt: promoCode.endsAt || "",
    active: promoCode.active !== false,
  };
}

export function isPromoCodeCurrentlyActive(promoCode, now = new Date()) {
  const normalizedPromoCode = normalizePromoCodeRecord(promoCode);
  if (!normalizedPromoCode || !normalizedPromoCode.active) return false;

  const nowTime = now.getTime();
  const startsAtTime = normalizedPromoCode.startsAt
    ? new Date(normalizedPromoCode.startsAt).getTime()
    : 0;
  const endsAtTime = normalizedPromoCode.endsAt
    ? new Date(normalizedPromoCode.endsAt).getTime()
    : 0;

  if (startsAtTime && Number.isFinite(startsAtTime) && nowTime < startsAtTime) return false;
  if (endsAtTime && Number.isFinite(endsAtTime) && nowTime > endsAtTime) return false;

  return true;
}

export function getPromoDiscountedUnitAmount(unitAmount, promoCode) {
  const amount = Number.parseInt(unitAmount, 10);
  if (!Number.isInteger(amount) || amount <= 0) return 0;

  const normalizedPromoCode = normalizePromoCodeRecord(promoCode);
  if (!normalizedPromoCode) return amount;

  return Math.max(0, Math.round(amount * ((100 - normalizedPromoCode.percent) / 100)));
}

export function getPromoCartSummary(cartLines, promoCode) {
  const lines = Array.isArray(cartLines) ? cartLines : [];
  const subtotal = lines.reduce(
    (total, line) => total + (Number.parseInt(line?.lineTotal, 10) || 0),
    0,
  );
  const normalizedPromoCode = normalizePromoCodeRecord(promoCode);

  if (!normalizedPromoCode || subtotal < normalizedPromoCode.minimumAmount) {
    return {
      subtotal,
      discountAmount: 0,
      total: subtotal,
    };
  }

  const total = lines.reduce((nextTotal, line) => {
    const quantity = normalizeCartQuantity(line?.quantity);
    const unitAmount =
      Number.parseInt(line?.unitAmount, 10) ||
      Math.round((Number.parseInt(line?.lineTotal, 10) || 0) / quantity);

    return nextTotal + getPromoDiscountedUnitAmount(unitAmount, normalizedPromoCode) * quantity;
  }, 0);

  return {
    subtotal,
    discountAmount: Math.max(0, subtotal - total),
    total,
  };
}
