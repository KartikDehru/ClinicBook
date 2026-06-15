import { randomUUID } from "node:crypto";

type Level = "debug" | "info" | "warn" | "error";
type Threshold = Level | "silent";

const ORDER: Record<Threshold, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export type LogSink = (line: string) => void;

function threshold(): Threshold {
  const raw = process.env.LOG_LEVEL as Threshold | undefined;
  return raw && raw in ORDER ? raw : "info";
}

export function createLogger(base: LogFields = {}, sink?: LogSink): Logger {
  const emit = (level: Level, msg: string, fields?: LogFields) => {
    if (ORDER[level] < ORDER[threshold()]) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...base,
      ...fields,
    });
    if (sink) return sink(line);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (fields) => createLogger({ ...base, ...fields }, sink),
  };
}

export const logger = createLogger({ service: "clinicbook" });

export function getRequestId(headers: { get(name: string): string | null }): string {
  const incoming = headers.get("x-request-id");
  if (incoming && /^[\w.-]{8,64}$/.test(incoming)) return incoming;
  return randomUUID();
}
