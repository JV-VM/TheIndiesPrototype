import { jobKinds, jobLifecycleStatuses } from "@tip/types";
import { z } from "zod";

const paginationSchema = {
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(6)
} as const;

export const listProjectJobsQuerySchema = z.object({
  status: z
    .enum(jobLifecycleStatuses)
    .optional()
    .transform((value) => value ?? null),
  ...paginationSchema
});

export const enqueueAssetJobSchema = z.object({
  kind: z.enum(jobKinds).optional().default("thumbnail_generation")
});

export type ListProjectJobsQuery = z.infer<typeof listProjectJobsQuerySchema>;
export type EnqueueAssetJobPayload = z.infer<typeof enqueueAssetJobSchema>;
