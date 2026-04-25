import { NextResponse } from "next/server";
import { rescheduleAppointment } from "@/lib/appointments/service";
import { rescheduleSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = rescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const appointment = rescheduleAppointment(parsed.data.appointmentId, parsed.data.startsAt);
    return NextResponse.json({ appointment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reschedule failed" },
      { status: 400 }
    );
  }
}