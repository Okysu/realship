import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

// 受保护的附件下载：仅作品作者 / 被分配的评委 / 管理员可下载，附件不暴露公开直链。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  const objectKey = key.join("/");

  // 附件 key 形如 submissions/{submissionId}/{uuid}.ext —— 按归属做权限校验，防越权下载他人附件。
  const parts = objectKey.split("/");
  if (parts[0] === "submissions" && parts[1]) {
    const submissionId = parts[1];
    const sub = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        authorId: true,
        team: { select: { members: { select: { userId: true } } } },
      },
    });
    const userId = session.user.id;
    const role = session.user.role;
    const isAuthor = !!sub && sub.authorId === userId;
    const isTeamMember = !!sub?.team?.members.some((m) => m.userId === userId);
    const isAdmin = role === "ADMIN";
    const isAssignedJudge =
      role === "JUDGE" &&
      !!(await prisma.judgeAssignment.findUnique({
        where: { judgeId_submissionId: { judgeId: userId, submissionId } },
      }));
    if (!isAuthor && !isTeamMember && !isAdmin && !isAssignedJudge) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // S3 等对象存储：鉴权通过后直接 302 到预签名下载链接，文件由客户端从对象存储直取，
  // 不经服务器中转（省下载带宽）。本地驱动返回 null，回退服务器读取。
  const presignedUrl = await getStorage().presignGet(objectKey);
  if (presignedUrl) {
    return Response.redirect(presignedUrl, 302);
  }

  const obj = await getStorage().get(objectKey);
  if (!obj) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(new Uint8Array(obj.body), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
