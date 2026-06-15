import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { actorFromUser } from "@/lib/auth/rbac";
import { getContainer } from "@/lib/container";
import type { Actor } from "@/types";

export const SESSION_COOKIE = "clinicbook_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  return env.SESSION_SECRET ?? "dev-only-session-secret-change-me-please";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function decodeSession(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 1) return null;
  const userId = raw.slice(0, idx);
  const given = Buffer.from(raw.slice(idx + 1));
  const expected = Buffer.from(sign(userId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}

export function parseCookieHeader(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

async function actorForUserId(userId: string | null): Promise<Actor | null> {
  if (!userId) return null;
  const user = await getContainer().repos.users.get(userId);
  return user ? actorFromUser(user) : null;
}

/** For route handlers: resolve the actor from the raw Cookie header. */
export async function getActorFromRequest(request: Request): Promise<Actor | null> {
  const raw = parseCookieHeader(request.headers.get("cookie"), SESSION_COOKIE);
  return actorForUserId(decodeSession(raw));
}

/** For server components / actions. */
export async function getActor(): Promise<Actor | null> {
  const jar = await cookies();
  return actorForUserId(decodeSession(jar.get(SESSION_COOKIE)?.value));
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
