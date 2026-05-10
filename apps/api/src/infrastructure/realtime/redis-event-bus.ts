import { realtimeChannels, realtimeEvents } from "@tip/contracts";
import type { ProjectRealtimeEvent } from "@tip/types";
import { createClient, type RedisClientType } from "redis";

import { parseProjectRealtimeEvent } from "../../modules/realtime/protocol.js";
import type { RealtimeEventBus } from "../ports.js";

type RealtimeChannelName =
  (typeof realtimeChannels)[keyof typeof realtimeChannels];

export class RedisRealtimeEventBus implements RealtimeEventBus {
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private subscriptionStarted = false;

  constructor(private readonly redisUrl: string) {}

  async publishEvent(event: ProjectRealtimeEvent): Promise<void> {
    const publisher = await this.getPublisher();
    const channel = getChannelName(event);

    await publisher.publish(channel, JSON.stringify(event));
  }

  async subscribe(
    onEvent: (event: ProjectRealtimeEvent) => void | Promise<void>
  ): Promise<void> {
    if (this.subscriptionStarted) {
      return;
    }

    this.subscriptionStarted = true;
    const subscriber = await this.getSubscriber();

    await subscriber.subscribe(realtimeChannels.jobUpdates, async (message) => {
      await handleIncomingEvent(message, onEvent);
    });
    await subscriber.subscribe(
      realtimeChannels.projectNotifications,
      async (message) => {
        await handleIncomingEvent(message, onEvent);
      }
    );
  }

  async close(): Promise<void> {
    await Promise.all([
      this.publisher?.isOpen ? this.publisher.quit() : Promise.resolve(),
      this.subscriber?.isOpen ? this.subscriber.quit() : Promise.resolve()
    ]);
  }

  private async getPublisher(): Promise<RedisClientType> {
    if (this.publisher) {
      if (!this.publisher.isOpen) {
        await this.publisher.connect();
      }

      return this.publisher;
    }

    this.publisher = createClient({
      url: this.redisUrl
    });
    this.publisher.on("error", (error) => {
      console.error("[api:realtime] redis publisher error", error);
    });
    await this.publisher.connect();
    return this.publisher;
  }

  private async getSubscriber(): Promise<RedisClientType> {
    if (this.subscriber) {
      if (!this.subscriber.isOpen) {
        await this.subscriber.connect();
      }

      return this.subscriber;
    }

    this.subscriber = createClient({
      url: this.redisUrl
    });
    this.subscriber.on("error", (error) => {
      console.error("[api:realtime] redis subscriber error", error);
    });
    await this.subscriber.connect();
    return this.subscriber;
  }
}

function getChannelName(event: ProjectRealtimeEvent): RealtimeChannelName {
  if (event.type === realtimeEvents.jobUpdated) {
    return realtimeChannels.jobUpdates;
  }

  return realtimeChannels.projectNotifications;
}

async function handleIncomingEvent(
  message: string,
  onEvent: (event: ProjectRealtimeEvent) => void | Promise<void>
): Promise<void> {
  try {
    await onEvent(parseProjectRealtimeEvent(message));
  } catch (error) {
    console.error("[api:realtime] dropped invalid event payload", error);
  }
}
