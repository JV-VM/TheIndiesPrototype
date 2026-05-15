export interface ApiErrorPayload {
  error?: {
    code?: string;
    category?: string;
    message?: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string | null;
    occurredAt?: string;
    operational?: boolean;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly category: string | null;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly payload: ApiErrorPayload | null;

  constructor(status: number, payload: ApiErrorPayload | null) {
    super(payload?.error?.message ?? "Request failed.");
    this.name = "ApiError";
    this.status = status;
    this.code = payload?.error?.code ?? null;
    this.category = payload?.error?.category ?? null;
    this.details = payload?.error?.details;
    this.requestId = payload?.meta?.requestId ?? null;
    this.payload = payload;
  }
}
