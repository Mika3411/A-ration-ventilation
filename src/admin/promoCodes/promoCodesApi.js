export async function fetchAdminPromoCodes() {
  const response = await fetch("/api/admin/promo-codes");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible de charger les codes promo.");
  }

  return payload;
}

export async function saveAdminPromoCode(selectedCode, promoCodePayload) {
  const response = await fetch(
    selectedCode ? "/api/admin/promo-codes/" + selectedCode : "/api/admin/promo-codes",
    {
      method: selectedCode ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(promoCodePayload),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible d'enregistrer le code promo.");
  }

  return payload;
}

export async function deleteAdminPromoCode(code) {
  const response = await fetch("/api/admin/promo-codes/" + code, {
    method: "DELETE",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible de supprimer le code promo.");
  }

  return payload;
}
