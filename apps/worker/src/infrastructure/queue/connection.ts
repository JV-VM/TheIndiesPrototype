export interface BullMqConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  maxRetriesPerRequest: null;
}

export function toBullMqConnection(redisUrl: string): BullMqConnectionOptions {
  const url = new URL(redisUrl);
  const pathname = url.pathname.replace("/", "");

  return {
    host: url.hostname,
    port: Number.parseInt(url.port || "6379", 10),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(pathname ? { db: Number.parseInt(pathname, 10) } : {}),
    maxRetriesPerRequest: null
  };
}
