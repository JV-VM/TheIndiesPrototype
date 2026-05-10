import type {
  ThumbnailGenerationJobPayload,
  ThumbnailGenerationJobResult
} from "@tip/types";
import sharp from "sharp";

export const imageProcessingPipeline = {
  name: "image-processing",
  responsibility:
    "Hosts Sharp-based transformations and derivative output generation.",
  initialOutput: "thumbnails"
} as const;

export interface GeneratedThumbnail {
  body: Buffer;
  result: ThumbnailGenerationJobResult;
}

export async function generateThumbnailDerivative(input: {
  payload: ThumbnailGenerationJobPayload;
  sourceBody: Buffer;
}): Promise<GeneratedThumbnail> {
  const rendered = await sharp(input.sourceBody)
    .rotate()
    .resize({
      width: 320,
      height: 320,
      fit: "inside",
      withoutEnlargement: true
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  const filename = buildThumbnailFilename(input.payload.originalFilename);
  const objectKey = buildThumbnailObjectKey(
    input.payload.projectId,
    input.payload.assetId,
    filename
  );

  return {
    body: rendered.data,
    result: {
      outputs: [
        {
          kind: "thumbnail",
          objectKey,
          contentType: "image/png",
          byteSize: rendered.data.byteLength,
          width: rendered.info.width ?? 0,
          height: rendered.info.height ?? 0,
          filename
        }
      ]
    }
  };
}

export function buildThumbnailObjectKey(
  projectId: string,
  assetId: string,
  filename: string
): string {
  return `projects/${projectId}/assets/${assetId}/derived/${filename}`;
}

function buildThumbnailFilename(originalFilename: string): string {
  const basename = originalFilename
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .pop();
  const normalized = (basename ?? "asset")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/(\.[A-Za-z0-9]{1,12})$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80);

  return `${normalized || "asset"}-thumbnail.png`;
}
