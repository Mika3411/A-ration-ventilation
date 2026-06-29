export const port = Number.parseInt(process.env.PORT || "10000", 10);

export const authCookieName = "av_session";
export const authTokenMaxAgeSeconds = 60 * 60 * 24 * 14;
export const authSecret =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "aeration-ventilation-local-auth-secret");

export const adminCookieName = "av_admin_session";
export const adminTokenMaxAgeSeconds = 60 * 60 * 8;
export const adminUsername = process.env.ADMIN_USERNAME || "admin";
export const adminPassword = process.env.ADMIN_PASSWORD || "";
export const adminSessionSecret =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "aeration-ventilation-local-admin-secret");

export const passwordHashOptions = {
  digest: "sha256",
  iterations: 310000,
  keyLength: 32,
};
