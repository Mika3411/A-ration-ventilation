import crypto from "node:crypto";
import { promisify } from "node:util";
import express from "express";

import {
  authCookieName,
  authSecret,
  authTokenMaxAgeSeconds,
  passwordHashOptions,
} from "../config.js";
import { databaseReady, dbPool, getDatabaseInitError } from "../database.js";
import {
  cleanSingleLine,
  clearHttpOnlyCookie,
  getCookie,
  isValidEmail,
  normalizeEmail,
  setHttpOnlyCookie,
  timingSafeEqualString,
} from "../helpers.js";
import { customerLoginRateLimiter, customerRegisterRateLimiter } from "../security/rateLimit.js";

const pbkdf2 = promisify(crypto.pbkdf2);

export function createCustomerAuthRouter() {
  const router = express.Router();

  router.get("/me", async (request, response) => {
    try {
      const customer = await getAuthenticatedCustomer(request);
      const configError = await getAuthConfigurationError();
      response.status(200).json({
        user: customer,
        authAvailable: !configError,
      });
    } catch (error) {
      console.error("Customer session lookup failed:", error);
      response.status(200).json({ user: null, authAvailable: false });
    }
  });

  router.post("/register", customerRegisterRateLimiter, async (request, response) => {
    const configError = await getAuthConfigurationError();
    if (configError) {
      response.status(503).json({ error: configError });
      return;
    }

    const firstName = cleanSingleLine(request.body?.firstName, 80);
    const lastName = cleanSingleLine(request.body?.lastName, 80);
    const company = cleanSingleLine(request.body?.company, 120);
    const phone = cleanSingleLine(request.body?.phone, 80);
    const email = normalizeEmail(request.body?.email);
    const password = typeof request.body?.password === "string" ? request.body.password : "";

    if (!firstName || !lastName || !email || !password) {
      response.status(400).json({ error: "Merci de compléter les champs obligatoires." });
      return;
    }

    if (!isValidEmail(email)) {
      response.status(400).json({ error: "Merci d'indiquer une adresse email valide." });
      return;
    }

    if (password.length < 8) {
      response.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }

    try {
      const { hash, salt } = await hashPassword(password);
      const publicId = crypto.randomUUID();
      const result = await dbPool.query(
        `
          INSERT INTO customer_accounts (
            public_id,
            first_name,
            last_name,
            company,
            phone,
            email,
            password_hash,
            password_salt
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (email) DO NOTHING
          RETURNING public_id, first_name, last_name, company, phone, email, created_at
        `,
        [publicId, firstName, lastName, company, phone, email, hash, salt],
      );

      if (result.rowCount === 0) {
        response.status(409).json({ error: "Un compte existe déjà avec cette adresse email." });
        return;
      }

      const customer = serializeCustomer(result.rows[0]);
      setAuthCookie(response, createAuthToken(customer));
      response.status(201).json({ user: customer });
    } catch (error) {
      console.error("Customer registration failed:", error);
      response.status(500).json({ error: "Impossible de créer le compte pour le moment." });
    }
  });

  router.post("/login", customerLoginRateLimiter, async (request, response) => {
    const configError = await getAuthConfigurationError();
    if (configError) {
      response.status(503).json({ error: configError });
      return;
    }

    const email = normalizeEmail(request.body?.email);
    const password = typeof request.body?.password === "string" ? request.body.password : "";

    if (!email || !password) {
      response.status(400).json({ error: "Merci d'indiquer votre email et votre mot de passe." });
      return;
    }

    try {
      const result = await dbPool.query(
        `
          SELECT public_id, first_name, last_name, company, phone, email, password_hash, password_salt, created_at
          FROM customer_accounts
          WHERE email = $1
          LIMIT 1
        `,
        [email],
      );
      const row = result.rows[0];

      if (!row || !(await verifyPassword(password, row.password_salt, row.password_hash))) {
        response.status(401).json({ error: "Email ou mot de passe incorrect." });
        return;
      }

      const customer = serializeCustomer(row);
      setAuthCookie(response, createAuthToken(customer));
      response.status(200).json({ user: customer });
    } catch (error) {
      console.error("Customer login failed:", error);
      response.status(500).json({ error: "Impossible de se connecter pour le moment." });
    }
  });

  router.post("/logout", (_request, response) => {
    clearAuthCookie(response);
    response.status(200).json({ ok: true });
  });

  return router;
}

export async function getAuthConfigurationError() {
  if (!dbPool) {
    return "L'espace client n'est pas encore relié à Render Postgres. Ajoutez DATABASE_URL.";
  }

  if (!authSecret) {
    return "La clé de session AUTH_SECRET n'est pas configurée.";
  }

  await databaseReady;

  if (getDatabaseInitError()) {
    return "La base client n'est pas disponible pour le moment.";
  }

  return "";
}

export async function getAuthenticatedCustomer(request) {
  const configError = await getAuthConfigurationError();
  if (configError) return null;

  const token = getCookie(request, authCookieName);
  const payload = verifyAuthToken(token);

  if (!payload?.sub) return null;

  const result = await dbPool.query(
    `
      SELECT public_id, first_name, last_name, company, phone, email, created_at
      FROM customer_accounts
      WHERE public_id = $1
      LIMIT 1
    `,
    [payload.sub],
  );

  return result.rows[0] ? serializeCustomer(result.rows[0]) : null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = await derivePasswordHash(password, salt);
  return { hash, salt };
}

async function verifyPassword(password, salt, expectedHash) {
  const hash = await derivePasswordHash(password, salt);
  return timingSafeEqualString(hash, expectedHash);
}

async function derivePasswordHash(password, salt) {
  const hash = await pbkdf2(
    password,
    salt,
    passwordHashOptions.iterations,
    passwordHashOptions.keyLength,
    passwordHashOptions.digest,
  );
  return hash.toString("base64url");
}

function createAuthToken(customer) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: customer.id,
    email: customer.email,
    iat: issuedAt,
    exp: issuedAt + authTokenMaxAgeSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signAuthTokenBody(body)}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== "string") return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  if (!timingSafeEqualString(signAuthTokenBody(body), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const expiresAt = Number.parseInt(payload.exp, 10);

    if (!payload.sub || !Number.isInteger(expiresAt) || expiresAt <= Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function signAuthTokenBody(body) {
  return crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
}

function setAuthCookie(response, token) {
  setHttpOnlyCookie(response, authCookieName, token, authTokenMaxAgeSeconds);
}

function clearAuthCookie(response) {
  clearHttpOnlyCookie(response, authCookieName);
}

function serializeCustomer(row) {
  return {
    id: row.public_id,
    firstName: row.first_name,
    lastName: row.last_name,
    company: row.company || "",
    phone: row.phone || "",
    email: row.email,
    createdAt: row.created_at,
  };
}
