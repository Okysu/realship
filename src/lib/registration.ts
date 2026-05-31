import { prisma } from "@/lib/prisma";
import { isStageOpen } from "@/lib/stage";

// 报名阶段是否开放：必须存在 REGISTRATION 阶段且当前在其时间窗内。
// 报名截止后返回 null —— 不能再创建 / 提交作品。
export async function getOpenRegistrationStage(competitionId: string) {
  const stage = await prisma.stage.findFirst({
    where: { competitionId, type: "REGISTRATION" },
    orderBy: { sortOrder: "asc" },
  });
  if (!stage || !isStageOpen(stage)) return null;
  return stage;
}

export async function isRegistrationOpen(
  competitionId: string,
): Promise<boolean> {
  return (await getOpenRegistrationStage(competitionId)) !== null;
}

// 列出当前【已发布且开放报名】的赛事（用于「提交作品先选赛事」）。
export async function getOpenCompetitions() {
  const comps = await prisma.competition.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      stages: { where: { type: "REGISTRATION" } },
      fields: { orderBy: { sortOrder: "asc" } },
      tracks: { orderBy: { sortOrder: "asc" } },
    },
  });
  return comps.filter((c) => c.stages.some((s) => isStageOpen(s)));
}
