const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const euroFormatterWithCents = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizeEuroSpaces(value) {
  return value.replace(/\u00a0/g, " ");
}

export function formatEuro(amount) {
  return normalizeEuroSpaces(euroFormatter.format(amount / 100));
}

export function formatEuroWithCents(amount) {
  return normalizeEuroSpaces(euroFormatterWithCents.format(amount / 100));
}
