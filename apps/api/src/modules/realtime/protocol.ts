import { randomUUID } from "node:crypto";

import { realtimeClientMessages, realtimeServerMessages } from "@tip/contracts";
import type {
  AuthUser,
  ProjectRealtimeEvent,
  RealtimeAuthenticatedMessage,
  RealtimeClientMessage,
  RealtimeErrorMessage,
  RealtimePongMessage,
  RealtimeReadyMessage,
  RealtimeSubscribedMessage
} from "@tip/types";
import { z, ZodError } from "zod";

const nullableProjectIdSchema = z.string().trim().min(1).nullable().optional();

const realtimeClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(realtimeClientMessages.authenticate),
    accessToken: z.string().trim().min(1),
    projectId: nullableProjectIdSchema
  }),
  z.object({
    type: z.literal(realtimeClientMessages.subscribeProject),
    projectId: nullableProjectIdSchema
  }),
  z.object({
    type: z.literal(realtimeClientMessages.ping)
  })
]);

const realtimeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("job.updated"),
    eventId: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    source: z.enum(["api", "worker"]),
    userId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    assetId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    jobKind: z.literal("thumbnail_generation"),
    jobStatus: z.enum(["queued", "active", "completed", "failed"]),
    assetStatus: z.enum([
      "draft",
      "uploaded",
      "queued",
      "processing",
      "completed",
      "failed"
    ]),
    attempts: z.number().int().nonnegative(),
    maxAttempts: z.number().int().positive(),
    failureReason: z.string().nullable(),
    refreshProjectState: z.literal(true)
  }),
  z.object({
    type: z.literal("notification.created"),
    eventId: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    source: z.enum(["api", "worker"]),
    userId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    assetId: z.string().trim().min(1).nullable(),
    jobId: z.string().trim().min(1).nullable(),
    level: z.enum(["info", "success", "danger"]),
    title: z.string().trim().min(1),
    message: z.string().trim().min(1),
    refreshProjectState: z.boolean()
  })
]);

export function parseRealtimeClientMessage(
  raw: Buffer | string
): RealtimeClientMessage {
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
  const value = safeParseJson(text);

  try {
    const parsed = realtimeClientMessageSchema.parse(value);

    if (parsed.type === realtimeClientMessages.ping) {
      return parsed;
    }

    if (parsed.type === realtimeClientMessages.authenticate) {
      return {
        ...parsed,
        projectId: normalizeProjectId(parsed.projectId)
      };
    }

    return {
      ...parsed,
      projectId: normalizeProjectId(parsed.projectId)
    };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new Error("Realtime client message failed validation.");
    }

    throw error;
  }
}

export function parseProjectRealtimeEvent(raw: string): ProjectRealtimeEvent {
  const value = safeParseJson(raw);

  try {
    return realtimeEventSchema.parse(value);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      throw new Error("Realtime event payload failed validation.");
    }

    throw error;
  }
}

export function createRealtimeReadyMessage(
  connectionId = randomUUID()
): RealtimeReadyMessage {
  return {
    type: realtimeServerMessages.ready,
    connectionId,
    issuedAt: new Date().toISOString()
  };
}

export function createRealtimeAuthenticatedMessage(
  user: AuthUser
): RealtimeAuthenticatedMessage {
  return {
    type: realtimeServerMessages.authenticated,
    user,
    issuedAt: new Date().toISOString()
  };
}

export function createRealtimeSubscribedMessage(
  projectId: string | null,
  fallbackPollIntervalMs: number
): RealtimeSubscribedMessage {
  return {
    type: realtimeServerMessages.subscribed,
    projectId,
    fallbackPollIntervalMs,
    issuedAt: new Date().toISOString()
  };
}

export function createRealtimePongMessage(): RealtimePongMessage {
  return {
    type: realtimeServerMessages.pong,
    issuedAt: new Date().toISOString()
  };
}

export function createRealtimeErrorMessage(
  code: string,
  message: string,
  recoverable: boolean
): RealtimeErrorMessage {
  return {
    type: realtimeServerMessages.error,
    code,
    message,
    recoverable,
    issuedAt: new Date().toISOString()
  };
}

export function shouldDeliverProjectRealtimeEvent(
  subscribedProjectId: string | null,
  eventProjectId: string
): boolean {
  return subscribedProjectId === null || subscribedProjectId === eventProjectId;
}

export function serializeRealtimeMessage(message: unknown): string {
  return JSON.stringify(message);
}

function normalizeProjectId(
  projectId: string | null | undefined
): string | null {
  if (!projectId) {
    return null;
  }

  return projectId.trim();
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Realtime message is not valid JSON.");
  }
}
