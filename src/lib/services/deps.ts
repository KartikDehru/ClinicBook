import type { Mailer } from "@/lib/email/mailer";
import type { IdempotencyGuard } from "@/lib/idempotency";
import type { Logger } from "@/lib/logging";
import type { Repositories } from "@/lib/repos/types";

export interface Deps {
  repos: Repositories;
  mailer: Mailer;
  idempotency: IdempotencyGuard;
  log: Logger;
  now: () => Date;
  appUrl: string;
  emailFrom: string;
}
