import { randomUUID } from "node:crypto";

import { type AssetStatus, Prisma, type PrismaClient } from "@prisma/client";
import { queueNames } from "@tip/contracts";
import type {
  EnqueueAssetJobInput,
  JobSummary,
  ProjectJobUpdateEvent,
  ProjectJobCollection,
  ThumbnailGenerationJobPayload,
  ThumbnailGenerationJobResult
} from "@tip/types";

import { HttpError } from "../../http/errors.js";
import type {
  JobQueueAdapter,
  RealtimeEventPublisher,
  StorageAdapter,
  StoredObject
} from "../../infrastructure/ports.js";
import type { ListProjectJobsQuery } from "./schemas.js";

interface JobsStorageContext {
  adapter: Pick<StorageAdapter, "getObject">;
}

interface DownloadableJobThumbnail {
  filename: string;
  contentType: string;
  object: StoredObject;
}

export class JobsService {
  constructor(
    private readonly prisma: Pick<PrismaClient, "asset" | "job" | "project">,
    private readonly jobQueue: JobQueueAdapter,
    private readonly storageContext?: JobsStorageContext,
    private readonly realtimeEvents?: RealtimeEventPublisher
  ) {}

  async listProjectJobs(
    ownerId: string,
    projectId: string,
    filters: ListProjectJobsQuery
  ): Promise<ProjectJobCollection> {
    await this.ensureOwnedProject(ownerId, projectId);

    const where: Prisma.JobWhereInput = {
      userId: ownerId,
      projectId
    };

    if (filters.status) {
      where.status = filters.status;
    }

    const [totalItems, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      })
    ]);

    return {
      items: jobs.map(mapJobSummary),
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages:
        totalItems === 0 ? 1 : Math.ceil(totalItems / filters.pageSize),
      projectId,
      status: filters.status
    };
  }

  async getProjectJob(
    ownerId: string,
    projectId: string,
    jobId: string
  ): Promise<JobSummary> {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        projectId,
        userId: ownerId
      }
    });

    if (!job) {
      throw new HttpError(404, "Job was not found.", "job_not_found");
    }

    return mapJobSummary(job);
  }

  async enqueueProjectAssetJob(
    ownerId: string,
    projectId: string,
    assetId: string,
    input: EnqueueAssetJobInput
  ): Promise<JobSummary> {
    const asset = await this.requireProcessableAsset(
      ownerId,
      projectId,
      assetId
    );
    const existingJob = await this.prisma.job.findFirst({
      where: {
        assetId,
        userId: ownerId,
        projectId,
        kind: input.kind ?? "thumbnail_generation",
        status: {
          in: ["queued", "active"]
        }
      },
      select: {
        id: true
      }
    });

    if (existingJob) {
      throw new HttpError(
        409,
        "An active processing job already exists for this asset.",
        "job_already_active",
        {
          jobId: existingJob.id
        }
      );
    }

    return this.createAndEnqueueThumbnailJob(asset, {
      kind: input.kind ?? "thumbnail_generation"
    });
  }

  async retryProjectJob(
    ownerId: string,
    projectId: string,
    jobId: string
  ): Promise<JobSummary> {
    const failedJob = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        projectId,
        userId: ownerId
      }
    });

    if (!failedJob) {
      throw new HttpError(404, "Job was not found.", "job_not_found");
    }

    if (failedJob.status !== "failed") {
      throw new HttpError(
        409,
        "Only failed jobs can be retried manually.",
        "job_retry_not_allowed"
      );
    }

    const asset = await this.requireProcessableAsset(
      ownerId,
      projectId,
      failedJob.assetId
    );

    return this.createAndEnqueueThumbnailJob(asset, {
      kind: failedJob.kind,
      retryOfJobId: failedJob.id
    });
  }

  async readProjectJobThumbnail(
    ownerId: string,
    projectId: string,
    jobId: string
  ): Promise<DownloadableJobThumbnail> {
    const storage = this.requireStorageContext();
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        projectId,
        userId: ownerId
      }
    });

    if (!job) {
      throw new HttpError(404, "Job was not found.", "job_not_found");
    }

    if (job.status !== "completed") {
      throw new HttpError(
        409,
        "Processed outputs are only available after job completion.",
        "job_output_unavailable"
      );
    }

    const result = toJobResult(job.result);
    const thumbnail = result?.outputs.find(
      (output) => output.kind === "thumbnail"
    );

    if (!thumbnail) {
      throw new HttpError(
        404,
        "The completed job does not have a thumbnail output.",
        "job_output_not_found"
      );
    }

    try {
      const object = await storage.adapter.getObject(thumbnail.objectKey);

      return {
        filename: thumbnail.filename,
        contentType: thumbnail.contentType,
        object
      };
    } catch {
      throw new HttpError(
        502,
        "The processed thumbnail could not be retrieved from storage.",
        "storage_download_failed",
        {
          jobId
        }
      );
    }
  }

  private async createAndEnqueueThumbnailJob(
    asset: {
      id: string;
      projectId: string;
      userId: string;
      kind: "image";
      status: AssetStatus;
      objectKey: string;
      originalFilename: string;
      contentType: string;
      byteSize: bigint;
    },
    options: {
      kind: "thumbnail_generation";
      retryOfJobId?: string;
    }
  ): Promise<JobSummary> {
    const originalAssetStatus = asset.status;
    const createdJob = await this.prisma.job.create({
      data: {
        assetId: asset.id,
        projectId: asset.projectId,
        userId: asset.userId,
        kind: options.kind,
        status: "queued",
        queueName: queueNames.assetProcessing,
        maxAttempts: 3
      }
    });
    const payload = buildThumbnailGenerationPayload(createdJob.id, asset, {
      ...(options.retryOfJobId
        ? {
            retryOfJobId: options.retryOfJobId
          }
        : {})
    });
    const job = await this.prisma.job.update({
      where: {
        id: createdJob.id
      },
      data: {
        payload: toPrismaJson(payload)
      }
    });

    await this.prisma.asset.update({
      where: {
        id: asset.id
      },
      data: {
        status: "queued"
      }
    });

    try {
      await this.jobQueue.enqueueJob<ThumbnailGenerationJobPayload>({
        queueName: queueNames.assetProcessing,
        jobName: job.kind,
        jobId: job.id,
        payload,
        attempts: job.maxAttempts,
        backoffSeconds: 2
      });
    } catch (error: unknown) {
      await this.prisma.job.update({
        where: {
          id: job.id
        },
        data: {
          status: "failed",
          failureReason:
            error instanceof Error
              ? error.message
              : "Queue enqueue failed unexpectedly.",
          completedAt: new Date()
        }
      });
      await this.prisma.asset.update({
        where: {
          id: asset.id
        },
        data: {
          status: originalAssetStatus
        }
      });

      throw new HttpError(
        502,
        "The processing job could not be queued.",
        "job_queue_enqueue_failed"
      );
    }

    const queuedJob = await this.prisma.job.findUnique({
      where: {
        id: job.id
      }
    });

    if (!queuedJob) {
      throw new HttpError(500, "Queued job was not found.", "job_not_found");
    }

    await publishRealtimeEventSafely(
      this.realtimeEvents,
      buildQueuedJobRealtimeEvent(queuedJob, asset.id, originalAssetStatus)
    );

    return mapJobSummary(queuedJob);
  }

  private async requireProcessableAsset(
    ownerId: string,
    projectId: string,
    assetId: string
  ): Promise<{
    id: string;
    projectId: string;
    userId: string;
    kind: "image";
    status: AssetStatus;
    objectKey: string;
    originalFilename: string;
    contentType: string;
    byteSize: bigint;
  }> {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        userId: ownerId,
        projectId
      },
      select: {
        id: true,
        projectId: true,
        userId: true,
        kind: true,
        status: true,
        objectKey: true,
        originalFilename: true,
        contentType: true,
        byteSize: true
      }
    });

    if (!asset) {
      throw new HttpError(404, "Asset was not found.", "asset_not_found");
    }

    if (!asset.objectKey) {
      throw new HttpError(
        409,
        "The asset must have a stored source object before it can be processed.",
        "asset_source_unavailable"
      );
    }

    if (asset.kind !== "image" || !asset.contentType.startsWith("image/")) {
      throw new HttpError(
        422,
        "The initial processing pipeline only supports uploaded image assets.",
        "asset_processing_not_supported"
      );
    }

    return {
      ...asset,
      kind: "image",
      objectKey: asset.objectKey
    };
  }

  private async ensureOwnedProject(
    ownerId: string,
    projectId: string
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId: ownerId
      },
      select: {
        id: true
      }
    });

    if (!project) {
      throw new HttpError(404, "Project was not found.", "project_not_found");
    }
  }

  private requireStorageContext(): JobsStorageContext {
    if (!this.storageContext) {
      throw new Error("JobsService storage adapter is not configured.");
    }

    return this.storageContext;
  }
}

function buildThumbnailGenerationPayload(
  jobId: string,
  asset: {
    id: string;
    projectId: string;
    userId: string;
    objectKey: string;
    originalFilename: string;
    contentType: string;
    byteSize: bigint;
  },
  options: {
    retryOfJobId?: string;
  }
): ThumbnailGenerationJobPayload {
  return {
    jobId,
    assetId: asset.id,
    projectId: asset.projectId,
    ownerId: asset.userId,
    sourceObjectKey: asset.objectKey,
    originalFilename: asset.originalFilename,
    sourceContentType: asset.contentType,
    sourceByteSize: Number(asset.byteSize),
    ...(options.retryOfJobId ? { retryOfJobId: options.retryOfJobId } : {})
  };
}

function buildQueuedJobRealtimeEvent(
  job: {
    id: string;
    projectId: string;
    userId: string;
    kind: JobSummary["kind"];
    status: JobSummary["status"];
    attempts: number;
    maxAttempts: number;
    failureReason: string | null;
  },
  assetId: string,
  originalAssetStatus: AssetStatus
): ProjectJobUpdateEvent {
  return {
    type: "job.updated",
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    source: "api",
    userId: job.userId,
    projectId: job.projectId,
    assetId,
    jobId: job.id,
    jobKind: job.kind,
    jobStatus: job.status,
    assetStatus:
      job.status === "queued" ? "queued" : mapAssetStatus(originalAssetStatus),
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    failureReason: job.failureReason,
    refreshProjectState: true
  };
}

function mapJobSummary(job: {
  id: string;
  assetId: string;
  projectId: string;
  userId: string;
  kind: JobSummary["kind"];
  status: JobSummary["status"];
  queueName: string;
  attempts: number;
  maxAttempts: number;
  failureReason: string | null;
  payload: Prisma.JsonValue;
  result: Prisma.JsonValue;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): JobSummary {
  return {
    id: job.id,
    assetId: job.assetId,
    projectId: job.projectId,
    ownerId: job.userId,
    kind: job.kind,
    status: job.status,
    queueName: job.queueName,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    failureReason: job.failureReason,
    payload: toJobPayload(job.payload),
    result: toJobResult(job.result),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonObject;
}

function toJobPayload(
  value: Prisma.JsonValue
): ThumbnailGenerationJobPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as unknown as ThumbnailGenerationJobPayload;
}

function toJobResult(
  value: Prisma.JsonValue
): ThumbnailGenerationJobResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as unknown as ThumbnailGenerationJobResult;
}

function mapAssetStatus(
  status: AssetStatus
): ProjectJobUpdateEvent["assetStatus"] {
  return status;
}

async function publishRealtimeEventSafely(
  publisher: RealtimeEventPublisher | undefined,
  event: ProjectJobUpdateEvent
): Promise<void> {
  if (!publisher) {
    return;
  }

  try {
    await publisher.publishEvent(event);
  } catch (error) {
    console.error("[api:jobs] realtime publish failed", error);
  }
}
