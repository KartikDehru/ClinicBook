import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Subdomain routing: `{tenant}.{ROOT_DOMAIN}` is rewritten to `/t/{tenant}`.
 * The apex domain, `www` and `app` are never treated as tenants.
 */
const RESERVED = new Set(["www", "app", "api"]);

export function middleware(request: NextRequest) {
  const root = (process.env.ROOT_DOMAIN ?? "localhost").toLowerCase();
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0] ?? "";

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (sub && !sub.includes(".") && !RESERVED.has(sub) && !request.nextUrl.pathname.startsWith("/t/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/t/${sub}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
