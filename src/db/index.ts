import "server-only";

import * as schema from "./schema";
import { createConnection, type DB } from "./create";

// Cached on globalThis so Next's dev hot-reload doesn't open a second PGlite
// handle on the same data directory. A failed connection is not cached, so
// the next request retries instead of being stuck on the old error.
const globalForDb = globalThis as unknown as { __mealsDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  globalForDb.__mealsDb ??= createConnection().then(
    (connection) => connection.db,
    (error) => {
      globalForDb.__mealsDb = undefined;
      throw error;
    },
  );
  return globalForDb.__mealsDb;
}

export { schema, type DB };
