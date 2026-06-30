import crypto from "node:crypto";
import { promisify } from "node:util";
import express from "express";

import {
  authCookieName,
  authSecret,
  authTokenMaxAgeSeconds,
  maxPasswordLength,
  passwordHashOptions,
} from "../config.js";
import { databaseReady, dbPool, getDatabaseInitError } from "../database.js";
import { getMailFromAddress, getMailTransport, getMissingMailConfig } from "../email/mailer.js";
import {
  cleanSingleLine,
  clearHttpOnlyCookie,
  escapeHtml,
  getCookie,
  getRequestOrigin,
  isValidEmail,
  normalizeEmail,
  setHttpOnlyCookie,
  timingSafeEqualString,
} from "../helpers.js";
import { customerLoginRateLimiter, customerRegisterRateLimiter } from "../security/rateLimit.js";

const pbkdf2 = promisify(crypto.pbkdf2);
const emailVerificationTokenMaxAgeMs = 1000 * 60 * 60 * 24;

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

  router.get("/verify-email", async (request, response) => {
    const configError = await getAuthConfigurationError();
    if (configError) {
      response.status(503).send(configError);
      return;
    }

    const token = typeof request.query?.token === "string" ? request.query.token : "";
    if (!token) {
      response.redirect(303, "/espace-client?email=invalid");
      return;
    }

    try {
      const tokenHash = hashEmailVerificationToken(token);
      const result = await dbPool.query(
        `
          UPDATE customer_accounts
          SET
            email_verified_at = NOW(),
            email_verification_token_hash = '',
            email_verification_token_expires_at = NULL,
            updated_at = NOW()
          WHERE email_verification_token_hash = $1
            AND email_verification_token_expires_at > NOW()
          RETURNING public_id, first_name, last_name, company, phone, email, created_at
        `,
        [tokenHash],
      );

      if (result.rowCount === 0) {
        response.redirect(303, "/espace-client?email=invalid");
        return;
      }

      const customer = serializeCustomer(result.rows[0]);
      setAuthCookie(response, createAuthToken(customer));
      response.redirect(303, "/espace-client?email=verified");
    } catch (error) {
      console.error("Customer email verification failed:", error);
      response.redirect(303, "/espace-client?email=invalid");
    }
  });

  router.put("/me", async (request, response) => {
    const configError = await getAuthConfigurationError();
    if (configError) {
      response.status(503).json({ error: configError });
      return;
    }

    const customer = await getAuthenticatedCustomer(request);
    if (!customer) {
      response.status(401).json({ error: "Merci de vous connecter pour modifier votre profil." });
      return;
    }

    const input = normalizeCustomerProfileInput(request.body);
    if (input.error) {
      response.status(400).json({ error: input.error });
      return;
    }

    try {
      const result = await dbPool.query(
        `
          UPDATE customer_accounts
          SET
            first_name = $1,
            last_name = $2,
            company = $3,
            phone = $4,
            email = $5,
            updated_at = NOW()
          WHERE public_id = $6
          RETURNING public_id, first_name, last_name, company, phone, email, created_at
        `,
        [
          input.firstName,
          input.lastName,
          input.company,
          input.phone,
          input.email,
          customer.id,
        ],
      );

      if (result.rowCount === 0) {
        response.status(404).json({ error: "Compte client introuvable." });
        return;
      }

      const updatedCustomer = serializeCustomer(result.rows[0]);
      setAuthCookie(response, createAuthToken(updatedCustomer));
      response.status(200).json({ user: updatedCustomer });
    } catch (error) {
      if (error?.code === "23505") {
        response.status(409).json({ error: "Un compte existe déjà avec cette adresse email." });
        return;
      }

      console.error("Customer profile update failed:", error);
      response.status(500).json({ error: "Impossible de modifier le profil pour le moment." });
    }
  });

  router.put("/password", async (request, response) => {
    const configError = await getAuthConfigurationError();
    if (configError) {
      response.status(503).json({ error: configError });
      return;
    }

    const customer = await getAuthenticatedCustomer(request);
    if (!customer) {
      response
        .status(401)
        .json({ error: "Merci de vous connecter pour modifier votre mot de passe." });
      return;
    }

    const currentPassword =
      typeof request.body?.currentPassword === "string" ? request.body.currentPassword : "";
    const newPassword = typeof request.body?.newPassword === "string" ? request.body.newPassword : "";
    const confirmPassword =
      typeof request.body?.confirmPassword === "string" ? request.body.confirmPassword : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      response.status(400).json({ error: "Merci de compléter tous les champs mot de passe." });
      return;
    }

    if (newPassword !== confirmPassword) {
      response.status(400).json({ error: "Les nouveaux mots de passe ne correspondent pas." });
      return;
    }

    if (newPassword.length < 8) {
      response.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }

    if (currentPassword.length > maxPasswordLength || newPassword.length > maxPasswordLength) {
      response.status(400).json({ error: "Le mot de passe ne doit pas dépasser 128 caractères." });
      return;
    }

    try {
      const accountResult = await dbPool.query(
        `
          SELECT password_hash, password_salt
          FROM customer_accounts
          WHERE public_id = $1
          LIMIT 1
        `,
        [customer.id],
      );
      const account = accountResult.rows[0];

      if (
        !account ||
        !(await verifyPassword(currentPassword, account.password_salt, account.password_hash))
      ) {
        response.status(401).json({ error: "Mot de passe actuel incorrect." });
        return;
      }

      const { hash, salt } = await hashPassword(newPassword);
      await dbPool.query(
        `
          UPDATE customer_accounts
          SET password_hash = $1, password_salt = $2, updated_at = NOW()
          WHERE public_id = $3
        `,
        [hash, salt, customer.id],
      );

      response.status(200).json({ ok: true });
    } catch (error) {
      console.error("Customer password update failed:", error);
      response
        .status(500)
        .json({ error: "Impossible de modifier le mot de passe pour le moment." });
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

    if (password.length > maxPasswordLength) {
      response.status(400).json({ error: "Le mot de passe ne doit pas dépasser 128 caractères." });
      return;
    }

    const missingMailConfig = getMissingMailConfig();
    if (missingMailConfig.length > 0) {
      console.error(`Customer confirmation email configuration missing: ${missingMailConfig.join(", ")}`);
      response.status(503).json({
        error: "La confirmation email n'est pas encore configurée sur Render.",
      });
      return;
    }

    const verificationOrigin = getRequestOrigin(request);
    if (!verificationOrigin) {
      response.status(503).json({
        error: "SITE_URL doit être configuré pour envoyer les liens de confirmation email.",
      });
      return;
    }

    try {
      const { hash, salt } = await hashPassword(password);
      const publicId = crypto.randomUUID();
      const verificationToken = createEmailVerificationToken();
      const verificationTokenHash = hashEmailVerificationToken(verificationToken);
      const verificationExpiresAt = new Date(Date.now() + emailVerificationTokenMaxAgeMs);
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
            password_salt,
            email_verification_token_hash,
            email_verification_token_expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (email) DO UPDATE
          SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            company = EXCLUDED.company,
            phone = EXCLUDED.phone,
            password_hash = EXCLUDED.password_hash,
            password_salt = EXCLUDED.password_salt,
            email_verification_token_hash = EXCLUDED.email_verification_token_hash,
            email_verification_token_expires_at = EXCLUDED.email_verification_token_expires_at,
            updated_at = NOW()
          WHERE customer_accounts.email_verified_at IS NULL
          RETURNING public_id, first_name, last_name, company, phone, email, created_at
        `,
        [
          publicId,
          firstName,
          lastName,
          company,
          phone,
          email,
          hash,
          salt,
          verificationTokenHash,
          verificationExpiresAt,
        ],
      );

      if (result.rowCount === 0) {
        response.status(409).json({ error: "Un compte existe déjà avec cette adresse email." });
        return;
      }

      const customer = serializeCustomer(result.rows[0]);

      try {
        await sendCustomerVerificationEmail({
          customer,
          origin: verificationOrigin,
          token: verificationToken,
        });
      } catch (emailError) {
        console.error("Customer confirmation email failed:", emailError);
        response.status(502).json({
          error: "Impossible d'envoyer l'email de confirmation pour le moment.",
        });
        return;
      }

      response.status(201).json({
        verificationRequired: true,
        email: customer.email,
      });
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

    if (password.length > maxPasswordLength) {
      response.status(400).json({ error: "Email ou mot de passe incorrect." });
      return;
    }

    try {
      const result = await dbPool.query(
        `
          SELECT
            public_id,
            first_name,
            last_name,
            company,
            phone,
            email,
            password_hash,
            password_salt,
            email_verified_at,
            created_at
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

      if (!row.email_verified_at) {
        response.status(403).json({
          error: "Merci de confirmer votre adresse email avant de vous connecter.",
        });
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

function normalizeCustomerProfileInput(body) {
  const firstName = cleanSingleLine(body?.firstName, 80);
  const lastName = cleanSingleLine(body?.lastName, 80);
  const company = cleanSingleLine(body?.company, 120);
  const phone = cleanSingleLine(body?.phone, 80);
  const email = normalizeEmail(body?.email);

  if (!firstName || !lastName || !email) {
    return { error: "Merci de compléter les champs obligatoires." };
  }

  if (!isValidEmail(email)) {
    return { error: "Merci d'indiquer une adresse email valide." };
  }

  return {
    firstName,
    lastName,
    company,
    phone,
    email,
  };
}

function createEmailVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashEmailVerificationToken(token) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

async function sendCustomerVerificationEmail({ customer, origin, token }) {
  const verificationUrl = new URL("/api/auth/verify-email", origin);
  verificationUrl.searchParams.set("token", token);

  await getMailTransport().sendMail({
    from: getMailFromAddress(),
    to: customer.email,
    subject: "Confirmez votre email - Aération Ventilation",
    text: buildVerificationEmailText({ customer, verificationUrl }),
    html: buildVerificationEmailHtml({ customer, verificationUrl }),
  });
}

function buildVerificationEmailText({ customer, verificationUrl }) {
  return [
    `Bonjour ${customer.firstName},`,
    "",
    "Merci de créer votre compte Aération Ventilation.",
    "Pour confirmer votre adresse email, ouvrez ce lien :",
    verificationUrl.toString(),
    "",
    "Ce lien est valable 24 heures.",
    "",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
  ].join("\n");
}

function buildVerificationEmailHtml({ customer, verificationUrl }) {
  const safeFirstName = escapeHtml(customer.firstName);
  const safeUrl = escapeHtml(verificationUrl.toString());

  return `
    <h2>Confirmez votre email</h2>
    <p>Bonjour ${safeFirstName},</p>
    <p>Merci de créer votre compte Aération Ventilation.</p>
    <p>
      <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#ff7a1f;color:#120b07;font-weight:700;text-decoration:none;border-radius:8px;">
        Confirmer mon adresse email
      </a>
    </p>
    <p>Ce lien est valable 24 heures.</p>
    <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
  `;
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
