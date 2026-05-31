import type { StorageProvider } from "./types";
import { localProvider } from "./local";
import { s3Provider } from "./s3";

// 按 STORAGE_DRIVER 返回实现；默认 local（开发零配置），生产设为 s3。
export function getStorage(): StorageProvider {
  return process.env.STORAGE_DRIVER === "s3" ? s3Provider : localProvider;
}

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 200;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export type { StorageProvider } from "./types";
