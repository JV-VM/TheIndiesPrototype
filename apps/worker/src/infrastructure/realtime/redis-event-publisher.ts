import { realtimeChannels, realtimeEvents } from "@tip/contracts";
import type { ProjectRealtimeEvent } from "@tip/types";
import { createClient, type RedisClientType } from "redis";

type RealtimeChannelName =
  (typeof realtimeChannels)[keyof typeof realtimeChannels];

export class RedisRealtimeEventPublisher {
  private client: RedisClientType | null = null;

  constructor(private readonly redisUrl: string) {}

  async publishEvent(event: ProjectRealtimeEvent): Promise<void> {
    const client = await this.getClient();
    const channel = getChannelName(event);

    await client.publish(channel, JSON.stringify(event));
  }

  async close(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  private async getClient(): Promise<RedisClientType> {
    if (this.client) {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      return this.client;
    }

    this.client = createClient({
      url: this.redisUrl
    });
    this.client.on("error", (error) => {
      console.error("[worker:realtime] redis publisher error", error);
    });
    await this.client.connect();
    return this.client;
  }
}

function getChannelName(event: ProjectRealtimeEvent): RealtimeChannelName {
  if (event.type === realtimeEvents.jobUpdated) {
    return realtimeChannels.jobUpdates;
  }

  return realtimeChannels.projectNotifications;
}
