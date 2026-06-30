import { cleanSingleLine, normalizeEmail } from "../helpers.js";

const limitStores = new Set();
const cleanupInterval = setInterval(cleanExpiredRateLimits, 5 * 60 * 1000);
cleanupInterval.unref?.();

export const customerLoginRateLimiter = createRateLimiter({
  keyPrefix: "customer-login",
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
  keyGenerator: (request) => `${request.ip}:${normalizeEmail(request.body?.email) || "unknown"}`,
});

export const customerRegisterRateLimiter = createRateLimiter({
  keyPrefix: "customer-register",
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Trop de créations de compte depuis cette adresse. Réessayez plus tard.",
  keyGenerator: (request) => `${request.ip}:${normalizeEmail(request.body?.email) || "unknown"}`,
});

export const adminLoginRateLimiter = createRateLimiter({
  keyPrefix: "admin-login",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Trop de tentatives admin. Réessayez dans quelques minutes.",
  keyGenerator: (request) =>
    `${request.ip}:${cleanSingleLine(request.body?.username, 80) || "admin"}`,
});

export const adminLoginIpRateLimiter = createRateLimiter({
  keyPrefix: "admin-login-ip",
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Trop de tentatives admin depuis cette adresse. Réessayez dans quelques minutes.",
});

export const contactRateLimiter = createRateLimiter({
  keyPrefix: "contact",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Trop de demandes de contact. Réessayez dans quelques minutes.",
});

export const checkoutRateLimiter = createRateLimiter({
  keyPrefix: "checkout",
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: "Trop de tentatives de paiement. Réessayez dans quelques minutes.",
});

export const promoCodeValidationRateLimiter = createRateLimiter({
  keyPrefix: "promo-code-validation",
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Trop de validations de code promo. Réessayez dans quelques minutes.",
});

function createRateLimiter({ keyPrefix, windowMs, max, message, keyGenerator = getIpKey }) {
  const store = new Map();
  limitStores.add(store);

  return function rateLimiter(request, response, next) {
    const now = Date.now();
    const rawKey = keyGenerator(request);
    const key = `${keyPrefix}:${rawKey || getIpKey(request)}`;
    const current = store.get(key);
    const entry =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + windowMs,
          };

    entry.count += 1;
    store.set(key, entry);

    const remaining = Math.max(max - entry.count, 0);
    const retryAfterSeconds = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);

    response.setHeader("RateLimit-Limit", String(max));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      response.setHeader("Retry-After", String(retryAfterSeconds));
      response.status(429).json({ error: message });
      return;
    }

    next();
  };
}

function getIpKey(request) {
  return request.ip || request.get("x-forwarded-for") || request.socket.remoteAddress || "unknown";
}

function cleanExpiredRateLimits() {
  const now = Date.now();

  for (const store of limitStores) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }
}
