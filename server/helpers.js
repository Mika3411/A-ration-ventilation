import crypto from "node:crypto";

export function getCookie(request, name) {
  const cookieHeader = request.get("cookie");
  if (!cookieHeader) return "";

  for (const cookie of cookieHeader.split(";")) {
    const [key, ...valueParts] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }

  return "";
}

export function setHttpOnlyCookie(response, name, value, maxAgeSeconds) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.setHeader("Set-Cookie", attributes.join("; "));
}

export function clearHttpOnlyCookie(response, name) {
  const attributes = [
    `${name}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  response.setHeader("Set-Cookie", attributes.join("; "));
}

export function constantTimeEqual(value, expectedValue) {
  const valueDigest = crypto.createHash("sha256").update(value).digest("base64url");
  const expectedDigest = crypto.createHash("sha256").update(expectedValue).digest("base64url");
  return timingSafeEqualString(valueDigest, expectedDigest);
}

export function timingSafeEqualString(value, expectedValue) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expectedValue);

  if (valueBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

export function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 180);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getRequestOrigin(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");

  const origin = request.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  const protocol = request.get("x-forwarded-proto") || request.protocol;
  return `${protocol}://${request.get("host")}`;
}

export function cleanSingleLine(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function cleanMessage(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

export function formatEuroAmount(amount) {
  return `${Math.round(amount / 100).toLocaleString("fr-FR")} €`;
}

export function slugify(value) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "produit";
}

export function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
