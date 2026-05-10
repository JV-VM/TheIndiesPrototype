import type { AssetKind } from "@tip/types";

import { HttpError } from "../../http/errors.js";

const supportedMimeTypes: Record<AssetKind, string[]> = {
  image: [
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp"
  ],
  audio: ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"],
  video: ["video/mp4", "video/quicktime", "video/webm"],
  document: [
    "application/json",
    "application/pdf",
    "text/markdown",
    "text/plain"
  ]
};

export interface AssetUploadValidationInput {
  kind: AssetKind;
  contentType: string;
  byteSize: number;
  maxBytes: number;
  originalFilename: string;
}

export interface AssetUploadValidationResult {
  contentType: string;
  sanitizedFilename: string;
}

export function validateAssetUpload(
  input: AssetUploadValidationInput
): AssetUploadValidationResult {
  const contentType = normalizeContentType(input.contentType);
  const sanitizedFilename = sanitizeAssetFilename(input.originalFilename);
  const allowedMimeTypes = supportedMimeTypes[input.kind];

  if (!allowedMimeTypes.includes(contentType)) {
    throw new HttpError(
      415,
      `Unsupported content type "${contentType}" for asset kind "${input.kind}".`,
      "unsupported_media_type",
      {
        allowedMimeTypes
      }
    );
  }

  if (input.byteSize > input.maxBytes) {
    throw new HttpError(
      413,
      "Upload exceeded the configured size limit.",
      "payload_too_large",
      {
        maxBytes: input.maxBytes
      }
    );
  }

  return {
    contentType,
    sanitizedFilename
  };
}

export function buildAssetSourceObjectKey(
  projectId: string,
  assetId: string,
  sanitizedFilename: string
): string {
  return `projects/${projectId}/assets/${assetId}/source/${sanitizedFilename}`;
}

export function sanitizeAssetFilename(originalFilename: string): string {
  const basename = originalFilename
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .pop();
  const normalized = (basename ?? "asset")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");

  const extensionMatch = normalized.match(/(\.[A-Za-z0-9]{1,12})$/);
  const extension = extensionMatch?.[1] ? extensionMatch[1].toLowerCase() : "";
  const baseName = normalized
    .replace(/(\.[A-Za-z0-9]{1,12})$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80);

  return `${baseName || "asset"}${extension}`;
}

function normalizeContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}
