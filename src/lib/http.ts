import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { getActorFromRequest } from "@/lib/auth/session";
import { AppointmentError, isAppointmentError } from "@/lib/errors";
import { createLogger, getRequestId, type Logger } from "@/lib/logging";
import type { Actor } from "@/types";

export interface ApiContext<P = Record<string, string>> {
  request: Request;
  requestId: string;
  log: Logger;
  actor: Actor | null;
  params: P;
  ip: string;
  json<T>(body: T, init?: ResponseInit): NextResponse;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function parseBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppointmentError("VALIDATION_FAILED", "Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

export function parseQuery<S extends ZodTypeAny>(request: Request, schema: S): z.infer<S> {
  const url = new URL(request.url);
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}

function errorResponse(err: unknown, requestId: string, log: Logger): NextResponse {
  const headers: Record<string, string> = { "x-request-id": requestId };

  if (err instanceof ZodError) {
    const message = err.issues[0]
      ? `${err.issues[0].path.join(".") || "request"}: ${err.issues[0].message}`
      : "Invalid request";
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message,
          details: { issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
        },
      },
      { status: 400, headers }
    );
  }

  if (isAppointmentError(err)) {
    if (err.code === "RATE_LIMITED" && typeof err.details?.retryAfterSeconds === "number") {
      headers["retry-after"] = String(err.details.retryAfterSeconds);
    }
    if (err.status >= 500) log.error("domain error", { code: err.code, message: err.message });
    else log.info("request rejected", { code: err.code, status: err.status });
    return NextResponse.json(err.toJSON(), { status: err.status, headers });
  }

  log.error("unhandled error", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong on our side." } },
    { status: 500, headers }
  );
}

/**
 * Wraps a route handler with request id, structured logging, actor resolution
 * and uniform `{ error: { code, message } }` responses.
 */
export function apiRoute<P = Record<string, string>>(
  handler: (ctx: ApiContext<P>) => Promise<Response>,
  options: { name?: string; auth?: boolean } = {}
) {
  return async (request: Request, routeCtx: { params: Promise<P> }): Promise<Response> => {
    const started = Date.now();
    const requestId = getRequestId(request.headers);
    const url = new URL(request.url);
    const log = createLogger({
      service: "clinicbook",
      requestId,
      route: options.name ?? url.pathname,
      method: request.method,
    });

    try {
      const actor = options.auth === false ? null : await getActorFromRequest(request);
      const params = (routeCtx?.params ? await routeCtx.params : {}) as P;
      const ctx: ApiContext<P> = {
        request,
        requestId,
        log: actor ? log.child({ actorId: actor.userId, tenantId: actor.tenantId }) : log,
        actor,
        params,
        ip: clientIp(request),
        json: (body, init) => {
          const res = NextResponse.json(body, init);
          return res;
        },
      };
      const response = await handler(ctx);
      response.headers.set("x-request-id", requestId);
      log.info("request completed", { status: response.status, durationMs: Date.now() - started });
      return response;
    } catch (err) {
      const res = errorResponse(err, requestId, log);
      log.info("request failed", { status: res.status, durationMs: Date.now() - started });
      return res;
    }
  };
}
