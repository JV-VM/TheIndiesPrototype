export type EntityId = string;
export type ISODateString = string;

export const assetKinds = ["image", "audio", "video", "document"] as const;
export type AssetKind = (typeof assetKinds)[number];

export const assetLifecycleStatuses = [
  "draft",
  "uploaded",
  "queued",
  "processing",
  "completed",
  "failed"
] as const;
export type AssetLifecycleStatus = (typeof assetLifecycleStatuses)[number];

export const jobKinds = ["thumbnail_generation"] as const;
export type JobKind = (typeof jobKinds)[number];

export const jobLifecycleStatuses = [
  "queued",
  "active",
  "completed",
  "failed"
] as const;
export type JobLifecycleStatus = (typeof jobLifecycleStatuses)[number];

export const notificationLevels = ["info", "success", "danger"] as const;
export type NotificationLevel = (typeof notificationLevels)[number];

export const realtimeSources = ["api", "worker"] as const;
export type RealtimeSource = (typeof realtimeSources)[number];

export const realtimeClientMessageKinds = [
  "authenticate",
  "subscribe_project",
  "ping"
] as const;
export type RealtimeClientMessageKind =
  (typeof realtimeClientMessageKinds)[number];

export const realtimeServerMessageKinds = [
  "ready",
  "authenticated",
  "subscribed",
  "event",
  "error",
  "pong"
] as const;
export type RealtimeServerMessageKind =
  (typeof realtimeServerMessageKinds)[number];

export const realtimeEventKinds = [
  "job.updated",
  "notification.created"
] as const;
export type RealtimeEventKind = (typeof realtimeEventKinds)[number];

export interface AuthUser {
  id: EntityId;
  email: string;
  createdAt: ISODateString;
}

export interface AuthSessionPayload {
  accessToken: string;
  accessTokenExpiresAt: ISODateString;
  user: AuthUser;
}

export interface ProjectSummary {
  id: EntityId;
  name: string;
  description: string | null;
  ownerId: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  assetCount: number;
  assetStatusCounts: AssetStatusCounts;
}

export type ProjectDetail = ProjectSummary;

export interface AssetStatusCounts {
  draft: number;
  uploaded: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export interface AssetSummary {
  id: EntityId;
  projectId: EntityId;
  ownerId: EntityId;
  kind: AssetKind;
  status: AssetLifecycleStatus;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  objectKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DerivedAssetOutput {
  kind: "thumbnail";
  objectKey: string;
  contentType: string;
  byteSize: number;
  width: number;
  height: number;
  filename: string;
}

export interface ThumbnailGenerationJobPayload {
  jobId: EntityId;
  assetId: EntityId;
  projectId: EntityId;
  ownerId: EntityId;
  sourceObjectKey: string;
  originalFilename: string;
  sourceContentType: string;
  sourceByteSize: number;
  retryOfJobId?: EntityId;
}

export interface ThumbnailGenerationJobResult {
  outputs: DerivedAssetOutput[];
}

export interface JobSummary {
  id: EntityId;
  assetId: EntityId;
  projectId: EntityId;
  ownerId: EntityId;
  kind: JobKind;
  status: JobLifecycleStatus;
  queueName: string;
  attempts: number;
  maxAttempts: number;
  failureReason: string | null;
  payload: ThumbnailGenerationJobPayload | null;
  result: ThumbnailGenerationJobResult | null;
  startedAt: ISODateString | null;
  completedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PaginatedCollection<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProjectCollection extends PaginatedCollection<ProjectSummary> {
  query: string;
}

export interface ProjectAssetCollection extends PaginatedCollection<AssetSummary> {
  projectId: EntityId;
  query: string;
  kind: AssetKind | null;
  status: AssetLifecycleStatus | null;
}

export interface ProjectJobCollection extends PaginatedCollection<JobSummary> {
  projectId: EntityId;
  status: JobLifecycleStatus | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
}

export interface CreateAssetInput {
  kind: AssetKind;
  status?: AssetLifecycleStatus;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateAssetInput {
  kind?: AssetKind;
  status?: AssetLifecycleStatus;
  originalFilename?: string;
  contentType?: string;
  byteSize?: number;
  metadata?: Record<string, unknown> | null;
}

export interface EnqueueAssetJobInput {
  kind?: JobKind;
}

export interface ProjectJobUpdateEvent {
  type: "job.updated";
  eventId: EntityId;
  occurredAt: ISODateString;
  source: RealtimeSource;
  userId: EntityId;
  projectId: EntityId;
  assetId: EntityId;
  jobId: EntityId;
  jobKind: JobKind;
  jobStatus: JobLifecycleStatus;
  assetStatus: AssetLifecycleStatus;
  attempts: number;
  maxAttempts: number;
  failureReason: string | null;
  refreshProjectState: true;
}

export interface ProjectNotificationEvent {
  type: "notification.created";
  eventId: EntityId;
  occurredAt: ISODateString;
  source: RealtimeSource;
  userId: EntityId;
  projectId: EntityId;
  assetId: EntityId | null;
  jobId: EntityId | null;
  level: NotificationLevel;
  title: string;
  message: string;
  refreshProjectState: boolean;
}

export type ProjectRealtimeEvent =
  | ProjectJobUpdateEvent
  | ProjectNotificationEvent;

export interface RealtimeAuthenticateMessage {
  type: "authenticate";
  accessToken: string;
  projectId?: EntityId | null;
}

export interface RealtimeSubscribeProjectMessage {
  type: "subscribe_project";
  projectId: EntityId | null;
}

export interface RealtimePingMessage {
  type: "ping";
}

export type RealtimeClientMessage =
  | RealtimeAuthenticateMessage
  | RealtimeSubscribeProjectMessage
  | RealtimePingMessage;

export interface RealtimeReadyMessage {
  type: "ready";
  connectionId: EntityId;
  issuedAt: ISODateString;
}

export interface RealtimeAuthenticatedMessage {
  type: "authenticated";
  user: AuthUser;
  issuedAt: ISODateString;
}

export interface RealtimeSubscribedMessage {
  type: "subscribed";
  projectId: EntityId | null;
  fallbackPollIntervalMs: number;
  issuedAt: ISODateString;
}

export interface RealtimeEventMessage {
  type: "event";
  event: ProjectRealtimeEvent;
}

export interface RealtimeErrorMessage {
  type: "error";
  code: string;
  message: string;
  recoverable: boolean;
  issuedAt: ISODateString;
}

export interface RealtimePongMessage {
  type: "pong";
  issuedAt: ISODateString;
}

export type RealtimeServerMessage =
  | RealtimeReadyMessage
  | RealtimeAuthenticatedMessage
  | RealtimeSubscribedMessage
  | RealtimeEventMessage
  | RealtimeErrorMessage
  | RealtimePongMessage;
