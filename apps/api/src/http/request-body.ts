import { ZodError, type ZodTypeAny, z } from "zod";

import { HttpError } from "./errors.js";

const MAX_BODY_BYTES = 10_000;

export async function readJsonBody<TSchema extends ZodTypeAny>(
  request: import("node:http").IncomingMessage,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  const contentType = request.headers["content-type"] ?? "";

  if (!contentType.includes("application/json")) {
    throw new HttpError(
      415,
      "Requests to this endpoint must use application/json.",
      "unsupported_media_type"
    );
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > MAX_BODY_BYTES) {
      throw new HttpError(
        413,
        "Request body exceeded the allowed size limit.",
        "payload_too_large"
      );
    }

    chunks.push(buffer);
  }

  const rawText = Buffer.concat(chunks).toString("utf8");
  const rawValue = rawText.length === 0 ? {} : safeParseJson(rawText);

  try {
    return schema.parse(rawValue);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new HttpError(
        400,
        "Request validation failed.",
        "validation_error",
        {
          fieldErrors: error.flatten().fieldErrors,
          formErrors: error.flatten().formErrors
        }
      );
    }

    throw error;
  }
}

function safeParseJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    throw new HttpError(400, "Request body is not valid JSON.", "invalid_json");
  }
}
