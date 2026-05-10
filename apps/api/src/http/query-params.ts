import { ZodError, type ZodTypeAny } from "zod";

import { HttpError } from "./errors.js";

export function readQueryParams<TSchema extends ZodTypeAny>(
  url: URL,
  schema: TSchema
): import("zod").infer<TSchema> {
  const rawEntries: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    rawEntries[key] = value;
  }

  try {
    return schema.parse(rawEntries);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new HttpError(400, "Query validation failed.", "validation_error", {
        fieldErrors: error.flatten().fieldErrors,
        formErrors: error.flatten().formErrors
      });
    }

    throw error;
  }
}
