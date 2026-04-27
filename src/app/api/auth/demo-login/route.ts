import { NextResponse } from "next/server";
import { setSessionUser } from "@/lib/auth/session";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  const { userId } = await request.json();
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  await setSessionUser(user.id);
  return NextResponse.json({ user });
}