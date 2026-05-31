import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStorage, MAX_UPLOAD_BYTES } from "@/lib/storage";

// 本地存储驱动的「预签名直传」落点：presignPut 在 local 模式下返回 /api/upload/{key}，
// 前端用与 S3 一致的 PUT 直传到这里，由本端点鉴权后落盘。
// 生产用 S3 时前端直传对象存储、不会走到这里（此端点仅开发兜底）。
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  const objectKey = key.join("/");
  const parts = objectKey.split("/");

  // key 形如 submissions/{submissionId}/{uuid}.ext —— 仅草稿作者可上传到自己的作品下。
  if (parts[0] !== "submissions" || !parts[1]) {
    return new Response("Bad Request", { status: 400 });
  }
  const submissionId = parts[1];
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { authorId: true, status: true, deletedAt: true },
  });
  if (!sub || sub.deletedAt || sub.authorId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }
  if (sub.status !== "DRAFT") {
    return new Response("作品已提交，不可修改", { status: 409 });
  }

  const contentType =
    req.headers.get("content-type") || "application/octet-stream";
  const body = Buffer.from(await req.arrayBuffer());
  if (body.byteLength === 0) {
    return new Response("空文件", { status: 400 });
  }
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return new Response("文件超过大小上限", { status: 413 });
  }

  await getStorage().put({ key: objectKey, body, contentType });
  return new Response(null, { status: 204 });
}
