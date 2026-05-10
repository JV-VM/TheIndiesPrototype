import { randomUUID } from "node:crypto";

export interface ModuleDescriptor {
  name: string;
  responsibility: string;
}

export function defineModuleDescriptor(
  name: string,
  responsibility: string
): ModuleDescriptor {
  return { name, responsibility };
}

export function readPort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredLogError {
  name: string;
  message: string;
  stack?: string;
}

export interface StructuredLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ): void;
  child(bindings: Record<string, unknown>): StructuredLogger;
}

export function createLogger(
  service: string,
  bindings: Record<string, unknown> = {}
): StructuredLogger {
  function write(
    level: LogLevel,
    message: string,
    context: Record<string, unknown> = {},
    error?: unknown
  ): void {
    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      ...bindings,
      ...context
    };

    const serializedError = serializeError(error);

    if (serializedError) {
      payload.error = serializedError;
    }

    const line = JSON.stringify(payload);

    if (level === "error") {
      console.error(line);
      return;
    }

    if (level === "warn") {
      console.warn(line);
      return;
    }

    console.log(line);
  }

  return {
    debug(message, context) {
      write("debug", message, context);
    },
    info(message, context) {
      write("info", message, context);
    },
    warn(message, context) {
      write("warn", message, context);
    },
    error(message, error, context) {
      write("error", message, context, error);
    },
    child(nextBindings) {
      return createLogger(service, {
        ...bindings,
        ...nextBindings
      });
    }
  };
}

export function createCorrelationId(
  incomingValue?: string | string[] | null
): string {
  if (typeof incomingValue === "string" && incomingValue.trim().length > 0) {
    return incomingValue.trim();
  }

  if (
    Array.isArray(incomingValue) &&
    typeof incomingValue[0] === "string" &&
    incomingValue[0].trim().length > 0
  ) {
    return incomingValue[0].trim();
  }

  return randomUUID();
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export function serializeError(error: unknown): StructuredLogError | null {
  if (!(error instanceof Error)) {
    return null;
  }

  return {
    name: error.name,
    message: error.message,
    ...(error.stack ? { stack: error.stack } : {})
  };
}
