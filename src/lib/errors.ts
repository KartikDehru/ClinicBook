export type AppointmentErrorCode =
  | "SLOT_TAKEN"
  | "OUTSIDE_HOURS"
  | "TENANT_MISMATCH"
  | "SEAT_LIMIT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "PLAN_LIMIT"
  | "INVALID_STATE"
  | "POLICY_VIOLATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "IDEMPOTENCY_MISMATCH"
  | "WEBHOOK_SIGNATURE"
  | "INTERNAL";

export const ERROR_HTTP_STATUS: Record<AppointmentErrorCode, number> = {
  SLOT_TAKEN: 409,
  OUTSIDE_HOURS: 422,
  TENANT_MISMATCH: 403,
  SEAT_LIMIT: 402,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  PLAN_LIMIT: 402,
  INVALID_STATE: 409,
  POLICY_VIOLATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  IDEMPOTENCY_MISMATCH: 422,
  WEBHOOK_SIGNATURE: 400,
  INTERNAL: 500,
};

/**
 * Domain error carried from services to the HTTP boundary.
 * Services never construct HTTP responses; they throw this.
 */
export class AppointmentError extends Error {
  readonly code: AppointmentErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AppointmentErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppointmentError";
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return ERROR_HTTP_STATUS[this.code];
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export function isAppointmentError(err: unknown): err is AppointmentError {
  return err instanceof AppointmentError;
}
