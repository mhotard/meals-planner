/** Production must use durable hosted storage; local data is development-only. */
export function requireHostedDatabase(environment: string | undefined, url: string | undefined): string | undefined {
  const value = url?.trim();
  if (environment === "production" && !value) {
    throw new Error("DATABASE_URL is required in production; local PGlite is development-only");
  }
  return value || undefined;
}
