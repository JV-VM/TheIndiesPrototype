import type { IncomingMessage } from "node:http";

import { HttpError } from "./errors.js";

interface ReadBinaryBodyOptions {
  maxBytes: number;
}

export interface BinaryBodyPayload {
  body: Buffer;
  contentType: string;
  byteSize: number;
}

export async function readBinaryBody(
  request: IncomingMessage,
  options: ReadBinaryBodyOptions
): Promise<BinaryBodyPayload> {
  const contentType = readContentType(request);
  const declaredLength = request.headers["content-length"];

  if (declaredLength) {
    const parsedLength = Number.parseInt(declaredLength, 10);

    if (Number.isNaN(parsedLength) || parsedLength < 0) {
      throw new HttpError(
        400,
        "Content-Length must be a valid non-negative integer.",
        "invalid_content_length"
      );
    }

    if (parsedLength > options.maxBytes) {
      throw new HttpError(
        413,
        "Upload exceeded the allowed size limit.",
        "payload_too_large"
      );
    }
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > options.maxBytes) {
      throw new HttpError(
        413,
        "Upload exceeded the allowed size limit.",
        "payload_too_large"
      );
    }

    chunks.push(buffer);
  }

  if (totalBytes === 0) {
    throw new HttpError(
      400,
      "Upload requests must include a non-empty file body.",
      "empty_upload_body"
    );
  }

  return {
    body: Buffer.concat(chunks),
    contentType,
    byteSize: totalBytes
  };
}

function readContentType(request: IncomingMessage): string {
  const contentType = request.headers["content-type"];

  if (typeof contentType !== "string" || contentType.trim().length === 0) {
    throw new HttpError(
      415,
      "Upload requests must include a valid Content-Type header.",
      "unsupported_media_type"
    );
  }

  return contentType.trim();
}
