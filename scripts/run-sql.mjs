// Runs a .sql file over DIRECT_URL. Used for the bits of setup that live outside the
// drizzle migration chain (the `storage` schema, which drizzle.config.ts filters out).
//
//   node scripts/run-sql.mjs scripts/storage.sql
import { readFileSync } from "node:fs";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, ssl: "require", onnotice: () => {} });

try {
  await sql.unsafe(readFileSync(file, "utf8"));
  console.log(`✔ applied ${file}`);
} catch (error) {
  console.error(`✖ failed ${file}:`, error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
