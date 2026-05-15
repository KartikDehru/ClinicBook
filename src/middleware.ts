import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Mock subdomain routing: rewrites {tenant}.localhost requests to /t/{slug}
 * Set x-tenant-slug header for downstream server components.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const parts = host.split(".");
  const maybeSubdomain = parts[0];

  if (
    maybeSubdomain &&
    maybeSubdomain !== "localhost" &&
    maybeSubdomain !== "www" &&
    !host.startsWith("localhost:")
  ) {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith("/t/")) {
      url.pathname = `/t/${maybeSubdomain}${url.pathname}`;
      const res = NextResponse.rewrite(url);
      res.headers.set("x-tenant-slug", maybeSubdomain);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};