import { prisma } from "@/lib/prisma";

// 利益冲突判定：评委不得评审「自己提交的」或「自己所在团队的」作品。
// 返回与某评委存在冲突的作品 id 集合（用于分配排除 / 列表过滤）。
export async function getConflictSubmissionIds(
  judgeId: string,
): Promise<Set<string>> {
  const subs = await prisma.submission.findMany({
    where: {
      deletedAt: null,
      OR: [
        { authorId: judgeId },
        { team: { members: { some: { userId: judgeId } } } },
      ],
    },
    select: { id: true },
  });
  return new Set(subs.map((s) => s.id));
}

// 单作品冲突判定（服务端兜底用）：该评委是否与此作品利益相关。
export async function isConflicted(
  judgeId: string,
  submissionId: string,
): Promise<boolean> {
  const sub = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      OR: [
        { authorId: judgeId },
        { team: { members: { some: { userId: judgeId } } } },
      ],
    },
    select: { id: true },
  });
  return !!sub;
}
