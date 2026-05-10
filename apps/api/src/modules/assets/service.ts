import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  AssetKind,
  AssetSummary,
  CreateAssetInput,
  ProjectAssetCollection,
  UpdateAssetInput
} from "@tip/types";

import { HttpError } from "../../http/errors.js";
import type { StorageAdapter } from "../../infrastructure/ports.js";
import type { ListProjectAssetsQuery } from "../projects/schemas.js";
import {
  buildAssetSourceObjectKey,
  sanitizeAssetFilename
} from "./upload-policy.js";

interface AssetStorageContext {
  adapter: Pick<StorageAdapter, "getObject" | "putObject">;
  bucket: string;
}

export interface UploadProjectAssetInput {
  kind: AssetKind;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  body: Buffer;
}

export interface ProjectAssetSource {
  filename: string;
  contentType: string;
  byteSize: number;
  body: Buffer;
}

export class AssetsService {
  constructor(
    private readonly prisma: Pick<PrismaClient, "project" | "asset">,
    private readonly storageContext?: AssetStorageContext
  ) {}

  async listProjectAssets(
    ownerId: string,
    projectId: string,
    filters: ListProjectAssetsQuery
  ): Promise<ProjectAssetCollection> {
    await this.ensureOwnedProject(ownerId, projectId);

    const where: Prisma.AssetWhereInput = {
      userId: ownerId,
      projectId
    };

    if (filters.query) {
      where.originalFilename = {
        contains: filters.query,
        mode: "insensitive"
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.kind) {
      where.kind = filters.kind;
    }

    const [totalItems, assets] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      })
    ]);

    return {
      items: assets.map(mapAssetSummary),
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages:
        totalItems === 0 ? 1 : Math.ceil(totalItems / filters.pageSize),
      projectId,
      query: filters.query,
      kind: filters.kind,
      status: filters.status
    };
  }

  async createProjectAsset(
    ownerId: string,
    projectId: string,
    input: CreateAssetInput
  ): Promise<AssetSummary> {
    await this.ensureOwnedProject(ownerId, projectId);

    const data: Prisma.AssetUncheckedCreateInput = {
      userId: ownerId,
      projectId,
      kind: input.kind,
      status: input.status ?? "draft",
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      byteSize: BigInt(input.byteSize)
    };

    const metadata = toPrismaMetadata(input.metadata);

    if (metadata !== undefined) {
      data.metadata = metadata;
    }

    const asset = await this.prisma.asset.create({
      data
    });

    return mapAssetSummary(asset);
  }

  async updateProjectAsset(
    ownerId: string,
    projectId: string,
    assetId: string,
    input: UpdateAssetInput
  ): Promise<AssetSummary> {
    await this.ensureOwnedAsset(ownerId, projectId, assetId);

    const data: Prisma.AssetUncheckedUpdateInput = {};

    if (input.kind !== undefined) {
      data.kind = input.kind;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    if (input.originalFilename !== undefined) {
      data.originalFilename = input.originalFilename;
    }

    if (input.contentType !== undefined) {
      data.contentType = input.contentType;
    }

    if (input.byteSize !== undefined) {
      data.byteSize = BigInt(input.byteSize);
    }

    if (input.metadata !== undefined) {
      const metadata = toPrismaMetadata(input.metadata);

      if (metadata !== undefined) {
        data.metadata = metadata;
      }
    }

    const asset = await this.prisma.asset.update({
      where: {
        id: assetId
      },
      data
    });

    return mapAssetSummary(asset);
  }

  async uploadProjectAsset(
    ownerId: string,
    projectId: string,
    input: UploadProjectAssetInput
  ): Promise<AssetSummary> {
    await this.ensureOwnedProject(ownerId, projectId);
    const storage = this.requireStorageContext();

    const draftAsset = await this.prisma.asset.create({
      data: {
        userId: ownerId,
        projectId,
        kind: input.kind,
        status: "draft",
        originalFilename: input.originalFilename,
        contentType: input.contentType,
        byteSize: BigInt(input.byteSize)
      }
    });

    const sanitizedFilename = sanitizeAssetFilename(input.originalFilename);
    const objectKey = buildAssetSourceObjectKey(
      projectId,
      draftAsset.id,
      sanitizedFilename
    );
    const uploadedAt = new Date().toISOString();

    try {
      await storage.adapter.putObject({
        objectKey,
        body: input.body,
        contentType: input.contentType,
        metadata: {
          assetid: draftAsset.id,
          ownerid: ownerId,
          projectid: projectId,
          uploadflow: "api-proxy"
        }
      });
    } catch (error: unknown) {
      const failureReason =
        error instanceof Error
          ? error.message
          : "Unknown object storage error.";

      await this.prisma.asset.update({
        where: {
          id: draftAsset.id
        },
        data: {
          status: "failed",
          metadata: {
            uploadFlow: "api-proxy",
            uploadAttemptedAt: uploadedAt,
            uploadFailureReason: failureReason,
            storageBucket: storage.bucket,
            sanitizedFilename
          }
        }
      });

      throw new HttpError(
        502,
        "Asset upload failed while writing the file to object storage.",
        "storage_upload_failed",
        {
          assetId: draftAsset.id
        }
      );
    }

    const asset = await this.prisma.asset.update({
      where: {
        id: draftAsset.id
      },
      data: {
        status: "uploaded",
        objectKey,
        metadata: {
          uploadFlow: "api-proxy",
          uploadSucceededAt: uploadedAt,
          storageBucket: storage.bucket,
          sanitizedFilename
        }
      }
    });

    return mapAssetSummary(asset);
  }

  async readProjectAssetSource(
    ownerId: string,
    projectId: string,
    assetId: string
  ): Promise<ProjectAssetSource> {
    const storage = this.requireStorageContext();
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        projectId,
        userId: ownerId
      },
      select: {
        id: true,
        originalFilename: true,
        contentType: true,
        byteSize: true,
        objectKey: true
      }
    });

    if (!asset) {
      throw new HttpError(404, "Asset was not found.", "asset_not_found");
    }

    if (!asset.objectKey) {
      throw new HttpError(
        409,
        "This asset does not have a stored source object yet.",
        "asset_source_unavailable"
      );
    }

    try {
      const storedObject = await storage.adapter.getObject(asset.objectKey);

      return {
        filename: asset.originalFilename,
        contentType: storedObject.contentType || asset.contentType,
        byteSize: Number(asset.byteSize),
        body: storedObject.body
      };
    } catch {
      throw new HttpError(
        502,
        "The source object could not be retrieved from storage.",
        "storage_download_failed",
        {
          assetId
        }
      );
    }
  }

  private requireStorageContext(): AssetStorageContext {
    if (!this.storageContext) {
      throw new Error("AssetsService storage adapter is not configured.");
    }

    return this.storageContext;
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

  private async ensureOwnedAsset(
    ownerId: string,
    projectId: string,
    assetId: string
  ): Promise<void> {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        projectId,
        userId: ownerId
      },
      select: {
        id: true
      }
    });

    if (!asset) {
      throw new HttpError(404, "Asset was not found.", "asset_not_found");
    }
  }
}

function mapAssetSummary(asset: {
  id: string;
  projectId: string;
  userId: string;
  kind: AssetSummary["kind"];
  status: AssetSummary["status"];
  originalFilename: string;
  contentType: string;
  byteSize: bigint;
  objectKey: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): AssetSummary {
  return {
    id: asset.id,
    projectId: asset.projectId,
    ownerId: asset.userId,
    kind: asset.kind,
    status: asset.status,
    originalFilename: asset.originalFilename,
    contentType: asset.contentType,
    byteSize: Number(asset.byteSize),
    objectKey: asset.objectKey,
    metadata: toSerializableMetadata(asset.metadata),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString()
  };
}

function toPrismaMetadata(
  metadata: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  if (metadata === null) {
    return Prisma.JsonNull;
  }

  return metadata as Prisma.InputJsonObject;
}

function toSerializableMetadata(
  metadata: Prisma.JsonValue
): Record<string, unknown> | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return null;
}
