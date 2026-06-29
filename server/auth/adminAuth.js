import crypto from "node:crypto";
import express from "express";

import {
  adminCookieName,
  adminPassword,
  adminSessionSecret,
  adminTokenMaxAgeSeconds,
  adminUsername,
  maxPasswordLength,
} from "../config.js";
import { dbPool, getDatabaseInitError } from "../database.js";
import {
  cleanSingleLine,
  clearHttpOnlyCookie,
  constantTimeEqual,
  getCookie,
  setHttpOnlyCookie,
  timingSafeEqualString,
} from "../helpers.js";
import { adminLoginIpRateLimiter, adminLoginRateLimiter } from "../security/rateLimit.js";

export function createAdminAuthRouter() {
  const router = express.Router();

  router.get("/me", (request, response) => {
    const configError = getAdminConfigurationError();
    const admin = configError ? null : getAuthenticatedAdmin(request);

    response.status(200).json({
      admin,
      adminAvailable: !configError,
      error: configError || "",
    });
  });

  router.post("/login", adminLoginIpRateLimiter, adminLoginRateLimiter, (request, response) => {
    const configError = getAdminConfigurationError();

    if (configError) {
      response.status(503).json({ error: configError });
      return;
    }

    const username = cleanSingleLine(request.body?.username, 80) || adminUsername;
    const password = typeof request.body?.password === "string" ? request.body.password : "";

    if (password.length > maxPasswordLength) {
      response.status(401).json({ error: "Identifiants admin incorrects." });
      return;
    }

    if (username !== adminUsername || !constantTimeEqual(password, adminPassword)) {
      response.status(401).json({ error: "Identifiants admin incorrects." });
      return;
    }

    const admin = {
      username: adminUsername,
    };

    setAdminCookie(response, createAdminToken(admin));
    response.status(200).json({ admin });
  });

  router.post("/logout", (_request, response) => {
    clearAdminCookie(response);
    response.status(200).json({ ok: true });
  });

  return router;
}

export function getAdminConfigurationError() {
  if (!adminPassword) return "ADMIN_PASSWORD doit être configuré sur Render.";
  if (!adminSessionSecret) return "ADMIN_SESSION_SECRET doit être configuré sur Render.";
  if (process.env.NODE_ENV === "production" && !dbPool) {
    return "DATABASE_URL doit être configuré pour gérer la boutique sur Render.";
  }
  if (getDatabaseInitError()) return "La base de données boutique n'est pas disponible.";
  return "";
}

export function requireAdmin(request, response, next) {
  const configError = getAdminConfigurationError();

  if (configError) {
    response.status(503).json({ error: configError });
    return;
  }

  const admin = getAuthenticatedAdmin(request);

  if (!admin) {
    response.status(401).json({ error: "Connexion admin requise." });
    return;
  }

  request.admin = admin;
  next();
}

function getAuthenticatedAdmin(request) {
  const token = getCookie(request, adminCookieName);
  const payload = verifyAdminToken(token);

  if (payload?.username !== adminUsername) return null;

  return {
    username: payload.username,
  };
}

function createAdminToken(admin) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    username: admin.username,
    iat: issuedAt,
    exp: issuedAt + adminTokenMaxAgeSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signAdminTokenBody(body)}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== "string") return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  if (!timingSafeEqualString(signAdminTokenBody(body), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const expiresAt = Number.parseInt(payload.exp, 10);

    if (!payload.username || !Number.isInteger(expiresAt) || expiresAt <= Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function signAdminTokenBody(body) {
  return crypto.createHmac("sha256", adminSessionSecret).update(body).digest("base64url");
}

function setAdminCookie(response, token) {
  setHttpOnlyCookie(response, adminCookieName, token, adminTokenMaxAgeSeconds);
}

function clearAdminCookie(response) {
  clearHttpOnlyCookie(response, adminCookieName);
}
