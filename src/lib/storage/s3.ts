import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  },

  // 预签名 PUT：浏览器据此直传对象存储，文件不经过 Next 服务器（省带宽 + 内存）。
  async presignPut({ key, contentType, expiresIn = 600 }) {
    const url = await getSignedUrl(
      client(),
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
    // 直传时必须带与签名一致的 Content-Type，否则签名校验失败。
    return { url, headers: { "Content-Type": contentType } };
  },

  // HEAD 校验对象真实存在并取大小——confirm 阶段据此防止伪造登记（未真传却标 READY）。
  async head(key) {
    try {
      const res = await client().send(
        new HeadObjectCommand({ Bucket: bucket(), Key: key }),
      );
      return {
        sizeBytes: Number(res.ContentLength ?? 0),
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  },

  // 预签名 GET：返回对象存储直连下载链接，下载也不经服务器中转（省流量）。
  async presignGet(key, expiresIn = 300) {
    return getSignedUrl(
      client(),
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
      { expiresIn },
    );
  },
};
