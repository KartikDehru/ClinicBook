import { formatMoney } from "@/lib/utils";
import { formatInZone } from "@/lib/time";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLORS = {
  ink: "#0f1716",
  muted: "#58675f",
  teal: "#175a55",
  tealDeep: "#0d3330",
  sand: "#f2efe8",
  rule: "#e6e1d5",
};

interface Row {
  label: string;
  value: string;
}

interface LayoutInput {
  preheader: string;
  heading: string;
  intro: string;
  rows?: Row[];
  cta?: { label: string; href: string };
  outro?: string;
  brand: string;
}

/** Table-based layout that survives Outlook and Gmail. All dynamic values are escaped. */
function layout(input: LayoutInput): string {
  const rows = (input.rows ?? [])
    .map(
      (r) => `<tr>
        <td style="padding:10px 0;border-top:1px solid ${COLORS.rule};font-size:13px;color:${COLORS.muted};width:34%;vertical-align:top">${escapeHtml(r.label)}</td>
        <td style="padding:10px 0;border-top:1px solid ${COLORS.rule};font-size:14px;color:${COLORS.ink};font-weight:600">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join("");

  const cta = input.cta
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(input.cta.href)}" style="background:${COLORS.teal};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:6px;display:inline-block">${escapeHtml(input.cta.label)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
<body style="margin:0;background:${COLORS.sand};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${COLORS.ink}">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.sand};padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
        <tr><td style="background:${COLORS.tealDeep};padding:20px 32px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:-0.01em">${escapeHtml(input.brand)}</td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:600">${escapeHtml(input.heading)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${COLORS.muted}">${escapeHtml(input.intro)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
          ${cta}
          ${input.outro ? `<p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${COLORS.muted}">${escapeHtml(input.outro)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 32px;background:${COLORS.sand};font-size:12px;color:${COLORS.muted}">Sent by ${escapeHtml(input.brand)} via ClinicBook.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function toText(heading: string, intro: string, rows: Row[] = [], extra: string[] = []): string {
  return [heading, "", intro, "", ...rows.map((r) => `${r.label}: ${r.value}`), "", ...extra]
    .join("\n")
    .trim();
}

export interface AppointmentEmailContext {
  tenantName: string;
  timezone: string;
  customerName: string;
  serviceName: string;
  providerName: string;
  startsAt: string;
  priceCents?: number;
  currency?: string;
  confirmationCode: string;
  manageUrl: string;
  cancellationPolicy?: string;
  previousStartsAt?: string;
  cancelReason?: string;
}

function appointmentRows(c: AppointmentEmailContext): Row[] {
  const rows: Row[] = [
    { label: "Service", value: c.serviceName },
    { label: "With", value: c.providerName },
    { label: "When", value: formatInZone(new Date(c.startsAt), c.timezone, "full") },
  ];
  if (c.priceCents !== undefined) {
    rows.push({ label: "Price", value: formatMoney(c.priceCents, c.currency ?? "USD") });
  }
  rows.push({ label: "Confirmation", value: c.confirmationCode });
  return rows;
}

export function renderBookingConfirmation(c: AppointmentEmailContext): RenderedEmail {
  const heading = "Your appointment is booked";
  const intro = `Hi ${c.customerName}, you're confirmed at ${c.tenantName}.`;
  const rows = appointmentRows(c);
  return {
    subject: `Confirmed: ${c.serviceName} at ${c.tenantName}`,
    html: layout({
      preheader: `${c.serviceName} on ${formatInZone(new Date(c.startsAt), c.timezone, "dayTime")}`,
      heading,
      intro,
      rows,
      cta: { label: "Manage appointment", href: c.manageUrl },
      outro: c.cancellationPolicy,
      brand: c.tenantName,
    }),
    text: toText(heading, intro, rows, [c.cancellationPolicy ?? "", c.manageUrl]),
  };
}

export function renderReschedule(c: AppointmentEmailContext): RenderedEmail {
  const heading = "Your appointment was moved";
  const intro = c.previousStartsAt
    ? `Hi ${c.customerName}, your visit moved from ${formatInZone(new Date(c.previousStartsAt), c.timezone, "dayTime")}.`
    : `Hi ${c.customerName}, your visit time changed.`;
  const rows = appointmentRows(c);
  return {
    subject: `Rescheduled: ${c.serviceName} at ${c.tenantName}`,
    html: layout({
      preheader: "Your new appointment time",
      heading,
      intro,
      rows,
      cta: { label: "View new time", href: c.manageUrl },
      brand: c.tenantName,
    }),
    text: toText(heading, intro, rows, [c.manageUrl]),
  };
}

export function renderCancellation(c: AppointmentEmailContext): RenderedEmail {
  const heading = "Your appointment was cancelled";
  const intro = `Hi ${c.customerName}, your ${c.serviceName} appointment has been cancelled.`;
  const rows = appointmentRows(c);
  if (c.cancelReason) rows.push({ label: "Reason", value: c.cancelReason });
  return {
    subject: `Cancelled: ${c.serviceName} at ${c.tenantName}`,
    html: layout({
      preheader: "Your appointment has been cancelled",
      heading,
      intro,
      rows,
      cta: { label: "Book a new time", href: c.manageUrl },
      brand: c.tenantName,
    }),
    text: toText(heading, intro, rows, [c.manageUrl]),
  };
}

export function renderWaitlistJoined(c: {
  tenantName: string;
  customerName: string;
  serviceName: string;
  providerName: string;
  desiredDateLabel: string;
}): RenderedEmail {
  const heading = "You're on the waitlist";
  const intro = `Hi ${c.customerName}, we'll email you the moment a time opens up.`;
  const rows: Row[] = [
    { label: "Service", value: c.serviceName },
    { label: "With", value: c.providerName },
    { label: "Preferred day", value: c.desiredDateLabel },
  ];
  return {
    subject: `Waitlist: ${c.serviceName} at ${c.tenantName}`,
    html: layout({ preheader: "We'll notify you if a slot opens", heading, intro, rows, brand: c.tenantName }),
    text: toText(heading, intro, rows),
  };
}

export function renderWaitlistOffer(
  c: AppointmentEmailContext & { bookUrl: string }
): RenderedEmail {
  const heading = "A time just opened up";
  const intro = `Hi ${c.customerName}, a slot you were waiting for is available. Slots are first-come, first-served.`;
  const rows = appointmentRows(c).filter((r) => r.label !== "Confirmation");
  return {
    subject: `Opening: ${c.serviceName} at ${c.tenantName}`,
    html: layout({
      preheader: "Book it before someone else does",
      heading,
      intro,
      rows,
      cta: { label: "Claim this time", href: c.bookUrl },
      brand: c.tenantName,
    }),
    text: toText(heading, intro, rows, [c.bookUrl]),
  };
}

export function renderStaffInvite(c: {
  tenantName: string;
  inviteeName: string;
  inviterName: string;
  loginUrl: string;
}): RenderedEmail {
  const heading = `Join ${c.tenantName} on ClinicBook`;
  const intro = `Hi ${c.inviteeName}, ${c.inviterName} added you as a staff member.`;
  return {
    subject: `${c.inviterName} invited you to ${c.tenantName}`,
    html: layout({
      preheader: "Your staff seat is ready",
      heading,
      intro,
      cta: { label: "Open workspace", href: c.loginUrl },
      brand: c.tenantName,
    }),
    text: toText(heading, intro, [], [c.loginUrl]),
  };
}

export function renderBillingReceipt(c: {
  tenantName: string;
  planName: string;
  amountCents: number;
  billingUrl: string;
}): RenderedEmail {
  const heading = "Payment received";
  const intro = `Thanks. Your ${c.planName} subscription for ${c.tenantName} is active.`;
  const rows: Row[] = [
    { label: "Plan", value: c.planName },
    { label: "Amount", value: `${formatMoney(c.amountCents)} / month` },
  ];
  return {
    subject: `Receipt: ${c.planName} subscription`,
    html: layout({
      preheader: `${formatMoney(c.amountCents)} received`,
      heading,
      intro,
      rows,
      cta: { label: "View billing", href: c.billingUrl },
      brand: "ClinicBook",
    }),
    text: toText(heading, intro, rows, [c.billingUrl]),
  };
}
