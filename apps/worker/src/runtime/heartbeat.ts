import { createLogger } from "@tip/shared";

const logger = createLogger("tip-worker", {
  runtime: "worker"
});

export function logHeartbeat(
  message: string,
  context: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info"
): void {
  if (level === "error") {
    logger.error(message, undefined, context);
    return;
  }

  if (level === "warn") {
    logger.warn(message, context);
    return;
  }

  logger.info(message, context);
}
