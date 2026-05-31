"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import {
  competitionSchema,
  trackSchema,
  stageSchema,
  criterionSchema,
  submissionFieldSchema,
  bonusRuleSchema,
} from "@/lib/validators/competition";

export type ActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      ok?: boolean;
    }
  | undefined;

// ============ 赛事 ============

export async function createCompetition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = competitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;

  if (await prisma.competition.findUnique({ where: { slug: d.slug } })) {
    return { error: "该 slug 已被使用" };
  }

  const created = await prisma.competition.create({
    data: {
      title: d.title,
      slug: d.slug,
      subtitle: d.subtitle || null,
      description: d.description,
      manifesto: d.manifesto || null,
      startAt: new Date(d.startAt),
      endAt: new Date(d.endAt),
    },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "competition.create",
    targetType: "Competition",
    targetId: created.id,
    detail: { title: d.title, slug: d.slug },
  });
  redirect(`/admin/competitions/${created.id}`);
}

export async function updateCompetition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const parsed = competitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;

  const existing = await prisma.competition.findUnique({
    where: { slug: d.slug },
  });
  if (existing && existing.id !== id) return { error: "该 slug 已被使用" };

  await prisma.competition.update({
    where: { id },
    data: {
      title: d.title,
      slug: d.slug,
      subtitle: d.subtitle || null,
      description: d.description,
      manifesto: d.manifesto || null,
      startAt: new Date(d.startAt),
      endAt: new Date(d.endAt),
    },
  });
  revalidatePath(`/admin/competitions/${id}`);
  return { ok: true };
}

export async function toggleCompetitionPublish(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const comp = await prisma.competition.findUnique({ where: { id } });
  if (!comp) return;
  await prisma.competition.update({
    where: { id },
    data: { isPublished: !comp.isPublished },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: comp.isPublished ? "competition.unpublish" : "competition.publish",
    targetType: "Competition",
    targetId: id,
    detail: { title: comp.title },
  });
  revalidatePath(`/admin/competitions/${id}`);
  revalidatePath("/admin");
}

export async function deleteCompetition(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const comp = await prisma.competition.findUnique({
    where: { id },
    select: { title: true },
  });
  await prisma.competition.delete({ where: { id } });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "competition.delete",
    targetType: "Competition",
    targetId: id,
    detail: { title: comp?.title },
  });
  redirect("/admin");
}

// ============ 赛道 ============

export async function addTrack(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));
  const parsed = trackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  await prisma.track.create({
    data: {
      competitionId,
      name: d.name,
      description: d.description || null,
      sortOrder: d.sortOrder,
    },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function deleteTrack(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  // 防越权/误删：仅删除确属于该赛事的赛道
  await prisma.track.deleteMany({ where: { id, competitionId } });
  revalidatePath(`/admin/competitions/${competitionId}`);
}

// ============ 阶段 ============

export async function addStage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));
  const parsed = stageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  await prisma.stage.create({
    data: {
      competitionId,
      type: d.type,
      name: d.name,
      status: d.status,
      startAt: new Date(d.startAt),
      endAt: new Date(d.endAt),
      sortOrder: d.sortOrder,
    },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function deleteStage(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  await prisma.stage.deleteMany({ where: { id, competitionId } });
  revalidatePath(`/admin/competitions/${competitionId}`);
}

// ============ 评分维度 ============

export async function addCriterion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const trackId = String(formData.get("trackId"));
  const competitionId = String(formData.get("competitionId"));
  const parsed = criterionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const favorsRunnable = formData.get("favorsRunnable") === "on";

  const dup = await prisma.criterion.findUnique({
    where: { trackId_key: { trackId, key: d.key } },
  });
  if (dup) return { error: "该 key 在此赛道已存在" };

  const created = await prisma.criterion.create({
    data: {
      trackId,
      key: d.key,
      name: d.name,
      description: d.description || null,
      weight: d.weight,
      maxScore: d.maxScore,
      sortOrder: d.sortOrder,
      favorsRunnable,
    },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "criterion.create",
    targetType: "Criterion",
    targetId: created.id,
    detail: { name: d.name, weight: d.weight, maxScore: d.maxScore },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function deleteCriterion(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  // criterion 经 track 关联到赛事，删除前校验归属
  await prisma.criterion.deleteMany({
    where: { id, track: { competitionId } },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "criterion.delete",
    targetType: "Criterion",
    targetId: id,
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
}

// ============ 用户与角色 ============

// 调整用户角色：评委席位由管理员审核分配——评审权受控、不自由领取，
// 这正是平台反「直邀」的姿势（同时避免自由注册刷评委）。
export async function setUserRole(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const userId = String(formData.get("userId"));
  const parsed = z.enum(UserRole).safeParse(formData.get("role"));
  if (!parsed.success) return;
  // 防止管理员误把自己降级而锁死后台
  if (userId === admin.id) return;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!target) return;
  await prisma.user.update({
    where: { id: userId },
    data: { role: parsed.data },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "user.role_change",
    targetType: "User",
    targetId: userId,
    detail: { email: target.email, from: target.role, to: parsed.data },
  });
  revalidatePath("/admin/users");
}

// ============ 提交表单字段（赛事级动态） ============

export async function addSubmissionField(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));
  const parsed = submissionFieldSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const dup = await prisma.submissionField.findUnique({
    where: { competitionId_key: { competitionId, key: d.key } },
  });
  if (dup) return { error: "该 key 在此赛事已存在" };

  const created = await prisma.submissionField.create({
    data: {
      competitionId,
      key: d.key,
      label: d.label,
      type: d.type,
      placeholder: d.placeholder || null,
      required: formData.get("required") === "on",
      rows: d.rows,
      sortOrder: d.sortOrder,
    },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "field.create",
    targetType: "SubmissionField",
    targetId: created.id,
    detail: { key: d.key, label: d.label },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function deleteSubmissionField(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  await prisma.submissionField.deleteMany({ where: { id, competitionId } });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "field.delete",
    targetType: "SubmissionField",
    targetId: id,
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
}

// ============ 加分硬通货项（赛事级动态） ============

export async function addBonusRule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const competitionId = String(formData.get("competitionId"));
  const parsed = bonusRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const dup = await prisma.bonusRule.findUnique({
    where: { competitionId_key: { competitionId, key: d.key } },
  });
  if (dup) return { error: "该 key 在此赛事已存在" };

  const created = await prisma.bonusRule.create({
    data: {
      competitionId,
      key: d.key,
      label: d.label,
      description: d.description || null,
      points: d.points,
      requiresUrl: formData.get("requiresUrl") === "on",
      sortOrder: d.sortOrder,
    },
  });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "bonus_rule.create",
    targetType: "BonusRule",
    targetId: created.id,
    detail: { key: d.key, label: d.label, points: d.points },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function deleteBonusRule(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  await prisma.bonusRule.deleteMany({ where: { id, competitionId } });
  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "bonus_rule.delete",
    targetType: "BonusRule",
    targetId: id,
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
}

// ============ 配置编辑（key 不可改，仅改属性，避免删了重建抹掉关联数据）============

export async function updateTrack(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  const parsed = trackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  await prisma.track.updateMany({
    where: { id, competitionId },
    data: { name: d.name, description: d.description || null, sortOrder: d.sortOrder },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function updateStage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  const parsed = stageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  await prisma.stage.updateMany({
    where: { id, competitionId },
    data: {
      type: d.type,
      name: d.name,
      status: d.status,
      startAt: new Date(d.startAt),
      endAt: new Date(d.endAt),
      sortOrder: d.sortOrder,
    },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function updateCriterion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  const parsed = criterionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const favorsRunnable = formData.get("favorsRunnable") === "on";
  // key 不改（作为评分关联标识）；仅改属性，不抹掉已有 JudgeScore
  await prisma.criterion.updateMany({
    where: { id, track: { competitionId } },
    data: {
      name: d.name,
      description: d.description || null,
      weight: d.weight,
      maxScore: d.maxScore,
      sortOrder: d.sortOrder,
      favorsRunnable,
    },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function updateSubmissionField(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  const parsed = submissionFieldSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  // key 不改（作为 Submission.content 的键）
  await prisma.submissionField.updateMany({
    where: { id, competitionId },
    data: {
      label: d.label,
      type: d.type,
      placeholder: d.placeholder || null,
      required: formData.get("required") === "on",
      rows: d.rows,
      sortOrder: d.sortOrder,
    },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

export async function updateBonusRule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const competitionId = String(formData.get("competitionId"));
  const parsed = bonusRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  await prisma.bonusRule.updateMany({
    where: { id, competitionId },
    data: {
      label: d.label,
      description: d.description || null,
      points: d.points,
      requiresUrl: formData.get("requiresUrl") === "on",
      sortOrder: d.sortOrder,
    },
  });
  revalidatePath(`/admin/competitions/${competitionId}`);
  return { ok: true };
}

// ============ 评委评审管理 ============

// 撤销某评委对某作品的评审：删除其评分 / 备注 / AI 作答，评委可重新评审。
// 用于「评委评判错了」的补救——管理员介入清除，全程审计留痕。
export async function resetJudgeReview(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const submissionId = String(formData.get("submissionId"));
  const judgeId = String(formData.get("judgeId"));

  const judge = await prisma.user.findUnique({
    where: { id: judgeId },
    select: { email: true, name: true },
  });

  // 顺序删除（不用 interactive transaction——兼容 Neon pgbouncer）
  const scores = await prisma.judgeScore.deleteMany({
    where: { judgeId, submissionId },
  });
  const notes = await prisma.judgeReviewNote.deleteMany({
    where: { judgeId, submissionId },
  });
  const answers = await prisma.judgeQuestionAnswer.deleteMany({
    where: { judgeId, submissionId },
  });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "review.reset",
    targetType: "Submission",
    targetId: submissionId,
    detail: {
      judge: judge?.email ?? judgeId,
      scores: scores.count,
      notes: notes.count,
      answers: answers.count,
    },
  });
  revalidatePath(`/admin/submissions/${submissionId}`);
}
