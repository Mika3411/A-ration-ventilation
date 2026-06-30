import net from "node:net";
import pg from "pg";

import { initializeDatabase } from "./database/initialize.js";

const { Pool } = pg;

export const dbPool = process.env.DATABASE_URL
  ? new Pool(createDatabasePoolConfig(process.env.DATABASE_URL))
  : null;

export function createDatabasePoolConfig(
  connectionString,
  {
    sslSetting = process.env.DATABASE_SSL,
    caCertificate = process.env.DATABASE_CA_CERT,
  } = {},
) {
  const ssl = getDatabaseSslConfig(connectionString, sslSetting, caCertificate);
  const config = { connectionString };

  if (ssl) {
    config.ssl = ssl;
  }

  return config;
}

export function getDatabaseSslConfig(connectionString, sslSetting, caCertificate) {
  const normalizedSslSetting = normalizeDatabaseSslSetting(connectionString, sslSetting);
  const privateHost = isPrivateDatabaseHost(connectionString);

  if (normalizedSslSetting === "disable") {
    if (!privateHost) {
      throw new Error(
        "DATABASE_SSL=false is only allowed for private database hosts. Use DATABASE_SSL=auto or true for external Postgres URLs.",
      );
    }

    return undefined;
  }

  if (normalizedSslSetting === "auto" && privateHost) {
    return undefined;
  }

  return getVerifiedDatabaseSslConfig(caCertificate);
}

let databaseInitError = null;

export const databaseReady = dbPool
  ? initializeDatabase(dbPool).catch((error) => {
      databaseInitError = error;
      console.error("Customer database initialization failed:", error);
    })
  : Promise.resolve();

export function getDatabaseInitError() {
  return databaseInitError;
}

export async function ensureDatabaseReady() {
  if (!dbPool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await databaseReady;

  if (databaseInitError) {
    throw databaseInitError;
  }
}

function normalizeDatabaseSslSetting(connectionString, sslSetting) {
  const rawSetting = String(sslSetting || getUrlSslMode(connectionString) || "auto")
    .trim()
    .toLowerCase();

  if (!rawSetting || rawSetting === "auto") return "auto";
  if (["true", "require", "verify-ca", "verify-full"].includes(rawSetting)) return "require";
  if (["false", "disable"].includes(rawSetting)) return "disable";

  throw new Error(
    "DATABASE_SSL must be auto, true, false, require, verify-ca, verify-full, or disable.",
  );
}

function getUrlSslMode(connectionString) {
  try {
    return new URL(connectionString).searchParams.get("sslmode") || "";
  } catch {
    return "";
  }
}

function getVerifiedDatabaseSslConfig(caCertificate) {
  const normalizedCertificate = normalizeCertificate(caCertificate);

  return normalizedCertificate
    ? { ca: normalizedCertificate, rejectUnauthorized: true }
    : { rejectUnauthorized: true };
}

function normalizeCertificate(caCertificate) {
  return String(caCertificate || "")
    .trim()
    .replace(/\\n/g, "\n");
}

function isPrivateDatabaseHost(connectionString) {
  let hostname;

  try {
    hostname = new URL(connectionString).hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  } catch {
    return false;
  }

  if (!hostname) return false;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (net.isIP(hostname)) return isPrivateIp(hostname);
  if (!hostname.includes(".")) return true;
  if (hostname.endsWith(".internal")) return true;

  return false;
}

function isPrivateIp(hostname) {
  return net.isIP(hostname) === 4 ? isPrivateIpv4(hostname) : isPrivateIpv6(hostname);
}

function isPrivateIpv4(hostname) {
  const [first, second] = hostname.split(".").map((part) => Number.parseInt(part, 10));

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function isPrivateIpv6(hostname) {
  return (
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:")
  );
}
