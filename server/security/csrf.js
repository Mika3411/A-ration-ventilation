export const adminCsrfError = "Requête admin refusée: origine non autorisée.";

const protectedMethods = new Set(["POST", "PUT", "DELETE"]);
const localhostNames = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function adminCsrfProtection(request, response, next) {
  if (!protectedMethods.has(request.method)) {
    next();
    return;
  }

  if (!isAllowedAdminRequestOrigin(request)) {
    response.status(403).json({ error: adminCsrfError });
    return;
  }

  next();
}

export function isAllowedAdminRequestOrigin(request) {
  const sourceUrl = request.get("origin") || request.get("referer");
  const requestOrigin = parseOrigin(sourceUrl);

  if (!requestOrigin) return false;

  if (process.env.NODE_ENV === "production") {
    const siteOrigin = parseOrigin(process.env.SITE_URL);
    return Boolean(siteOrigin && requestOrigin === siteOrigin);
  }

  return isLocalhostOrigin(requestOrigin);
}

function parseOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function isLocalhostOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return localhostNames.has(hostname);
  } catch {
    return false;
  }
}
