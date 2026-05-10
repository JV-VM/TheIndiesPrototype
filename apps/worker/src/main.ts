import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { queueNames } from "@tip/contracts";
import type {
  ProjectJobUpdateEvent,
  ProjectNotificationEvent,
  ThumbnailGenerationJobPayload
} from "@tip/types";
import { Worker } from "bullmq";

import { readWorkerRuntimeConfig } from "./config/runtime.js";
import { prisma } from "./infrastructure/database/prisma-client.js";
import { checkWorkerRuntimeDependencies } from "./infrastructure/health/check-runtime-dependencies.js";
import { toBullMqConnection } from "./infrastructure/queue/connection.js";
import { RedisRealtimeEventPublisher } from "./infrastructure/realtime/redis-event-publisher.js";
import { WorkerMinioClient } from "./infrastructure/storage/minio-client.js";
import {
  generateThumbnailDerivative,
  imageProcessingPipeline
} from "./processors/image-processing.js";
import { assetQueue } from "./queues/assets.js";
import { logHeartbeat } from "./runtime/heartbeat.js";
import { buildFailureTransition } from "./runtime/job-state.js";

const config = readWorkerRuntimeConfig();
const realtimeEvents = new RedisRealtimeEventPublisher(config.redisUrl);
const minio = new WorkerMinioClient(
  config.minioEndpoint,
  config.minioRegion,
  config.minioAccessKey,
  config.minioSecretKey,
  config.minioBucket
);

if (process.env.TIP_DRY_RUN === "1") {
  logHeartbeat("dry run complete", {
    queue: assetQueue.name,
    pipeline: imageProcessingPipeline.name,
    concurrency: config.workerConcurrency,
    healthPort: config.healthPort
  });
  process.exit(0);
}

const healthServer = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    sendWorkerJson(response, 200, {
      service: config.serviceName,
      status: "ok",
      phase: "phase-8-operational-hardening"
    });
    return;
  }

  if (url.pathname === "/ready") {
    void checkWorkerRuntimeDependencies(
      config.serviceName,
      config.redisUrl,
      minio
    )
      .then((readiness) => {
        sendWorkerJson(
          response,
          readiness.status === "ok" ? 200 : 503,
          readiness
        );
      })
      .catch((error: unknown) => {
        sendWorkerJson(response, 503, {
          service: config.serviceName,
          status: "degraded",
          checkedAt: new Date().toISOString(),
          dependencies: [],
          error: formatError(error)
        });
      });
    return;
  }

  sendWorkerJson(response, 404, {
    error: {
      code: "route_not_found",
      message: "The requested worker route does not exist."
    }
  });
});

const worker = new Worker<ThumbnailGenerationJobPayload>(
  queueNames.assetProcessing,
  async (job) => {
    const payload = job.data;
    const attemptNumber = job.attemptsMade + 1;
    const jobLogContext = {
      jobId: payload.jobId,
      assetId: payload.assetId,
      projectId: payload.projectId,
      ownerId: payload.ownerId,
      attemptNumber,
      maxAttempts: job.opts.attempts ?? 1
    };

    logHeartbeat("job.processing_started", jobLogContext);

    await prisma.job.update({
      where: {
        id: payload.jobId
      },
      data: {
        status: "active",
        attempts: attemptNumber,
        failureReason: null,
        startedAt: new Date(),
        completedAt: null
      }
    });
    await prisma.asset.update({
      where: {
        id: payload.assetId
      },
      data: {
        status: "processing"
      }
    });
    await publishRealtimeEventSafely(
      realtimeEvents,
      buildJobUpdatedEvent(payload, {
        jobStatus: "active",
        assetStatus: "processing",
        attempts: attemptNumber,
        maxAttempts: job.opts.attempts ?? 1,
        failureReason: null
      })
    );

    try {
      const source = await minio.getObject(payload.sourceObjectKey);
      const derivedThumbnail = await generateThumbnailDerivative({
        payload,
        sourceBody: source.body
      });
      const thumbnail = derivedThumbnail.result.outputs[0];

      if (!thumbnail) {
        throw new Error("Thumbnail generation returned no outputs.");
      }

      await minio.putObject({
        objectKey: thumbnail.objectKey,
        body: derivedThumbnail.body,
        contentType: thumbnail.contentType,
        metadata: {
          assetid: payload.assetId,
          jobid: payload.jobId,
          projectid: payload.projectId,
          outputkind: thumbnail.kind
        }
      });

      await prisma.job.update({
        where: {
          id: payload.jobId
        },
        data: {
          status: "completed",
          attempts: attemptNumber,
          failureReason: null,
          result: toPrismaJson(derivedThumbnail.result),
          completedAt: new Date()
        }
      });
      await prisma.asset.update({
        where: {
          id: payload.assetId
        },
        data: {
          status: "completed"
        }
      });
      await publishRealtimeEventSafely(
        realtimeEvents,
        buildJobUpdatedEvent(payload, {
          jobStatus: "completed",
          assetStatus: "completed",
          attempts: attemptNumber,
          maxAttempts: job.opts.attempts ?? 1,
          failureReason: null
        })
      );
      await publishRealtimeEventSafely(
        realtimeEvents,
        buildNotificationEvent(payload, {
          level: "success",
          title: "Processing completed",
          message: `${payload.originalFilename} finished thumbnail generation.`
        })
      );

      logHeartbeat("job.processing_completed", jobLogContext);

      return derivedThumbnail.result;
    } catch (error: unknown) {
      const failureTransition = buildFailureTransition({
        attemptsMade: attemptNumber,
        maxAttempts: job.opts.attempts ?? 1
      });

      await prisma.job.update({
        where: {
          id: payload.jobId
        },
        data: {
          status: failureTransition.jobStatus,
          attempts: attemptNumber,
          failureReason: formatError(error),
          completedAt: failureTransition.completedAt
        }
      });
      await prisma.asset.update({
        where: {
          id: payload.assetId
        },
        data: {
          status: failureTransition.assetStatus
        }
      });
      await publishRealtimeEventSafely(
        realtimeEvents,
        buildJobUpdatedEvent(payload, {
          jobStatus: failureTransition.jobStatus,
          assetStatus: failureTransition.assetStatus,
          attempts: attemptNumber,
          maxAttempts: job.opts.attempts ?? 1,
          failureReason: formatError(error)
        })
      );

      if (failureTransition.jobStatus === "failed") {
        await publishRealtimeEventSafely(
          realtimeEvents,
          buildNotificationEvent(payload, {
            level: "danger",
            title: "Processing failed",
            message: `${payload.originalFilename} exhausted all processing attempts.`
          })
        );
      }

      logHeartbeat(
        "job.processing_failed",
        {
          ...jobLogContext,
          nextJobStatus: failureTransition.jobStatus,
          nextAssetStatus: failureTransition.assetStatus,
          reason: formatError(error)
        },
        failureTransition.jobStatus === "failed" ? "error" : "warn"
      );

      throw error;
    }
  },
  {
    connection: toBullMqConnection(config.redisUrl),
    concurrency: config.workerConcurrency
  }
);

worker.on("ready", () => {
  logHeartbeat("worker ready", {
    queue: assetQueue.name,
    pipeline: imageProcessingPipeline.name,
    concurrency: config.workerConcurrency,
    healthPort: config.healthPort
  });
});

worker.on("completed", (job) => {
  logHeartbeat("job.completed", {
    jobId: job.id ?? "unknown"
  });
});

worker.on("failed", (job, error) => {
  logHeartbeat(
    "job.failed",
    {
      jobId: job?.id ?? "unknown",
      reason: error.message
    },
    "warn"
  );
});

worker.on("error", (error) => {
  logHeartbeat(
    "worker.error",
    {
      reason: formatError(error)
    },
    "error"
  );
});

healthServer.listen(config.healthPort, () => {
  logHeartbeat("health server ready", {
    healthPort: config.healthPort
  });
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown worker failure.";
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonObject;
}

function buildJobUpdatedEvent(
  payload: ThumbnailGenerationJobPayload,
  options: {
    jobStatus: ProjectJobUpdateEvent["jobStatus"];
    assetStatus: ProjectJobUpdateEvent["assetStatus"];
    attempts: number;
    maxAttempts: number;
    failureReason: string | null;
  }
): ProjectJobUpdateEvent {
  return {
    type: "job.updated",
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    source: "worker",
    userId: payload.ownerId,
    projectId: payload.projectId,
    assetId: payload.assetId,
    jobId: payload.jobId,
    jobKind: "thumbnail_generation",
    jobStatus: options.jobStatus,
    assetStatus: options.assetStatus,
    attempts: options.attempts,
    maxAttempts: options.maxAttempts,
    failureReason: options.failureReason,
    refreshProjectState: true
  };
}

function buildNotificationEvent(
  payload: ThumbnailGenerationJobPayload,
  options: {
    level: ProjectNotificationEvent["level"];
    title: string;
    message: string;
  }
): ProjectNotificationEvent {
  return {
    type: "notification.created",
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    source: "worker",
    userId: payload.ownerId,
    projectId: payload.projectId,
    assetId: payload.assetId,
    jobId: payload.jobId,
    level: options.level,
    title: options.title,
    message: options.message,
    refreshProjectState: true
  };
}

async function publishRealtimeEventSafely(
  publisher: RedisRealtimeEventPublisher,
  event: ProjectJobUpdateEvent | ProjectNotificationEvent
): Promise<void> {
  try {
    await publisher.publishEvent(event);
  } catch (error) {
    logHeartbeat(
      "realtime.publish_failed",
      {
        eventType: event.type,
        reason: formatError(error)
      },
      "error"
    );
  }
}

function sendWorkerJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function shutdown(signal: string): Promise<void> {
  logHeartbeat("shutdown.received", {
    signal
  });

  await Promise.allSettled([
    worker.close(),
    realtimeEvents.close(),
    prisma.$disconnect(),
    new Promise<void>((resolve, reject) => {
      healthServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    })
  ]);

  process.exit(0);
}
