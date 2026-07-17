import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// The Next.js runtime reads .env.local on its own; the drizzle-kit CLI does not.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations run over the direct connection: the transaction pooler cannot
    // hold the advisory locks drizzle-kit takes during DDL.
    url: process.env.DIRECT_URL!,
  },
  // Supabase-managed schemas that Drizzle should never try to migrate.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
