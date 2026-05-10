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

export type JobLifecycleStatus = "queued" | "active" | "completed" | "failed";

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
  metadata: Record<string, unknown> | null;
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
