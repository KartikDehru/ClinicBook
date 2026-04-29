import { NextResponse } from "next/server";
import { listAllTenants } from "@/lib/tenants/resolve-tenant";

export async function GET() {
  return NextResponse.json({ tenants: listAllTenants() });
}