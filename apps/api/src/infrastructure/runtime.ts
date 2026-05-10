import type { RuntimeConfig } from "../config/runtime.js";
import { PostgresDatabaseAdapter } from "./database/postgres-adapter.js";
import type { DatabaseAdapter, QueueAdapter, StorageAdapter } from "./ports.js";
import { RedisQueueAdapter } from "./queue/redis-adapter.js";
import { MinioStorageAdapter } from "./storage/minio-adapter.js";

export interface RuntimeAdapters {
  database: DatabaseAdapter;
  queue: QueueAdapter;
  storage: StorageAdapter;
}

export function createRuntimeAdapters(config: RuntimeConfig): RuntimeAdapters {
  return {
    database: new PostgresDatabaseAdapter(config.databaseUrl),
    queue: new RedisQueueAdapter(config.redisUrl),
    storage: new MinioStorageAdapter(
      config.minioEndpoint,
      config.minioRegion,
      config.minioAccessKey,
      config.minioSecretKey,
      config.minioBucket
    )
  };
}
