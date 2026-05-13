import {
  CreateBucketCommand,
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import type {
  DependencyReport,
  PutStorageObjectInput,
  StorageAdapter,
  StoredObject
} from "../ports.js";

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

      if (!bucketExists) {
        await createBucketIfMissing(client, this.bucket);
      }

      return {
        name: "minio",
        status: "healthy",
        latencyMs: Math.round(performance.now() - startedAt),
        details: bucketExists
          ? `Bucket "${this.bucket}" is reachable.`
          : `Bucket "${this.bucket}" was created.`
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

  async putObject(input: PutStorageObjectInput): Promise<void> {
    const client = this.createClient();

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata
      })
    );
  }

  async getObject(objectKey: string): Promise<StoredObject> {
    const client = this.createClient();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey
      })
    );

    if (!response.Body) {
      throw new Error(`MinIO object "${objectKey}" returned no body.`);
    }

    const body = Buffer.from(await response.Body.transformToByteArray());

    return {
      objectKey,
      body,
      contentType: response.ContentType ?? "application/octet-stream",
      byteSize: body.byteLength,
      etag: response.ETag ?? null
    };
  }

  private createClient(): S3Client {
    return new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey
      }
    });
  }
}

async function createBucketIfMissing(
  client: S3Client,
  bucket: string
): Promise<void> {
  try {
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket
      })
    );
  } catch (error) {
    if (isBucketAlreadyAvailable(error)) {
      return;
    }

    throw error;
  }
}

function isBucketAlreadyAvailable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return ["BucketAlreadyExists", "BucketAlreadyOwnedByYou"].includes(
    error.name
  );
}
