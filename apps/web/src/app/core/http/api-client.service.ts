import { HttpClient, HttpContext, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

import {
  authRoutes,
  projectRoutes
} from "@tip/contracts";
import type {
  AssetKind,
  AssetLifecycleStatus,
  AssetSummary,
  AuthSessionPayload,
  AuthUser,
  CreateProjectInput,
  EnqueueAssetJobInput,
  JobLifecycleStatus,
  JobSummary,
  ProjectAssetCollection,
  ProjectCollection,
  ProjectDetail,
  ProjectJobCollection,
  UpdateProjectInput
} from "@tip/types";

import { FRONTEND_RUNTIME_CONFIG } from "../config/runtime-config";
import { ApiError, ApiErrorPayload } from "./api-error";
import { SKIP_AUTH } from "./http-context";
import { TokenStorageService } from "../auth/token-storage.service";

interface AuthCredentials {
  email: string;
  password: string;
}

type RequestParams = Record<string, string | number | null | undefined>;

interface ProjectListFilters {
  query?: string;
  page?: number;
  pageSize?: number;
}

interface AssetListFilters {
  query?: string;
  page?: number;
  pageSize?: number;
  status?: AssetLifecycleStatus | null;
  kind?: AssetKind | null;
}

interface JobListFilters {
  page?: number;
  pageSize?: number;
  status?: JobLifecycleStatus | null;
}

interface CreateAssetInput {
  kind: AssetKind;
  status?: AssetLifecycleStatus;
  originalFilename: string;
  contentType: string;
  byteSize: number;
}

interface UpdateAssetInput {
  status?: AssetLifecycleStatus;
}

interface BlobDownloadResult {
  blob: Blob;
  contentType: string;
  filename: string | null;
}

@Injectable({
  providedIn: "root"
})
export class ApiClientService {
  private readonly httpClient = inject(HttpClient);
  private readonly runtimeConfig = inject(FRONTEND_RUNTIME_CONFIG);
  private readonly tokenStorage = inject(TokenStorageService);

  readonly auth = {
    register: (payload: AuthCredentials) =>
      this.post<AuthSessionPayload>(authRoutes.register, payload, {
        skipAuth: true
      }),
    login: (payload: AuthCredentials) =>
      this.post<AuthSessionPayload>(authRoutes.login, payload, {
        skipAuth: true
      }),
    refresh: () =>
      this.post<AuthSessionPayload>(authRoutes.refresh, undefined, {
        skipAuth: true
      }),
    logout: () =>
      this.post<{ ok: true }>(authRoutes.logout, undefined, {
        skipAuth: true
      }),
    me: () => this.get<{ user: AuthUser }>(authRoutes.me)
  } as const;

  readonly projects = {
    list: (filters: ProjectListFilters = {}) =>
      this.get<ProjectCollection>(projectRoutes.collection, {
        params: {
          ...filters
        }
      }),
    create: (payload: CreateProjectInput) =>
      this.post<ProjectDetail>(projectRoutes.collection, payload),
    get: (projectId: string) => this.get<ProjectDetail>(this.projectPath(projectId)),
    update: (projectId: string, payload: UpdateProjectInput) =>
      this.patch<ProjectDetail>(this.projectPath(projectId), payload),
    remove: (projectId: string) =>
      this.delete<{ ok: true }>(this.projectPath(projectId))
  } as const;

  readonly assets = {
    listByProject: (projectId: string, filters: AssetListFilters = {}) =>
      this.get<ProjectAssetCollection>(this.projectAssetCollectionPath(projectId), {
        params: {
          ...filters
        }
      }),
    createForProject: (projectId: string, payload: CreateAssetInput) =>
      this.post<AssetSummary>(this.projectAssetCollectionPath(projectId), payload),
    updateForProject: (
      projectId: string,
      assetId: string,
      payload: UpdateAssetInput
    ) =>
      this.patch<AssetSummary>(this.projectAssetPath(projectId, assetId), payload),
    uploadToProject: (
      projectId: string,
      payload: {
        file: File;
        kind: AssetKind;
        onProgress?: (progress: number) => void;
      }
    ) =>
      this.uploadBinary<AssetSummary>(
        `${this.projectAssetCollectionPath(projectId)}/upload`,
        payload.file,
        {
          query: {
            kind: payload.kind,
            filename: payload.file.name
          },
          contentType: payload.file.type || "application/octet-stream",
          ...(payload.onProgress ? { onProgress: payload.onProgress } : {})
        }
      ),
    downloadFromProject: (projectId: string, assetId: string) =>
      this.downloadBlob(this.projectAssetSourcePath(projectId, assetId))
  } as const;

  readonly jobs = {
    listByProject: (projectId: string, filters: JobListFilters = {}) =>
      this.get<ProjectJobCollection>(this.projectJobCollectionPath(projectId), {
        params: {
          ...filters
        }
      }),
    createForAsset: (
      projectId: string,
      assetId: string,
      payload: EnqueueAssetJobInput = {}
    ) =>
      this.post<JobSummary>(this.assetJobCollectionPath(projectId, assetId), payload),
    retryByProject: (projectId: string, jobId: string) =>
      this.post<JobSummary>(this.projectJobRetryPath(projectId, jobId), {}),
    downloadThumbnail: (projectId: string, jobId: string) =>
      this.downloadBlob(this.projectJobThumbnailPath(projectId, jobId))
  } as const;

  private projectPath(projectId: string): string {
    return `${projectRoutes.collection}/${encodeURIComponent(projectId)}`;
  }

  private projectAssetCollectionPath(projectId: string): string {
    return `${this.projectPath(projectId)}/assets`;
  }

  private projectAssetPath(projectId: string, assetId: string): string {
    return `${this.projectAssetCollectionPath(projectId)}/${encodeURIComponent(assetId)}`;
  }

  private projectAssetSourcePath(projectId: string, assetId: string): string {
    return `${this.projectAssetPath(projectId, assetId)}/source`;
  }

  private projectJobCollectionPath(projectId: string): string {
    return `${this.projectPath(projectId)}/jobs`;
  }

  private assetJobCollectionPath(projectId: string, assetId: string): string {
    return `${this.projectAssetPath(projectId, assetId)}/jobs`;
  }

  private projectJobRetryPath(projectId: string, jobId: string): string {
    return `${this.projectJobCollectionPath(projectId)}/${encodeURIComponent(jobId)}/retry`;
  }

  private projectJobThumbnailPath(projectId: string, jobId: string): string {
    return `${this.projectJobCollectionPath(projectId)}/${encodeURIComponent(jobId)}/thumbnail`;
  }

  private async get<TResponse>(
    path: string,
    options?: {
      params?: RequestParams;
      skipAuth?: boolean;
    }
  ): Promise<TResponse> {
    try {
      const response = await firstValueFrom(
        this.httpClient.get<TResponse>(this.resolveUrl(path), {
          withCredentials: true,
          context: new HttpContext().set(SKIP_AUTH, options?.skipAuth === true),
          ...(options?.params ? { params: toHttpParams(options.params) } : {})
        })
      );

      return response;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  }

  private async post<TResponse>(
    path: string,
    body?: unknown,
    options?: {
      params?: RequestParams;
      skipAuth?: boolean;
    }
  ): Promise<TResponse> {
    try {
      const response = await firstValueFrom(
        this.httpClient.post<TResponse>(this.resolveUrl(path), body, {
          withCredentials: true,
          context: new HttpContext().set(SKIP_AUTH, options?.skipAuth === true),
          ...(options?.params ? { params: toHttpParams(options.params) } : {})
        })
      );

      return response;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  }

  private async patch<TResponse>(
    path: string,
    body: unknown
  ): Promise<TResponse> {
    try {
      const response = await firstValueFrom(
        this.httpClient.patch<TResponse>(this.resolveUrl(path), body, {
          withCredentials: true,
          context: new HttpContext().set(SKIP_AUTH, false)
        })
      );

      return response;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  }

  private async delete<TResponse>(path: string): Promise<TResponse> {
    try {
      const response = await firstValueFrom(
        this.httpClient.delete<TResponse>(this.resolveUrl(path), {
          withCredentials: true,
          context: new HttpContext().set(SKIP_AUTH, false)
        })
      );

      return response;
    } catch (error: unknown) {
      throw toApiError(error);
    }
  }

  private async downloadBlob(path: string): Promise<BlobDownloadResult> {
    try {
      const response = await firstValueFrom(
        this.httpClient.get(this.resolveUrl(path), {
          withCredentials: true,
          context: new HttpContext().set(SKIP_AUTH, false),
          observe: "response",
          responseType: "blob"
        })
      );

      return {
        blob: response.body ?? new Blob(),
        contentType:
          response.headers.get("content-type") ?? "application/octet-stream",
        filename: parseContentDispositionFilename(
          response.headers.get("content-disposition")
        )
      };
    } catch (error: unknown) {
      throw toApiError(error);
    }
  }

  private uploadBinary<TResponse>(
    path: string,
    file: File,
    options: {
      query: RequestParams;
      contentType: string;
      onProgress?: (progress: number) => void;
    }
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `${this.resolveUrl(path)}${buildQueryString(options.query)}`
      );
      xhr.withCredentials = true;

      const accessToken = this.tokenStorage.read();

      if (accessToken) {
        xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
      }

      xhr.setRequestHeader("content-type", options.contentType);

      xhr.upload.addEventListener("progress", (event) => {
        if (
          !options.onProgress ||
          !event.lengthComputable ||
          event.total <= 0
        ) {
          return;
        }

        options.onProgress(Math.round((event.loaded / event.total) * 100));
      });

      xhr.addEventListener("load", () => {
        const text = xhr.responseText ?? "";
        const payload =
          text.length > 0 ? (JSON.parse(text) as TResponse | ApiErrorPayload) : null;

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(
            new ApiError(
              xhr.status,
              payload && !Array.isArray(payload) ? (payload as ApiErrorPayload) : null
            )
          );
          return;
        }

        resolve(payload as TResponse);
      });

      xhr.addEventListener("error", () => {
        reject(
          new ApiError(0, {
            error: {
              code: "network_error",
              category: "internal",
              message: "Network error during upload."
            }
          })
        );
      });

      xhr.send(file);
    });
  }

  private resolveUrl(path: string): string {
    return `${this.runtimeConfig.apiBaseUrl}${path}`;
  }
}

function toHttpParams(
  params: RequestParams
): HttpParams {
  let httpParams = new HttpParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    httpParams = httpParams.set(key, String(value));
  }

  return httpParams;
}

function buildQueryString(params: RequestParams): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = header.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] ?? null;
}

function toApiError(error: unknown): ApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "error" in error
  ) {
    const status = Number(error.status);
    const payload =
      typeof error.error === "object" && error.error !== null
        ? (error.error as ApiErrorPayload)
        : null;
    return new ApiError(status, payload);
  }

  return new ApiError(0, {
    error: {
      code: "network_error",
      category: "internal",
      message:
        error instanceof Error ? error.message : "A network error occurred."
    }
  });
}
