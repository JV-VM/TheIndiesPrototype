import { Queue } from "bullmq";

import type { EnqueueJobInput, JobQueueAdapter } from "../ports.js";

export class BullMqJobQueueAdapter implements JobQueueAdapter {
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly redisUrl: string) {}

  async enqueueJob<TPayload = Record<string, unknown>>(
    input: EnqueueJobInput<TPayload>
  ): Promise<void> {
    const queue = this.getQueue(input.queueName);

    await queue.add(input.jobName, input.payload, {
      jobId: input.jobId,
      attempts: input.attempts,
      backoff: {
        type: "exponential",
        delay: input.backoffSeconds * 1000
      },
      removeOnComplete: 200,
      removeOnFail: 500
    });
  }

  private getQueue(queueName: string): Queue {
    const existingQueue = this.queues.get(queueName);

    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue(queueName, {
      connection: {
        url: this.redisUrl
      }
    });

    this.queues.set(queueName, queue);
    return queue;
  }
}
