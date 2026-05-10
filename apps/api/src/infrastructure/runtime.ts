import type { RuntimeConfig } from "../config/runtime.js";
import { PostgresDatabaseAdapter } from "./database/postgres-adapter.js";
import type {
  DatabaseAdapter,
  JobQueueAdapter,
  QueueAdapter,
  RealtimeEventBus,
  StorageAdapter
} from "./ports.js";
import { BullMqJobQueueAdapter } from "./queue/bullmq-adapter.js";
import { RedisQueueAdapter } from "./queue/redis-adapter.js";
import { RedisRealtimeEventBus } from "./realtime/redis-event-bus.js";
import { MinioStorageAdapter } from "./storage/minio-adapter.js";

export interface RuntimeAdapters {
  database: DatabaseAdapter;
  queue: QueueAdapter;
  jobQueue: JobQueueAdapter;
  realtimeEvents: RealtimeEventBus;
  storage: StorageAdapter;
}

export function createRuntimeAdapters(config: RuntimeConfig): RuntimeAdapters {
  return {
    database: new PostgresDatabaseAdapter(config.databaseUrl),
    queue: new RedisQueueAdapter(config.redisUrl),
    jobQueue: new BullMqJobQueueAdapter(config.redisUrl),
    realtimeEvents: new RedisRealtimeEventBus(config.redisUrl),
    storage: new MinioStorageAdapter(
      config.minioEndpoint,
      config.minioRegion,
      config.minioAccessKey,
      config.minioSecretKey,
      config.minioBucket
    )
  };
}
