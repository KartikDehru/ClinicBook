import { NextResponse } from "next/server";
import { bookAppointment } from "@/lib/appointments/service";
import { bookAppointmentSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bookAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const appointment = bookAppointment(parsed.data);
    return NextResponse.json({ appointment });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Booking failed" },
      { status: 409 }
    );
  }
}