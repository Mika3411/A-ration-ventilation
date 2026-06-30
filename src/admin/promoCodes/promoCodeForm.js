import { formatAdminDateTimeInput, parseDiscountPercent, parseEuroAmountToCents } from "../utils/format.js";

export const emptyAdminPromoCodeForm = {
  code: "",
  percent: "",
  minimumAmount: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

export function getAdminPromoCodeForm(promoCode) {
  if (!promoCode) return emptyAdminPromoCodeForm;

  return {
    code: promoCode.code || "",
    percent: String(promoCode.percent || "").replace(".", ","),
    minimumAmount: promoCode.minimumAmount ? String(promoCode.minimumAmount / 100).replace(".", ",") : "",
    startsAt: formatAdminDateTimeInput(promoCode.startsAt),
    endsAt: formatAdminDateTimeInput(promoCode.endsAt),
    active: promoCode.active !== false,
  };
}

export function getAdminPromoCodePayload(form) {
  return {
    code: form.code,
    percent: parseDiscountPercent(form.percent),
    minimumAmount: form.minimumAmount ? parseEuroAmountToCents(form.minimumAmount) : 0,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    active: form.active,
  };
}
