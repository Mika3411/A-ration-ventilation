const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' https://www.google.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
].join("; ");

export function securityHeaders(_request, response, next) {
  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Origin-Agent-Cluster", "?1");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-DNS-Prefetch-Control", "off");
  response.setHeader("X-Download-Options", "noopen");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  response.setHeader("X-XSS-Protection", "0");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), serial=()",
  );

  if (process.env.NODE_ENV === "production") {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}
