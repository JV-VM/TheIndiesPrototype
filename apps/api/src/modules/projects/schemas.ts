import { assetKinds, assetLifecycleStatuses } from "@tip/types";
import { z } from "zod";

const paginationSchema = {
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(6)
} as const;

const metadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null()
]);

const metadataSchema = z.record(z.string(), metadataValueSchema);

const projectNameSchema = z
  .string()
  .trim()
  .min(2, "Project names must be at least 2 characters long.")
  .max(80, "Project names must be at most 80 characters long.");

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Project descriptions must be at most 500 characters long.")
  .transform((value) => (value.length === 0 ? null : value));

const optionalProjectDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Project descriptions must be at most 500 characters long.")
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) {
      return value;
    }

    return value.length === 0 ? null : value;
  });

export const listProjectsQuerySchema = z.object({
  query: z.string().trim().max(80).default(""),
  ...paginationSchema
});

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema.optional().nullable().default(null)
});

export const updateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    description: optionalProjectDescriptionSchema
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one project field must be provided."
  });

const assetKindSchema = z.enum(assetKinds);
const assetStatusSchema = z.enum(assetLifecycleStatuses);

export const listProjectAssetsQuerySchema = z.object({
  query: z.string().trim().max(80).default(""),
  status: assetStatusSchema.optional().transform((value) => value ?? null),
  kind: assetKindSchema.optional().transform((value) => value ?? null),
  ...paginationSchema
});

export const createAssetSchema = z.object({
  kind: assetKindSchema,
  status: assetStatusSchema.optional().default("draft"),
  originalFilename: z
    .string()
    .trim()
    .min(1, "Original filename is required.")
    .max(255, "Original filename must be at most 255 characters long."),
  contentType: z
    .string()
    .trim()
    .min(3, "Content type is required.")
    .max(120, "Content type must be at most 120 characters long."),
  byteSize: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  metadata: metadataSchema.optional().nullable()
});

export const uploadProjectAssetQuerySchema = z.object({
  kind: assetKindSchema,
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required.")
    .max(255, "Filename must be at most 255 characters long.")
});

export const updateAssetSchema = z
  .object({
    kind: assetKindSchema.optional(),
    status: assetStatusSchema.optional(),
    originalFilename: z
      .string()
      .trim()
      .min(1, "Original filename is required.")
      .max(255, "Original filename must be at most 255 characters long.")
      .optional(),
    contentType: z
      .string()
      .trim()
      .min(3, "Content type is required.")
      .max(120, "Content type must be at most 120 characters long.")
      .optional(),
    byteSize: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
    metadata: metadataSchema.optional().nullable()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one asset field must be provided."
  });

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectPayload = z.infer<typeof createProjectSchema>;
export type UpdateProjectPayload = z.infer<typeof updateProjectSchema>;
export type ListProjectAssetsQuery = z.infer<
  typeof listProjectAssetsQuerySchema
>;
export type CreateAssetPayload = z.infer<typeof createAssetSchema>;
export type UploadProjectAssetQuery = z.infer<
  typeof uploadProjectAssetQuerySchema
>;
export type UpdateAssetPayload = z.infer<typeof updateAssetSchema>;
