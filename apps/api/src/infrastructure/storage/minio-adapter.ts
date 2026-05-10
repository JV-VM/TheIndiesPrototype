import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";

import type { DependencyReport, StorageAdapter } from "../ports.js";

export class MinioStorageAdapter implements StorageAdapter {
  constructor(
    private readonly endpoint: string,
    private readonly region: string,
    private readonly accessKey: string,
    private readonly secretKey: string,
    private readonly bucket: string
  ) {}

  async checkHealth(): Promise<DependencyReport> {
    const startedAt = performance.now();
    const client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey
      }
    });

    try {
      const response = await client.send(new ListBucketsCommand({}));
      const bucketExists = (response.Buckets ?? []).some(
        (bucket) => bucket.Name === this.bucket
      );

      return {
        name: "minio",
        status: bucketExists ? "healthy" : "unhealthy",
        latencyMs: Math.round(performance.now() - startedAt),
        details: bucketExists
          ? `Bucket "${this.bucket}" is reachable.`
          : `Bucket "${this.bucket}" was not found.`
      };
    } catch (error: unknown) {
      return {
        name: "minio",
        status: "unhealthy",
        latencyMs: Math.round(performance.now() - startedAt),
        details:
          error instanceof Error ? error.message : "Unknown MinIO failure."
      };
    }
  }
}
