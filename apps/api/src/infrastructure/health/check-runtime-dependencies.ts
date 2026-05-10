import type { DependencyReport } from "../ports.js";
import type { RuntimeAdapters } from "../runtime.js";

export interface ReadinessReport {
  service: string;
  status: "ok" | "degraded";
  checkedAt: string;
  dependencies: DependencyReport[];
}

export async function checkRuntimeDependencies(
  serviceName: string,
  adapters: RuntimeAdapters
): Promise<ReadinessReport> {
  const dependencies = await Promise.all([
    adapters.database.checkHealth(),
    adapters.queue.checkHealth(),
    adapters.storage.checkHealth()
  ]);

  const status = dependencies.every(
    (dependency) => dependency.status === "healthy"
  )
    ? "ok"
    : "degraded";

  return {
    service: serviceName,
    status,
    checkedAt: new Date().toISOString(),
    dependencies
  };
}
