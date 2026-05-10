import type { ProjectRealtimeEvent } from "@tip/types";

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

export interface EnqueueJobInput<TPayload = Record<string, unknown>> {
  queueName: string;
  jobName: string;
  jobId: string;
  payload: TPayload;
  attempts: number;
  backoffSeconds: number;
}

export interface JobQueueAdapter {
  enqueueJob<TPayload = Record<string, unknown>>(
    input: EnqueueJobInput<TPayload>
  ): Promise<void>;
}

export interface RealtimeEventPublisher {
  publishEvent(event: ProjectRealtimeEvent): Promise<void>;
}

export interface RealtimeEventSubscriber {
  subscribe(
    onEvent: (event: ProjectRealtimeEvent) => void | Promise<void>
  ): Promise<void>;
  close(): Promise<void>;
}

export interface RealtimeEventBus
  extends RealtimeEventPublisher, RealtimeEventSubscriber {}

export interface PutStorageObjectInput {
  objectKey: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StoredObject {
  objectKey: string;
  body: Buffer;
  contentType: string;
  byteSize: number;
  etag: string | null;
}

export interface StorageAdapter {
  checkHealth(): Promise<DependencyReport>;
  putObject(input: PutStorageObjectInput): Promise<void>;
  getObject(objectKey: string): Promise<StoredObject>;
}
