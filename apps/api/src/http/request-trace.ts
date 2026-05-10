import type { IncomingMessage } from "node:http";

const requestIds = new WeakMap<IncomingMessage, string>();

export function assignRequestId(
  request: IncomingMessage,
  requestId: string
): void {
  requestIds.set(request, requestId);
}

export function readRequestId(request: IncomingMessage): string | null {
  return requestIds.get(request) ?? null;
}
