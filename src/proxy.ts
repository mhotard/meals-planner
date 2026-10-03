import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/auth-token";

/** Everything is private except the login page and the read-only share links. */
const isPublic = (path: string) => path === "/login" || path.startsWith("/share/");

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifySession(token))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
