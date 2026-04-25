import { NextResponse } from "next/server";
import { cancelAppointment } from "@/lib/appointments/service";
import { cancelSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const appointment = cancelAppointment(parsed.data.appointmentId, parsed.data.reason);
    return NextResponse.json({ appointment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cancel failed" },
      { status: 400 }
    );
  }
}