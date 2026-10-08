/* Small client-side fetch wrapper for our JSON API. */

export class ApiError extends Error {
  status: number;
  detail?: string;
  code?: string;

  constructor(status: number, message: string, detail?: string, code?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-json body */
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      typeof payload.message === "string" ? payload.message : "خطای غیرمنتظره رخ داد.",
      typeof payload.detail === "string" ? payload.detail : undefined,
      typeof payload.error === "string" ? payload.error : undefined,
    );
  }
  return payload as T;
}
