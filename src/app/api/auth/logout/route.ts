import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { apiRoute } from "@/lib/http";

export const POST = apiRoute(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}, { auth: false });
