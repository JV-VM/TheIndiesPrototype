export type DependencyStatus = "healthy" | "unhealthy";

export interface DependencyReport {
  name: string;
  status: DependencyStatus;
  latencyMs: number;
  details: string;
}

export interface DatabaseAdapter {
  checkHealth(): Promise<DependencyReport>;
}

export interface QueueAdapter {
  checkHealth(): Promise<DependencyReport>;
}

export interface StorageAdapter {
  checkHealth(): Promise<DependencyReport>;
}
