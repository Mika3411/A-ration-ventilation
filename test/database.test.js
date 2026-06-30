import assert from "node:assert/strict";
import test from "node:test";

import { createDatabasePoolConfig } from "../server/database.js";
import { initializeDatabase } from "../server/database/initialize.js";

test("database pool garde les URLs Render internes sans TLS en mode auto", () => {
  const config = createDatabasePoolConfig("postgres://user:pass@dpg-test-a/app", {
    sslSetting: "auto",
  });

  assert.equal(config.connectionString, "postgres://user:pass@dpg-test-a/app");
  assert.equal(config.ssl, undefined);
});

test("database pool active TLS vérifié pour les URLs externes en mode auto", () => {
  const config = createDatabasePoolConfig(
    "postgres://user:pass@dpg-test-a.oregon-postgres.render.com/app",
    {
      sslSetting: "auto",
    },
  );

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test("database pool rend DATABASE_SSL=true vérifié", () => {
  const config = createDatabasePoolConfig(
    "postgres://user:pass@dpg-test-a.oregon-postgres.render.com/app",
    {
      sslSetting: "true",
    },
  );

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test("database pool refuse DATABASE_SSL=false hors réseau privé", () => {
  assert.throws(
    () =>
      createDatabasePoolConfig("postgres://user:pass@db.example.com/app", {
        sslSetting: "false",
      }),
    /only allowed for private database hosts/i,
  );
});

test("database pool accepte DATABASE_SSL=false sur hôte privé", () => {
  const config = createDatabasePoolConfig("postgres://user:pass@10.0.0.12/app", {
    sslSetting: "false",
  });

  assert.equal(config.ssl, undefined);
});

test("database pool respecte sslmode=require dans l'URL", () => {
  const config = createDatabasePoolConfig(
    "postgres://user:pass@db.example.com/app?sslmode=require",
    {
      sslSetting: "",
    },
  );

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test("database pool ajoute le certificat CA optionnel", () => {
  const config = createDatabasePoolConfig("postgres://user:pass@db.example.com/app", {
    sslSetting: "true",
    caCertificate: "-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----",
  });

  assert.deepEqual(config.ssl, {
    ca: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
    rejectUnauthorized: true,
  });
});

test("database initialization exécute schéma, migrations et seed dans l'ordre", async () => {
  const queries = [];
  const pool = {
    async query(sql, params = []) {
      queries.push({
        sql: String(sql).replace(/\s+/g, " ").trim(),
        params,
      });
      return { rows: [], rowCount: 0 };
    },
  };

  await initializeDatabase(pool);

  const queryIndex = (pattern) => queries.findIndex((query) => query.sql.includes(pattern));
  const productTableIndex = queryIndex("CREATE TABLE IF NOT EXISTS shop_products");
  const emailVerificationMigrationIndex = queryIndex(
    "ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS email_verified_at",
  );
  const schemaMigrationIndex = queryIndex("ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS image_data");
  const productSeedIndex = queryIndex("INSERT INTO shop_products");
  const customerVerificationDataMigrationIndex = queryIndex(
    "UPDATE customer_accounts SET email_verified_at = COALESCE(email_verified_at, created_at)",
  );
  const dataMigrationIndex = queryIndex("UPDATE shop_products SET active = FALSE");
  const categorySeedIndex = queryIndex("INSERT INTO shop_categories (name, sort_order) VALUES");
  const missingCategorySeedIndex = queryIndex(
    "INSERT INTO shop_categories (name, sort_order) SELECT DISTINCT category",
  );

  assert.notEqual(productTableIndex, -1);
  assert.notEqual(emailVerificationMigrationIndex, -1);
  assert.notEqual(schemaMigrationIndex, -1);
  assert.notEqual(productSeedIndex, -1);
  assert.notEqual(customerVerificationDataMigrationIndex, -1);
  assert.notEqual(dataMigrationIndex, -1);
  assert.notEqual(categorySeedIndex, -1);
  assert.notEqual(missingCategorySeedIndex, -1);
  assert.ok(productTableIndex < schemaMigrationIndex);
  assert.ok(emailVerificationMigrationIndex < productSeedIndex);
  assert.ok(schemaMigrationIndex < productSeedIndex);
  assert.ok(productSeedIndex < dataMigrationIndex);
  assert.ok(customerVerificationDataMigrationIndex < categorySeedIndex);
  assert.ok(dataMigrationIndex < categorySeedIndex);
  assert.ok(categorySeedIndex < missingCategorySeedIndex);
});
