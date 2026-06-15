import { NextResponse } from "next/server";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { getContainer } from "@/lib/container";
import { env } from "@/lib/env";
import { AppointmentError } from "@/lib/errors";
import { apiRoute, parseBody } from "@/lib/http";
import { demoLoginSchema } from "@/lib/validation/schemas";

export const POST = apiRoute(async ({ request, log }) => {
  if (!env.DEMO_AUTH_ENABLED) {
    throw new AppointmentError("FORBIDDEN", "Demo sign-in is disabled in this environment.");
  }
  const { userId } = await parseBody(request, demoLoginSchema);
  const user = await getContainer().repos.users.get(userId);
  if (!user) throw new AppointmentError("NOT_FOUND", "User not found.");

  const res = NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, tenantId: user.tenantId } });
  res.cookies.set(SESSION_COOKIE, encodeSession(user.id), sessionCookieOptions);
  log.info("demo sign-in", { userId: user.id, role: user.role });
  return res;
}, { auth: false });
