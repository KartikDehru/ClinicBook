export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  organizerName?: string;
  organizerEmail?: string;
  /** For deterministic output in tests. */
  now?: Date;
}

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 line folding at 75 octets. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = chunks.length === 0 ? 75 : 74;
    if (encoder.encode(current + ch).length > limit) {
      chunks.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}

export function buildIcs(event: IcsEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClinicBook//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@clinicbook.app`,
    `DTSTAMP:${toIcsUtc((event.now ?? new Date()).toISOString())}`,
    `DTSTART:${toIcsUtc(event.startsAt)}`,
    `DTEND:${toIcsUtc(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.organizerEmail) {
    lines.push(
      `ORGANIZER;CN=${escapeText(event.organizerName ?? "ClinicBook")}:mailto:${event.organizerEmail}`
    );
  }
  lines.push(
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  );
  return lines.map(fold).join("\r\n") + "\r\n";
}
