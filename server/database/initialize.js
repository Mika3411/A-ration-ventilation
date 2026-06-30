import { runDatabaseDataMigrations, runDatabaseSchemaMigrations } from "./migrations.js";
import {
  seedDefaultShopCategories,
  seedDefaultShopProducts,
  seedMissingProductCategories,
} from "./seeds.js";
import { createDatabaseSchema } from "./schema.js";

export async function initializeDatabase(pool) {
  await createDatabaseSchema(pool);
  await runDatabaseSchemaMigrations(pool);
  await seedDefaultShopProducts(pool);
  await runDatabaseDataMigrations(pool);
  await seedDefaultShopCategories(pool);
  await seedMissingProductCategories(pool);
}
