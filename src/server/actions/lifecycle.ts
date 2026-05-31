"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { computeRanking } from "@/lib/scoring/ranking";

// 生命周期操作统一返回态：成功消息供前端提示（解决「点了没反应」）。
export type LifecycleState = { ok?: boolean; message?: string } | undefined;

// 公布结果：快照当前排名→落库 finalRank（名次定格、不再随实时计算漂移），
// 已评作品置 SCORED，赛事 resultsPublished=true（公开页据此揭晓分数/名次/评语）。
export async function publishResults(
  _prev: LifecycleState,
  formData: FormData,
): Promise<LifecycleState> {
  const admin = await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));

  // 全量排名（不限量）用于定格名次
  const { items } = await computeRanking(competitionId, Number.MAX_SAFE_INTEGER);
  // 顺序写入名次（不用 interactive transaction，兼容 Neon pgbouncer）
  for (let i = 0; i < items.length; i++) {
    await prisma.submission.update({
      where: { id: items[i].id },
      data: { finalRank: i + 1 },
    });
  }
  // 有评分的作品标记为已出分
  await prisma.submission.updateMany({
    where: {
      track: { competitionId },
      status: "UNDER_REVIEW",
      judgeScores: { some: {} },
    },
    data: { status: "SCORED", scoredAt: new Date() },
  });
  await prisma.competition.update({
    where: { id: competitionId },
    data: { resultsPublished: true, resultsPublishedAt: new Date() },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "results.publish",
    targetType: "Competition",
    targetId: competitionId,
    detail: { ranked: items.length },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/ranking");
  return {
    ok: true,
    message: `已公布结果：定格 ${items.length} 件作品名次，公众现可查看分数与评语。`,
  };
}

// 撤回公布（如需修正后重新公布）。
export async function unpublishResults(
  _prev: LifecycleState,
  formData: FormData,
): Promise<LifecycleState> {
  const admin = await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));
  await prisma.competition.update({
    where: { id: competitionId },
    data: { resultsPublished: false, resultsPublishedAt: null },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "results.unpublish",
    targetType: "Competition",
    targetId: competitionId,
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/ranking");
  return { ok: true, message: "已撤回公布：分数与名次重新对公众隐藏。" };
}

// 人工指定 / 清除获奖标记（如「一等奖」「最佳人气」；专家组可干预）。
export async function setAward(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const submissionId = String(formData.get("submissionId"));
  const awardLabel = String(formData.get("awardLabel") ?? "").trim();
  await prisma.submission.update({
    where: { id: submissionId },
    data: { awardLabel: awardLabel || null },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "submission.award",
    targetType: "Submission",
    targetId: submissionId,
    detail: { awardLabel: awardLabel || "(清除)" },
  });
  revalidatePath(`/admin/submissions/${submissionId}`);
}

// 晋级：把当前排名前 N 的作品移到目标阶段（如初赛前 20 进复赛）。
export async function promoteByRank(
  _prev: LifecycleState,
  formData: FormData,
): Promise<LifecycleState> {
  const admin = await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));
  const stageId = String(formData.get("stageId"));
  const topN = Math.max(1, Number(formData.get("topN")) || 10);

  // 校验目标阶段属于该赛事
  const stage = await prisma.stage.findFirst({
    where: { id: stageId, competitionId },
    select: { id: true, name: true },
  });
  if (!stage) return { message: "目标阶段不存在" };

  const { items } = await computeRanking(competitionId, topN);
  const ids = items.map((i) => i.id);
  if (ids.length > 0) {
    await prisma.submission.updateMany({
      where: { id: { in: ids } },
      data: { stageId },
    });
  }
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "submission.promote",
    targetType: "Stage",
    targetId: stageId,
    detail: { stage: stage.name, promoted: ids.length, topN },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/submissions");
  return {
    ok: true,
    message:
      ids.length > 0
        ? `已将排名前 ${ids.length} 的作品晋级到「${stage.name}」。`
        : `没有可晋级的作品（该赛事暂无进入排名的作品）。`,
  };
}
