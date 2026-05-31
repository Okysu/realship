"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { isConflicted } from "@/lib/conflict";
import { notify, emailShell } from "@/lib/email";

export type ScoreActionState = { error?: string; ok?: boolean } | undefined;

async function assertAssigned(judgeId: string, submissionId: string) {
  return prisma.judgeAssignment.findUnique({
    where: { judgeId_submissionId: { judgeId, submissionId } },
  });
}

// 保存某维度打分（文字理由必填）。
export async function saveScore(
  _prev: ScoreActionState,
  formData: FormData,
): Promise<ScoreActionState> {
  const judge = await requireRole("JUDGE");
  const submissionId = String(formData.get("submissionId"));
  const criterionId = String(formData.get("criterionId"));
  const score = Number(formData.get("score"));
  const rationale = String(formData.get("rationale") ?? "").trim();

  if (!(await assertAssigned(judge.id, submissionId))) {
    return { error: "未分配此作品" };
  }
  // 兜底：利益冲突（评委评到自己/同队作品）一律拒绝
  if (await isConflicted(judge.id, submissionId)) {
    return { error: "你与此作品存在利益关系，不能评审" };
  }
  const criterion = await prisma.criterion.findUnique({
    where: { id: criterionId },
  });
  if (!criterion) return { error: "维度不存在" };
  if (Number.isNaN(score) || score < 0 || score > criterion.maxScore) {
    return { error: `分数需在 0 ~ ${criterion.maxScore} 之间` };
  }
  if (rationale.length < 1) return { error: "请填写评分理由" };

  await prisma.judgeScore.upsert({
    where: {
      judgeId_submissionId_criterionId: {
        judgeId: judge.id,
        submissionId,
        criterionId,
      },
    },
    create: { judgeId: judge.id, submissionId, criterionId, score, rationale },
    update: { score, rationale },
  });
  revalidatePath(`/judge/submissions/${submissionId}`);
  return { ok: true };
}

// 保存兜底备注（记录维度之外的其他情况）。
export async function saveReviewNote(
  _prev: ScoreActionState,
  formData: FormData,
): Promise<ScoreActionState> {
  const judge = await requireRole("JUDGE");
  const submissionId = String(formData.get("submissionId"));
  const note = String(formData.get("note") ?? "").trim();
  if (!(await assertAssigned(judge.id, submissionId))) {
    return { error: "未分配此作品" };
  }
  await prisma.judgeReviewNote.upsert({
    where: {
      judgeId_submissionId: { judgeId: judge.id, submissionId },
    },
    create: { judgeId: judge.id, submissionId, note },
    update: { note },
  });
  revalidatePath(`/judge/submissions/${submissionId}`);
  return { ok: true };
}

// 提交评审（定稿）：要求该评委已对所有维度打分，标记 assignment.completedAt，
// 并通知作者「作品已被一位评委完成评审」。定稿后展示锁定，可「撤回以修改」。
export async function finalizeReview(formData: FormData) {
  const judge = await requireRole("JUDGE");
  const submissionId = String(formData.get("submissionId"));
  const assignment = await assertAssigned(judge.id, submissionId);
  if (!assignment) return;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      track: { include: { _count: { select: { criteria: true } } } },
      author: { select: { email: true } },
    },
  });
  if (!submission || submission.deletedAt) return;

  // 校验所有维度均已打分，否则不允许定稿
  const scored = await prisma.judgeScore.count({
    where: { judgeId: judge.id, submissionId },
  });
  if (scored < submission.track._count.criteria) return;

  await prisma.judgeAssignment.update({
    where: { id: assignment.id },
    data: { completedAt: new Date() },
  });

  if (submission.author.email) {
    await notify({
      to: submission.author.email,
      subject: `你的作品「${submission.title}」已被一位评委完成评审`,
      html: emailShell(
        "评审进展",
        `<p>你的作品 <strong>${submission.title}</strong> 已有一位评委完成评审。</p><p style="color:#64748b">评分与评语将在赛事「公布结果」后揭晓——届时可在展示墙查看。</p>`,
      ),
    });
  }
  revalidatePath(`/judge/submissions/${submissionId}`);
  revalidatePath("/judge");
}

// 撤回定稿，重新修改评审。
export async function reopenReview(formData: FormData) {
  const judge = await requireRole("JUDGE");
  const submissionId = String(formData.get("submissionId"));
  const assignment = await assertAssigned(judge.id, submissionId);
  if (!assignment) return;
  await prisma.judgeAssignment.update({
    where: { id: assignment.id },
    data: { completedAt: null },
  });
  revalidatePath(`/judge/submissions/${submissionId}`);
  revalidatePath("/judge");
}
