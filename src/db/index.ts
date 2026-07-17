import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, {
  // Supabase's transaction pooler does not support prepared statements.
  prepare: false,

  // Close our own idle connections before the pooler closes them for us.
  //
  // This is not a tuning knob — it fixes a real failure. An audit stage can spend 60-90
  // seconds inside a single model call with no database traffic. The pooler drops the idle
  // server connection in that window; postgres-js, not knowing, then writes the stage result
  // to a dead socket and the query fails with ECONNRESET — losing work that had already
  // succeeded. Expiring the connection on our side first means the next query transparently
  // opens a fresh one.
  idle_timeout: 20,

  // A belt-and-braces bound on connection age, for the same reason.
  max_lifetime: 60 * 10,

  connect_timeout: 30,
});

export const db = drizzle(client, { schema });
export { schema };
