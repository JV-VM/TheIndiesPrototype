import {
  CreateBucketCommand,
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

export interface StoredSourceObject {
  objectKey: string;
  body: Buffer;
  contentType: string;
}

export interface PutStoredObjectInput {
  objectKey: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface WorkerDependencyReport {
  name: string;
  status: "healthy" | "unhealthy";
  latencyMs: number;
  details: string;
}

export class WorkerMinioClient {
  private readonly client: S3Client;

  constructor(
    private readonly endpoint: string,
    private readonly region: string,
    private readonly accessKey: string,
    private readonly secretKey: string,
    private readonly bucket: string
  ) {
    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey
      }
    });
  }

  async getObject(objectKey: string): Promise<StoredSourceObject> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey
      })
    );

    if (!response.Body) {
      throw new Error(`Stored object "${objectKey}" returned no body.`);
    }

    return {
      objectKey,
      body: Buffer.from(await response.Body.transformToByteArray()),
      contentType: response.ContentType ?? "application/octet-stream"
    };
  }

  async putObject(input: PutStoredObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata
      })
    );
  }

  async checkHealth(): Promise<WorkerDependencyReport> {
    const startedAt = performance.now();

    try {
      const response = await this.client.send(new ListBucketsCommand({}));
      const bucketExists = (response.Buckets ?? []).some(
        (bucket) => bucket.Name === this.bucket
      );

      if (!bucketExists) {
        await createBucketIfMissing(this.client, this.bucket);
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
