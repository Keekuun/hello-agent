import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth", "/api/share", "/share"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic) return NextResponse.next();

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
