export type EntityId = string;
export type ISODateString = string;

export type AssetKind = "image" | "audio" | "video" | "document";

export type AssetLifecycleStatus =
  | "draft"
  | "uploaded"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type JobLifecycleStatus = "queued" | "active" | "completed" | "failed";

export interface ProjectSummary {
  id: EntityId;
  name: string;
  ownerId: EntityId;
  createdAt: ISODateString;
}
