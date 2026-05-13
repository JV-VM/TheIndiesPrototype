export interface WorkerRuntimeConfig {
  serviceName: string;
  redisUrl: string;
  databaseUrl: string;
  minioEndpoint: string;
  minioRegion: string;
  minioBucket: string;
  minioAccessKey: string;
  minioSecretKey: string;
  workerConcurrency: number;
  healthPort: number;
}

function readString(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${name}: ${value}`);
  }

  return parsed;
}

function readHttpUrl(
  urlVariableName: string,
  hostPortVariableName: string,
  fallback: string
): string {
  const explicitUrl = process.env[urlVariableName];
  if (explicitUrl) {
    return explicitUrl;
  }

  const hostPort = process.env[hostPortVariableName];
  if (hostPort) {
    return `http://${hostPort}`;
  }

  return fallback;
}

export function readWorkerRuntimeConfig(): WorkerRuntimeConfig {
  return {
    serviceName: "tip-worker",
    redisUrl: readString("REDIS_URL", "redis://localhost:6379"),
    databaseUrl: readString(
      "DATABASE_URL",
      "postgresql://tip:tip@localhost:5432/tip"
    ),
    minioEndpoint: readHttpUrl(
      "MINIO_ENDPOINT",
      "MINIO_HOSTPORT",
      "http://localhost:9000"
    ),
    minioRegion: readString("MINIO_REGION", "us-east-1"),
    minioBucket: readString("MINIO_BUCKET", "tip-assets"),
    minioAccessKey: readString("MINIO_ACCESS_KEY", "tipminio"),
    minioSecretKey: readString("MINIO_SECRET_KEY", "tipminiosecret"),
    workerConcurrency: readNumber("WORKER_CONCURRENCY", 2),
    healthPort: readNumber("WORKER_HEALTH_PORT", 3002)
  };
}
