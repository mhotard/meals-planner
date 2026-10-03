/** Validate production configuration before accepting requests; never open a DB here. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { requireHostedDatabase } = await import("@/lib/runtime-config");
    requireHostedDatabase(process.env.NODE_ENV, process.env.DATABASE_URL);
    const { getSecret } = await import("@/server/auth");
    getSecret();
  }
}
