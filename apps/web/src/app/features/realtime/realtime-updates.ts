import type {
  JobSummary,
  ProjectAssetCollection,
  ProjectJobCollection,
  ProjectJobUpdateEvent
} from "@tip/types";

export function applyRealtimeJobUpdateToAssets(
  collection: ProjectAssetCollection | null,
  event: ProjectJobUpdateEvent
): ProjectAssetCollection | null {
  if (!collection || collection.projectId !== event.projectId) {
    return collection;
  }

  let changed = false;
  const items = collection.items.map((asset) => {
    if (asset.id !== event.assetId) {
      return asset;
    }

    changed = true;

    return {
      ...asset,
      status: event.assetStatus,
      updatedAt: event.occurredAt
    };
  });

  if (!changed) {
    return collection;
  }

  return {
    ...collection,
    items
  };
}

export function applyRealtimeJobUpdateToJobs(
  collection: ProjectJobCollection | null,
  event: ProjectJobUpdateEvent
): ProjectJobCollection | null {
  if (!collection || collection.projectId !== event.projectId) {
    return collection;
  }

  const matchesFilter =
    collection.status === null || collection.status === event.jobStatus;
  const existingJobIndex = collection.items.findIndex(
    (job) => job.id === event.jobId
  );

  if (existingJobIndex >= 0) {
    const existingJob = collection.items[existingJobIndex];

    if (!existingJob) {
      return collection;
    }

    if (!matchesFilter) {
      const totalItems = Math.max(collection.totalItems - 1, 0);

      return {
        ...collection,
        items: collection.items.filter((job) => job.id !== event.jobId),
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / collection.pageSize))
      };
    }

    const nextItems = [...collection.items];
    nextItems[existingJobIndex] = {
      ...existingJob,
      status: event.jobStatus,
      attempts: event.attempts,
      maxAttempts: event.maxAttempts,
      failureReason: event.failureReason,
      updatedAt: event.occurredAt,
      startedAt:
        event.jobStatus === "active" ? event.occurredAt : existingJob.startedAt,
      completedAt:
        event.jobStatus === "completed" || event.jobStatus === "failed"
          ? event.occurredAt
          : existingJob.completedAt
    };

    return {
      ...collection,
      items: nextItems
    };
  }

  if (!matchesFilter || collection.page !== 1) {
    return collection;
  }

  const realtimeJob = createRealtimeJob(event);
  const totalItems = collection.totalItems + 1;

  return {
    ...collection,
    items: [realtimeJob, ...collection.items].slice(0, collection.pageSize),
    totalItems,
    totalPages: Math.max(
      collection.totalPages,
      Math.ceil(totalItems / collection.pageSize)
    )
  };
}

function createRealtimeJob(event: ProjectJobUpdateEvent): JobSummary {
  return {
    id: event.jobId,
    assetId: event.assetId,
    projectId: event.projectId,
    ownerId: event.userId,
    kind: event.jobKind,
    status: event.jobStatus,
    queueName: "asset-processing",
    attempts: event.attempts,
    maxAttempts: event.maxAttempts,
    failureReason: event.failureReason,
    payload: null,
    result: null,
    startedAt: event.jobStatus === "active" ? event.occurredAt : null,
    completedAt:
      event.jobStatus === "completed" || event.jobStatus === "failed"
        ? event.occurredAt
        : null,
    createdAt: event.occurredAt,
    updatedAt: event.occurredAt
  };
}
