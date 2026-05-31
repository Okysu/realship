import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./types";

// 兼容 Cloudflare R2 / Backblaze B2 / MinIO / AWS S3 等 S3 协议端点。
function client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

const bucket = () => process.env.S3_BUCKET ?? "";

export const s3Provider: StorageProvider = {
  async put({ key, body, contentType }) {
    await client().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },

  async get(key) {
    try {
      const res = await client().send(
        new GetObjectCommand({ Bucket: bucket(), Key: key }),
      );
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return {
        body: Buffer.from(bytes),
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  },

  async delete(key) {
    await client().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
    );
  },
};
