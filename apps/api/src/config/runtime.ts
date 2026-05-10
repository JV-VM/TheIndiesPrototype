export interface RuntimeConfig {
  nodeEnv: string;
  isProduction: boolean;
  serviceName: string;
  port: number;
  webOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  minioEndpoint: string;
  minioRegion: string;
  minioBucket: string;
  minioAccessKey: string;
  minioSecretKey: string;
  uploadMaxBytes: number;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

function readString(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readPort(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid port value for ${name}: ${value}`);
  }

  return parsed;
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

export function readRuntimeConfig(): RuntimeConfig {
  const nodeEnv = readString("NODE_ENV", "development");

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    serviceName: "tip-api",
    port: readPort("PORT", 3001),
    webOrigin: readString("TIP_WEB_ORIGIN", "http://localhost:13000"),
    databaseUrl: readString(
      "DATABASE_URL",
      "postgresql://tip:tip@localhost:5432/tip"
    ),
    redisUrl: readString("REDIS_URL", "redis://localhost:6379"),
    minioEndpoint: readString("MINIO_ENDPOINT", "http://localhost:9000"),
    minioRegion: readString("MINIO_REGION", "us-east-1"),
    minioBucket: readString("MINIO_BUCKET", "tip-assets"),
    minioAccessKey: readString("MINIO_ACCESS_KEY", "tipminio"),
    minioSecretKey: readString("MINIO_SECRET_KEY", "tipminiosecret"),
    uploadMaxBytes: readNumber("UPLOAD_MAX_BYTES", 25 * 1024 * 1024),
    jwtAccessSecret: readString("JWT_ACCESS_SECRET", "tip-access-secret"),
    jwtRefreshSecret: readString("JWT_REFRESH_SECRET", "tip-refresh-secret"),
    accessTokenTtlSeconds: readNumber("JWT_ACCESS_TTL_SECONDS", 15 * 60),
    refreshTokenTtlSeconds: readNumber(
      "JWT_REFRESH_TTL_SECONDS",
      60 * 60 * 24 * 7
    )
  };
}
