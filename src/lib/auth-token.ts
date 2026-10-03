import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "meals_session";
export const SESSION_DAYS = 30;
export type SessionUser = { id: number; name: string; email: string; sessionVersion: number };
const ISSUER = "meal-planner";
const AUDIENCE = "meal-planner-session";

export async function signSessionToken(user: SessionUser, secret: Uint8Array): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email, version: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER).setAudience(AUDIENCE).setSubject(String(user.id))
    .setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(secret);
}

export async function verifySessionToken(token: string, secret: Uint8Array, now = new Date()): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE,
      requiredClaims: ["sub", "iat", "exp"], currentDate: now,
    });
    const id = Number(payload.sub);
    const seconds = Math.floor(now.getTime() / 1000);
    if (!/^[1-9]\d*$/.test(payload.sub ?? "") || !Number.isSafeInteger(id) || id > 2147483647 ||
        !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) ||
        payload.iat! > seconds || payload.exp! <= payload.iat! || payload.exp! - payload.iat! > SESSION_DAYS * 86400 ||
        typeof payload.name !== "string" || !payload.name || typeof payload.email !== "string" || !payload.email ||
        !Number.isSafeInteger(payload.version) || (payload.version as number) < 0) return null;
    return { id, name: payload.name, email: payload.email, sessionVersion: payload.version as number };
  } catch { return null; }
}
