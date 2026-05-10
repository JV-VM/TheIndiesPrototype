export const apiRoutes = {
  health: "/health",
  auth: "/auth",
  projects: "/projects",
  assets: "/assets",
  jobs: "/jobs"
} as const;

export const authRoutes = {
  register: "/auth/register",
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  me: "/auth/me"
} as const;

export const projectRoutes = {
  collection: "/projects"
} as const;

export const projectAssetRoutes = {
  collection: "/projects/:projectId/assets"
} as const;

export const queueNames = {
  assetProcessing: "asset-processing"
} as const;

export const realtimeEvents = {
  jobUpdated: "job.updated",
  assetUpdated: "asset.updated"
} as const;
