import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import { realtimeRoutes, realtimeServerMessages } from "@tip/contracts";
import type {
  AuthUser,
  ProjectRealtimeEvent,
  RealtimeClientMessage,
  RealtimeEventMessage
} from "@tip/types";
import { WebSocket, WebSocketServer, type RawData } from "ws";

import type { RuntimeConfig } from "../../config/runtime.js";
import type { RealtimeEventBus } from "../../infrastructure/ports.js";
import type { AuthService } from "../auth/service.js";
import {
  createRealtimeAuthenticatedMessage,
  createRealtimeErrorMessage,
  createRealtimePongMessage,
  createRealtimeReadyMessage,
  createRealtimeSubscribedMessage,
  parseRealtimeClientMessage,
  serializeRealtimeMessage,
  shouldDeliverProjectRealtimeEvent
} from "./protocol.js";

const DEFAULT_FALLBACK_POLL_INTERVAL_MS = 5_000;

interface RealtimeConnection {
  id: string;
  socket: WebSocket;
  user: AuthUser | null;
  projectId: string | null;
}

export class RealtimeService {
  private readonly socketServer = new WebSocketServer({
    noServer: true
  });

  private readonly connections = new Map<string, RealtimeConnection>();

  constructor(
    private readonly config: RuntimeConfig,
    private readonly authService: AuthService,
    private readonly eventBus: RealtimeEventBus
  ) {
    this.socketServer.on("connection", (socket, request) => {
      this.registerConnection(socket, request);
    });
  }

  async start(): Promise<void> {
    await this.eventBus.subscribe(async (event) => {
      this.broadcastEvent(event);
    });
  }

  async close(): Promise<void> {
    for (const connection of this.connections.values()) {
      connection.socket.close(1001, "server_shutdown");
    }

    this.connections.clear();
    this.socketServer.close();
    await this.eventBus.close();
  }

  handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): boolean {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname !== realtimeRoutes.socket) {
      return false;
    }

    if (
      request.headers.origin &&
      request.headers.origin !== this.config.webOrigin
    ) {
      socket.destroy();
      return true;
    }

    this.socketServer.handleUpgrade(request, socket, head, (websocket) => {
      this.socketServer.emit("connection", websocket, request);
    });

    return true;
  }

  private registerConnection(
    socket: WebSocket,
    request: IncomingMessage
  ): void {
    const connectionId = randomUUID();
    const connection: RealtimeConnection = {
      id: connectionId,
      socket,
      user: null,
      projectId: null
    };

    this.connections.set(connectionId, connection);
    this.send(socket, createRealtimeReadyMessage(connectionId));

    socket.on("message", (raw) => {
      void this.handleMessage(connection, raw).catch((error) => {
        console.error("[api:realtime] socket message handling failed", error);
        this.send(
          socket,
          createRealtimeErrorMessage(
            "realtime_message_failed",
            "The realtime message could not be processed.",
            true
          )
        );
      });
    });
    socket.on("close", () => {
      this.connections.delete(connectionId);
    });
    socket.on("error", (error) => {
      console.error("[api:realtime] socket connection error", {
        connectionId,
        userId: connection.user?.id ?? null,
        projectId: connection.projectId,
        ip: request.socket.remoteAddress ?? "unknown",
        message: error.message
      });
    });
  }

  private async handleMessage(
    connection: RealtimeConnection,
    raw: RawData
  ): Promise<void> {
    let message: RealtimeClientMessage;

    try {
      message = parseRealtimeClientMessage(toRealtimeMessageInput(raw));
    } catch {
      this.send(
        connection.socket,
        createRealtimeErrorMessage(
          "invalid_realtime_message",
          "Realtime messages must be valid JSON and match the expected contract.",
          true
        )
      );
      return;
    }

    switch (message.type) {
      case "authenticate":
        await this.authenticateConnection(connection, message.accessToken, {
          projectId: message.projectId ?? null
        });
        return;
      case "subscribe_project":
        if (!connection.user) {
          this.send(
            connection.socket,
            createRealtimeErrorMessage(
              "realtime_auth_required",
              "Authenticate the realtime session before subscribing to a project.",
              true
            )
          );
          return;
        }

        connection.projectId = message.projectId ?? null;
        this.send(
          connection.socket,
          createRealtimeSubscribedMessage(
            connection.projectId,
            DEFAULT_FALLBACK_POLL_INTERVAL_MS
          )
        );
        return;
      case "ping":
        this.send(connection.socket, createRealtimePongMessage());
        return;
    }
  }

  private async authenticateConnection(
    connection: RealtimeConnection,
    accessToken: string,
    options: {
      projectId: string | null;
    }
  ): Promise<void> {
    try {
      const user = await this.authService.getUserFromAccessToken(accessToken);
      connection.user = user;
      connection.projectId = options.projectId;

      this.send(connection.socket, createRealtimeAuthenticatedMessage(user));
      this.send(
        connection.socket,
        createRealtimeSubscribedMessage(
          connection.projectId,
          DEFAULT_FALLBACK_POLL_INTERVAL_MS
        )
      );
    } catch {
      connection.user = null;
      connection.projectId = null;
      this.send(
        connection.socket,
        createRealtimeErrorMessage(
          "invalid_access_token",
          "The realtime session could not authenticate with the provided access token.",
          true
        )
      );
    }
  }

  private broadcastEvent(event: ProjectRealtimeEvent): void {
    for (const connection of this.connections.values()) {
      if (!connection.user || connection.user.id !== event.userId) {
        continue;
      }

      if (
        !shouldDeliverProjectRealtimeEvent(
          connection.projectId,
          event.projectId
        )
      ) {
        continue;
      }

      const message: RealtimeEventMessage = {
        type: realtimeServerMessages.event,
        event
      };
      this.send(connection.socket, message);
    }
  }

  private send(socket: WebSocket, message: unknown): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(serializeRealtimeMessage(message));
  }
}

function toRealtimeMessageInput(raw: RawData): Buffer | string {
  if (typeof raw === "string" || Buffer.isBuffer(raw)) {
    return raw;
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw);
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw);
  }

  return Buffer.from(raw);
}
