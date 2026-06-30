async function mutateAdminCategory(endpoint, options, fallbackMessage) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage);
  }

  return payload;
}

export function createAdminCategory(name) {
  return mutateAdminCategory(
    "/api/admin/categories",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    "Impossible de créer la catégorie.",
  );
}

export function renameAdminCategory(currentName, name) {
  return mutateAdminCategory(
    "/api/admin/categories",
    {
      method: "PUT",
      body: JSON.stringify({ currentName, name }),
    },
    "Impossible de renommer la catégorie.",
  );
}

export function deleteAdminCategory(name) {
  return mutateAdminCategory(
    "/api/admin/categories",
    {
      method: "DELETE",
      body: JSON.stringify({ name }),
    },
    "Impossible de supprimer la catégorie.",
  );
}
