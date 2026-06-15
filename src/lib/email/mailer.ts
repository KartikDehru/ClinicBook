import { logger } from "@/lib/logging";
import type { RenderedEmail } from "@/lib/email/templates";

export interface EmailMessage extends RenderedEmail {
  to: string;
  from: string;
  kind: string;
  tenantId?: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Stub transport: records messages in memory and logs a JSON line.
 * Replace with Resend/Postmark/SES by implementing `Mailer`.
 */
export class OutboxMailer implements Mailer {
  readonly outbox: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.outbox.push(message);
    if (this.outbox.length > 500) this.outbox.shift();
    logger.info("email queued", {
      kind: message.kind,
      to: message.to,
      subject: message.subject,
      tenantId: message.tenantId,
    });
  }
}
