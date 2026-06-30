export async function fetchAdminProducts() {
  const response = await fetch("/api/admin/products");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible de charger les produits.");
  }

  return payload;
}

export async function saveAdminProduct(selectedSlug, productPayload) {
  const response = await fetch(
    selectedSlug ? "/api/admin/products/" + selectedSlug : "/api/admin/products",
    {
      method: selectedSlug ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productPayload),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible d'enregistrer le produit.");
  }

  return payload;
}

export async function archiveAdminProduct(slug) {
  const response = await fetch("/api/admin/products/" + slug, {
    method: "DELETE",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible de supprimer le produit.");
  }

  return payload;
}
