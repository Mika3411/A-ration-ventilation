const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatEuro(amount) {
  return euroFormatter.format(amount / 100).replace(/\u00a0/g, " ");
}
