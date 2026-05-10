import { createClient } from "redis";

import { prisma } from "../database/prisma-client.js";
import type {
  WorkerDependencyReport,
  WorkerMinioClient
} from "../storage/minio-client.js";

export interface WorkerReadinessReport {
  service: string;
  status: "ok" | "degraded";
  checkedAt: string;
  dependencies: WorkerDependencyReport[];
}

export async function checkWorkerRuntimeDependencies(
  serviceName: string,
  redisUrl: string,
  storage: WorkerMinioClient
): Promise<WorkerReadinessReport> {
  const dependencies = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(redisUrl),
    storage.checkHealth()
  ]);

  return {
    service: serviceName,
    status: dependencies.every((dependency) => dependency.status === "healthy")
      ? "ok"
      : "degraded",
    checkedAt: new Date().toISOString(),
    dependencies
  };
}

async function checkDatabaseHealth(): Promise<WorkerDependencyReport> {
  const startedAt = performance.now();

  try {
    await prisma.$queryRawUnsafe("SELECT 1");

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
  }
}

async function checkRedisHealth(
  redisUrl: string
): Promise<WorkerDependencyReport> {
  const startedAt = performance.now();
  const client = createClient({
    url: redisUrl
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
      details: error instanceof Error ? error.message : "Unknown Redis failure."
    };
  } finally {
    if (client.isOpen) {
      await client.quit().catch(() => undefined);
    }
  }
}
