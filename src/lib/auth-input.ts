/** Auth policy shared by Settings and the CLI. Passwords are never trimmed. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+$/.test(email)) return null;
  return email;
}

export function passwordError(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 8) return "Password must be at least 8 characters.";
  if (new TextEncoder().encode(value).length > 72) return "Password must be at most 72 bytes.";
  return null;
}

export function memberName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= 100 && !/[\x00-\x1f\x7f]/.test(name) ? name : null;
}

/** Accept a local path/query only; inspect decoded content before URL normalization. */
export function safeLoginDestination(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/";
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return "/"; }
  if (!value.startsWith("/") || value.startsWith("//") || !decoded.startsWith("/") || decoded.startsWith("//") || /[\\\x00-\x1f\x7f]/.test(decoded) || /\s/.test(value)) return "/";
  try {
    const url = new URL(value, "https://meal-planner.invalid");
    if (url.origin !== "https://meal-planner.invalid") return "/";
    // Dot segments can turn a local-looking URL into a protocol-relative path.
    if (url.pathname.startsWith("//")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}
