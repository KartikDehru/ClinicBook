import { NextResponse } from "next/server";
import { createCustomer, getCustomersForTenant } from "@/lib/customers/service";
import { createCustomerSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }
  return NextResponse.json({ customers: getCustomersForTenant(tenantId) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const customer = createCustomer(parsed.data);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 }
    );
  }
}