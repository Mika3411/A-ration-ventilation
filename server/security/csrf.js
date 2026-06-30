export const adminCsrfError = "Requête admin refusée: origine non autorisée.";
export const clientCsrfError = "Requête refusée: origine non autorisée.";

const protectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
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

export function clientCsrfProtection(request, response, next) {
  if (!protectedMethods.has(request.method)) {
    next();
    return;
  }

  if (!isAllowedClientRequestOrigin(request)) {
    response.status(403).json({ error: clientCsrfError });
    return;
  }

  next();
}

export function isAllowedAdminRequestOrigin(request) {
  return isAllowedRequestOrigin(request, {
    allowDevelopmentRequestOrigin: false,
    allowDevelopmentLocalhost: true,
  });
}

export function isAllowedClientRequestOrigin(request) {
  return isAllowedRequestOrigin(request, {
    allowDevelopmentRequestOrigin: true,
    allowDevelopmentLocalhost: true,
  });
}

function isAllowedRequestOrigin(
  request,
  { allowDevelopmentRequestOrigin, allowDevelopmentLocalhost },
) {
  const sourceUrl = request.get("origin") || request.get("referer");
  const requestOrigin = parseOrigin(sourceUrl);

  if (!requestOrigin) return false;

  if (process.env.NODE_ENV === "production") {
    const siteOrigin = parseOrigin(process.env.SITE_URL);
    return Boolean(siteOrigin && requestOrigin === siteOrigin);
  }

  if (allowDevelopmentRequestOrigin && requestOrigin === getRequestOrigin(request)) {
    return true;
  }

  return allowDevelopmentLocalhost && isLocalhostOrigin(requestOrigin);
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

function getRequestOrigin(request) {
  const host = request.get("host");
  if (!host) return "";

  const protocol = request.get("x-forwarded-proto") || request.protocol || "http";
  return parseOrigin(`${protocol}://${host}`);
}
