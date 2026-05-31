"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { isConflicted } from "@/lib/conflict";

// 均衡分配：为每件作品分配 N 位评委（round-robin 轮转，负载均衡），
// 排除利益冲突（评委不评自己/同队作品）。可指定赛事范围与每份评委数。
export async function autoAssignJudges(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId") || "");
  const perSubmission = Math.max(
    1,
    Math.min(Number(formData.get("perSubmission")) || 3, 20),
  );

  const judges = await prisma.user.findMany({
    where: { role: "JUDGE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (judges.length === 0) return;

  const submissions = await prisma.submission.findMany({
    where: {
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "SCORED"] },
      ...(competitionId ? { track: { competitionId } } : {}),
    },
    include: {
      assignments: { select: { judgeId: true } },
      team: { select: { members: { select: { userId: true } } } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const n = Math.min(perSubmission, judges.length);
  let cursor = 0; // round-robin 游标，跨作品轮转保证负载均衡
  const toCreate: { judgeId: string; submissionId: string }[] = [];

  for (const sub of submissions) {
    // 该作品的冲突评委：作者本人 + 团队成员
    const conflictIds = new Set<string>([sub.authorId]);
    sub.team?.members.forEach((m) => conflictIds.add(m.userId));

    const eligible = judges.filter((j) => !conflictIds.has(j.id));
    const already = new Set(sub.assignments.map((a) => a.judgeId));
    const need = n - sub.assignments.filter((a) => !conflictIds.has(a.judgeId)).length;
    if (need <= 0) continue;

    let added = 0;
    for (let i = 0; i < eligible.length && added < need; i++) {
      const j = eligible[(cursor + i) % eligible.length];
      if (!already.has(j.id)) {
        toCreate.push({ judgeId: j.id, submissionId: sub.id });
        already.add(j.id);
        added++;
      }
    }
    cursor = (cursor + 1) % Math.max(eligible.length, 1);
  }

  if (toCreate.length > 0) {
    await prisma.judgeAssignment.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "assignment.auto",
    targetType: "Competition",
    targetId: competitionId || undefined,
    detail: { created: toCreate.length, perSubmission: n },
  });
  revalidatePath("/admin/assignments");
}

// 手动切换某评委对某作品的分配（拒绝利益冲突分配）。
export async function toggleAssignment(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const judgeId = String(formData.get("judgeId"));
  const submissionId = String(formData.get("submissionId"));
  const existing = await prisma.judgeAssignment.findUnique({
    where: { judgeId_submissionId: { judgeId, submissionId } },
  });
  if (existing) {
    await prisma.judgeAssignment.delete({ where: { id: existing.id } });
    await audit({
      actorId: admin.id,
      actorEmail: admin.email ?? null,
      action: "assignment.remove",
      targetType: "Submission",
      targetId: submissionId,
      detail: { judgeId },
    });
  } else {
    // 利益冲突的评委不得被分配
    if (await isConflicted(judgeId, submissionId)) {
      return;
    }
    await prisma.judgeAssignment.create({ data: { judgeId, submissionId } });
    await audit({
      actorId: admin.id,
      actorEmail: admin.email ?? null,
      action: "assignment.add",
      targetType: "Submission",
      targetId: submissionId,
      detail: { judgeId },
    });
  }
  revalidatePath("/admin/assignments");
}
