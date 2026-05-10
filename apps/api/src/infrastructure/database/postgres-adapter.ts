import { Pool } from "pg";

import type { DatabaseAdapter, DependencyReport } from "../ports.js";

export class PostgresDatabaseAdapter implements DatabaseAdapter {
  constructor(private readonly connectionString: string) {}

  async checkHealth(): Promise<DependencyReport> {
    const startedAt = performance.now();
    const pool = new Pool({
      connectionString: this.connectionString,
      max: 1
    });

    try {
      await pool.query("SELECT 1");

      return {
        name: "postgres",
        status: "healthy",
        latencyMs: Math.round(performance.now() - startedAt),
        details: "Query handshake completed."
      };
    } catch (error: unknown) {
      return {
        name: "postgres",
        status: "unhealthy",
        latencyMs: Math.round(performance.now() - startedAt),
        details:
          error instanceof Error ? error.message : "Unknown PostgreSQL failure."
      };
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
}
