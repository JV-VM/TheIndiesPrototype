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
  collection: "/projects/:projectId/assets",
  upload: "/projects/:projectId/assets/upload",
  source: "/projects/:projectId/assets/:assetId/source"
} as const;

export const projectJobRoutes = {
  collection: "/projects/:projectId/jobs",
  createForAsset: "/projects/:projectId/assets/:assetId/jobs",
  detail: "/projects/:projectId/jobs/:jobId",
  retry: "/projects/:projectId/jobs/:jobId/retry",
  thumbnail: "/projects/:projectId/jobs/:jobId/thumbnail"
} as const;

export const realtimeRoutes = {
  socket: "/realtime"
} as const;

export const queueNames = {
  assetProcessing: "asset-processing"
} as const;

export const realtimeChannels = {
  jobUpdates: "tip:realtime:job-updates",
  projectNotifications: "tip:realtime:project-notifications"
} as const;

export const realtimeEvents = {
  jobUpdated: "job.updated",
  notificationCreated: "notification.created"
} as const;

export const realtimeClientMessages = {
  authenticate: "authenticate",
  subscribeProject: "subscribe_project",
  ping: "ping"
} as const;

export const realtimeServerMessages = {
  ready: "ready",
  authenticated: "authenticated",
  subscribed: "subscribed",
  event: "event",
  error: "error",
  pong: "pong"
} as const;
