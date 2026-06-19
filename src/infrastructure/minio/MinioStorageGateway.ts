import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageGateway } from "@/src/domain/ports/StorageGateway";
import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

const BUCKET = "avatars";

const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function getClient(): S3Client {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
    },
    forcePathStyle: true,
  });
}

export class MinioStorageGateway implements StorageGateway {
  async uploadAvatarImage(
    ownerId: string,
    employeeId: EmployeeId,
    file: Blob,
    mimeType: string
  ): Promise<string> {
    const ext = EXT_MAP[mimeType] ?? "bin";
    const key = `${ownerId}/${employeeId.value}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await getClient().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT;
    return `${publicEndpoint}/${BUCKET}/${key}`;
  }
}
