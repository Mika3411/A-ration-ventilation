export async function fetchAdminSession() {
  const response = await fetch("/api/admin/me");
  return response.json().catch(() => ({}));
}

export async function loginAdmin(loginForm) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginForm),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Connexion impossible.");
  }

  return payload;
}

export async function logoutAdmin() {
  await fetch("/api/admin/logout", { method: "POST" });
}
