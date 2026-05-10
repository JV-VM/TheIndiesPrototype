export const apiRoutes = {
  health: "/health",
  auth: "/auth",
  projects: "/projects",
  assets: "/assets",
  jobs: "/jobs"
} as const;

export const queueNames = {
  assetProcessing: "asset-processing"
} as const;

export const realtimeEvents = {
  jobUpdated: "job.updated",
  assetUpdated: "asset.updated"
} as const;
