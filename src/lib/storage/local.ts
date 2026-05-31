import { promises as fs } from "fs";
import path from "path";
import type { StorageProvider } from "./types";

// 受保护的本地上传目录（不在 public，经 /files/[...key] 鉴权下载）。
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// 本地文件系统没有对象元数据，单独用 .meta 旁路文件保存 contentType。
const META_SUFFIX = ".meta";

// 防止 key 路径穿越（../）。
function resolveKey(key: string): string {
  const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(UPLOAD_DIR, safe);
  if (!full.startsWith(UPLOAD_DIR)) {
    throw new Error("非法的存储 key");
  }
  return full;
}

export const localProvider: StorageProvider = {
  async put({ key, body, contentType }) {
    const full = resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    await fs.writeFile(full + META_SUFFIX, contentType, "utf8");
  },

  async get(key) {
    try {
      const full = resolveKey(key);
      const body = await fs.readFile(full);
      let contentType = "application/octet-stream";
      try {
        contentType = await fs.readFile(full + META_SUFFIX, "utf8");
      } catch {
        // 缺少元数据则用默认类型
      }
      return { body, contentType };
    } catch {
      return null;
    }
  },

  async delete(key) {
    const full = resolveKey(key);
    await fs.rm(full, { force: true });
    await fs.rm(full + META_SUFFIX, { force: true });
  },
};
