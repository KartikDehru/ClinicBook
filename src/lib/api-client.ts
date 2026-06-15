export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

/** Fetch wrapper for client components. Throws ApiClientError carrying the server's structured code. */
export async function apiFetch<T>(
  url: string,
  init: Omit<RequestInit, "body"> & { json?: unknown; idempotencyKey?: string } = {}
): Promise<T> {
  const { json, idempotencyKey, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } } | null)?.error;
    throw new ApiClientError(
      err?.code ?? "INTERNAL",
      err?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.details
    );
  }
  return data as T;
}
