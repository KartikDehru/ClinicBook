import { cookies } from "next/headers";
import { store } from "@/lib/store";
import type { User } from "@/types";

const SESSION_COOKIE = "clinicbook_user_id";

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = jar.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return store.users.find((u) => u.id === userId) ?? null;
}

export async function setSessionUser(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export function getDemoUsers(): User[] {
  return store.users;
}