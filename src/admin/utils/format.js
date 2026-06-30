const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
});

export function parseEuroAmountToCents(value) {
  const amount = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : -1;
}

export function parseDiscountPercent(value) {
  const percent = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(percent) ? Math.round(percent * 100) / 100 : -1;
}

export function formatAdminDate(value) {
  if (!value) return "Non renseigné";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";

  return dateFormatter.format(date);
}

export function formatAdminDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export function formatAdminPercent(value) {
  const percent = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(percent)) return "";
  return Number.isInteger(percent) ? `${percent}%` : `${String(percent).replace(".", ",")}%`;
}
