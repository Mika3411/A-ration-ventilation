export async function fetchAdminMembers() {
  const response = await fetch("/api/admin/members");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible de charger les membres.");
  }

  return payload;
}

export async function fetchAdminMemberDetail(memberId) {
  const response = await fetch("/api/admin/members/" + memberId);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible de charger le membre.");
  }

  return payload;
}

export async function updateAdminMember(memberId, memberPayload) {
  const response = await fetch("/api/admin/members/" + memberId, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(memberPayload),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Impossible de modifier le membre.");
  }

  return payload;
}
