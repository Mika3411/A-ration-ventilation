import { dbPool, ensureDatabaseReady } from "../database.js";
import { cleanSingleLine, formatEuroAmount } from "../helpers.js";
import {
  isPromoCodeCurrentlyActive,
  maxDiscountPercent,
  maxPromoCodeLength,
  normalizePromoCode,
  normalizePromoCodeRecord,
} from "../../shared/pricing.js";

const promoCodePattern = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

let memoryPromoCodes = [];

export async function getAdminPromoCodes() {
  if (!dbPool) {
    return memoryPromoCodes.sort(sortPromoCodes).map(serializeMemoryPromoCode);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(`
    SELECT *
    FROM promo_codes
    ORDER BY created_at DESC, code ASC
  `);

  return result.rows.map(serializePromoCodeRow);
}

export async function createPromoCode(promoCodeInput) {
  if (!dbPool) {
    if (memoryPromoCodes.some((promoCode) => promoCode.code === promoCodeInput.code)) {
      throw new Error("Ce code promo existe déjà.");
    }

    const now = new Date().toISOString();
    const promoCode = {
      id: Date.now(),
      ...promoCodeInput,
      createdAt: now,
      updatedAt: now,
    };

    memoryPromoCodes = [promoCode, ...memoryPromoCodes];
    return serializeMemoryPromoCode(promoCode);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      INSERT INTO promo_codes (
        code,
        percent,
        minimum_amount,
        starts_at,
        ends_at,
        active
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      promoCodeInput.code,
      promoCodeInput.percent,
      promoCodeInput.minimumAmount,
      promoCodeInput.startsAt || null,
      promoCodeInput.endsAt || null,
      promoCodeInput.active,
    ],
  );

  return serializePromoCodeRow(result.rows[0]);
}

export async function updatePromoCode(code, promoCodeInput) {
  const normalizedCode = normalizePromoCode(code);

  if (!dbPool) {
    const promoCodeIndex = memoryPromoCodes.findIndex((promoCode) => promoCode.code === normalizedCode);
    if (promoCodeIndex === -1) return null;

    const codeAlreadyExists = memoryPromoCodes.some(
      (promoCode, index) =>
        index !== promoCodeIndex && promoCode.code === promoCodeInput.code,
    );

    if (codeAlreadyExists) {
      throw new Error("Ce code promo existe déjà.");
    }

    const updated = {
      ...memoryPromoCodes[promoCodeIndex],
      ...promoCodeInput,
      updatedAt: new Date().toISOString(),
    };

    memoryPromoCodes = memoryPromoCodes.map((promoCode, index) =>
      index === promoCodeIndex ? updated : promoCode,
    );
    return serializeMemoryPromoCode(updated);
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      UPDATE promo_codes
      SET
        code = $1,
        percent = $2,
        minimum_amount = $3,
        starts_at = $4,
        ends_at = $5,
        active = $6,
        updated_at = NOW()
      WHERE code = $7
      RETURNING *
    `,
    [
      promoCodeInput.code,
      promoCodeInput.percent,
      promoCodeInput.minimumAmount,
      promoCodeInput.startsAt || null,
      promoCodeInput.endsAt || null,
      promoCodeInput.active,
      normalizedCode,
    ],
  );

  return result.rows[0] ? serializePromoCodeRow(result.rows[0]) : null;
}

export async function deletePromoCode(code) {
  const normalizedCode = normalizePromoCode(code);

  if (!dbPool) {
    const initialLength = memoryPromoCodes.length;
    memoryPromoCodes = memoryPromoCodes.filter((promoCode) => promoCode.code !== normalizedCode);
    return memoryPromoCodes.length !== initialLength;
  }

  await ensureDatabaseReady();
  const result = await dbPool.query("DELETE FROM promo_codes WHERE code = $1", [normalizedCode]);
  return result.rowCount > 0;
}

export async function getApplicablePromoCode(code, amountSubtotal) {
  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) return null;

  const promoCode = await findPromoCode(normalizedCode);
  if (!promoCode) {
    throw new Error("Code promo introuvable.");
  }

  if (!isPromoCodeCurrentlyActive(promoCode)) {
    throw new Error("Ce code promo n'est pas actif.");
  }

  const subtotal = Number.parseInt(amountSubtotal, 10) || 0;
  if (subtotal < promoCode.minimumAmount) {
    throw new Error(`Ce code promo est valable à partir de ${formatEuroAmount(promoCode.minimumAmount)}.`);
  }

  return promoCode;
}

export function normalizePromoCodeInput(body) {
  const code = normalizePromoCode(body?.code);
  const percent = Number.parseFloat(String(body?.percent ?? "").replace(",", "."));
  const minimumAmount = Number.parseInt(body?.minimumAmount, 10);
  const startsAt = normalizeOptionalDate(body?.startsAt);
  const endsAt = normalizeOptionalDate(body?.endsAt);

  if (!code) {
    throw new Error("Le code promo est obligatoire.");
  }

  if (!promoCodePattern.test(code) || code.length > maxPromoCodeLength) {
    throw new Error("Le code promo doit contenir 3 à 32 caractères : lettres, chiffres, tiret ou underscore.");
  }

  if (!Number.isFinite(percent) || percent <= 0 || percent > maxDiscountPercent) {
    throw new Error("Le pourcentage du code promo doit être compris entre 0,01 et 99,99.");
  }

  if (body?.minimumAmount !== undefined && body?.minimumAmount !== "" && (!Number.isInteger(minimumAmount) || minimumAmount < 0)) {
    throw new Error("Le montant minimum du code promo doit être positif.");
  }

  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    throw new Error("La date de début doit être avant la date de fin.");
  }

  return {
    code,
    percent: Math.round(percent * 100) / 100,
    minimumAmount: Number.isInteger(minimumAmount) && minimumAmount > 0 ? minimumAmount : 0,
    startsAt,
    endsAt,
    active: body?.active !== false,
  };
}

export function serializePublicPromoCode(promoCode) {
  const normalizedPromoCode = normalizePromoCodeRecord(promoCode);
  if (!normalizedPromoCode) return null;

  return {
    code: normalizedPromoCode.code,
    percent: normalizedPromoCode.percent,
    minimumAmount: normalizedPromoCode.minimumAmount,
    minimumAmountLabel: formatEuroAmount(normalizedPromoCode.minimumAmount),
  };
}

export function handlePromoCodeMutationError(error, response, fallbackMessage) {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (
    message.includes("obligatoire") ||
    message.includes("pourcentage") ||
    message.includes("montant") ||
    message.includes("caractères") ||
    message.includes("date")
  ) {
    response.status(400).json({ error: message });
    return;
  }

  if (message.includes("existe déjà") || error?.code === "23505") {
    response.status(409).json({ error: "Ce code promo existe déjà." });
    return;
  }

  console.error("Promo code mutation failed:", error);
  response.status(500).json({ error: fallbackMessage });
}

async function findPromoCode(code) {
  if (!dbPool) {
    const promoCode = memoryPromoCodes.find((currentPromoCode) => currentPromoCode.code === code);
    return promoCode ? serializeMemoryPromoCode(promoCode) : null;
  }

  await ensureDatabaseReady();
  const result = await dbPool.query("SELECT * FROM promo_codes WHERE code = $1 LIMIT 1", [code]);
  return result.rows[0] ? serializePromoCodeRow(result.rows[0]) : null;
}

function normalizeOptionalDate(value) {
  const rawValue = cleanSingleLine(value, 40);
  if (!rawValue) return "";

  const date = new Date(rawValue);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("La date du code promo est invalide.");
  }

  return date.toISOString();
}

function serializePromoCodeRow(row) {
  const percent = Number.parseFloat(row.percent);
  const minimumAmount = Number.parseInt(row.minimum_amount, 10) || 0;

  return {
    id: String(row.id),
    code: normalizePromoCode(row.code),
    percent: Number.isFinite(percent) ? Math.round(percent * 100) / 100 : 0,
    minimumAmount,
    minimumAmountLabel: formatEuroAmount(minimumAmount),
    startsAt: row.starts_at || "",
    endsAt: row.ends_at || "",
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeMemoryPromoCode(promoCode) {
  const minimumAmount = Number.parseInt(promoCode.minimumAmount, 10) || 0;

  return {
    id: String(promoCode.id),
    code: normalizePromoCode(promoCode.code),
    percent: promoCode.percent,
    minimumAmount,
    minimumAmountLabel: formatEuroAmount(minimumAmount),
    startsAt: promoCode.startsAt || "",
    endsAt: promoCode.endsAt || "",
    active: promoCode.active !== false,
    createdAt: promoCode.createdAt,
    updatedAt: promoCode.updatedAt,
  };
}

function sortPromoCodes(first, second) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime() ||
    first.code.localeCompare(second.code, "fr", { numeric: true, sensitivity: "base" })
  );
}
