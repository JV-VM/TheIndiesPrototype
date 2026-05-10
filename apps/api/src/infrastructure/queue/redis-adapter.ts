import { createClient } from "redis";

import type { DependencyReport, QueueAdapter } from "../ports.js";

export class RedisQueueAdapter implements QueueAdapter {
  constructor(private readonly redisUrl: string) {}

  async checkHealth(): Promise<DependencyReport> {
    const startedAt = performance.now();
    const client = createClient({
      url: this.redisUrl
    });

    try {
      await client.connect();
      const pong = await client.ping();

      return {
        name: "redis",
        status: pong === "PONG" ? "healthy" : "unhealthy",
        latencyMs: Math.round(performance.now() - startedAt),
        details:
          pong === "PONG"
            ? "Ping acknowledged."
            : `Unexpected ping response: ${pong}`
      };
    } catch (error: unknown) {
      return {
        name: "redis",
        status: "unhealthy",
        latencyMs: Math.round(performance.now() - startedAt),
        details:
          error instanceof Error ? error.message : "Unknown Redis failure."
      };
    } finally {
      if (client.isOpen) {
        await client.quit().catch(() => undefined);
      }
    }
  }
}
