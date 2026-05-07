export type EmailNotificationType =
  | "booked"
  | "rescheduled"
  | "cancelled"
  | "billing_receipt"
  | "welcome";

export interface AppointmentEmailPayload {
  type: Exclude<EmailNotificationType, "billing_receipt" | "welcome">;
  customerEmail: string;
  customerName: string;
  serviceName: string;
  startsAt: string;
}

export interface GenericEmailPayload {
  type: EmailNotificationType;
  to: string;
  subject: string;
  body: string;
}

const outbox: GenericEmailPayload[] = [];

export function getEmailOutbox(): GenericEmailPayload[] {
  return [...outbox];
}

export async function sendAppointmentEmail(payload: AppointmentEmailPayload): Promise<void> {
  const subjectMap = {
    booked: `Appointment confirmed: ${payload.serviceName}`,
    rescheduled: `Appointment rescheduled: ${payload.serviceName}`,
    cancelled: `Appointment cancelled: ${payload.serviceName}`,
  };

  const body = `Hi ${payload.customerName},

${subjectMap[payload.type]}

When: ${new Date(payload.startsAt).toLocaleString()}

— ClinicBook (stub — no email sent in dev)

`;

  await queueEmail({
    type: payload.type,
    to: payload.customerEmail,
    subject: subjectMap[payload.type],
    body,
  });
}

export async function sendBillingReceiptEmail(
  to: string,
  planName: string,
  amount: number
): Promise<void> {
  await queueEmail({
    type: "billing_receipt",
    to,
    subject: `Receipt: ${planName} subscription`,
    body: `Thank you for your payment of $${amount}/mo for ${planName}.`,
  });
}

export async function queueEmail(payload: GenericEmailPayload): Promise<void> {
  outbox.push(payload);
  if (process.env.NODE_ENV !== "test") {
    console.info(`[email stub] → ${payload.to}: ${payload.subject}`);
  }
}