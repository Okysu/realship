"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AssetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { getStorage, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/storage";
import { getOpenRegistrationStage } from "@/lib/registration";
import {
  submissionSchema,
  externalLinkSchema,
} from "@/lib/validators/submission";

export type ActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      ok?: boolean;
    }
  | undefined;

// 校验作品归属（作者本人），否则抛错。已软删除的作品一律拒绝写操作。
async function assertOwner(submissionId: string, userId: string) {
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!sub || sub.deletedAt || sub.authorId !== userId) {
    throw new Error("无权操作此作品");
  }
  return sub;
}

// 校验「作者本人 + 作品仍是草稿」：已提交/评审/出分的作品对作者冻结，
// 防止通过直接 POST 篡改已进入评审池的作品（状态机不变量）。
async function assertDraftOwner(submissionId: string, userId: string) {
  const sub = await assertOwner(submissionId, userId);
  if (sub.status !== "DRAFT") {
    throw new Error("作品已提交，不可修改；如需修改请先撤回（报名期内）");
  }
  return sub;
}


// ============ 作品 ============

// 按赛事的 SubmissionField 定义收集并校验动态 content（含 required 检查）。
async function collectContent(
  competitionId: string,
  formData: FormData,
): Promise<
  | { ok: true; content: Record<string, string> }
  | { ok: false; fieldErrors: Record<string, string[]> }
> {
  const fields = await prisma.submissionField.findMany({
    where: { competitionId },
    orderBy: { sortOrder: "asc" },
  });
  const content: Record<string, string> = {};
  const fieldErrors: Record<string, string[]> = {};
  const MAX_FIELD_LEN = 5000;
  for (const f of fields) {
    const v = String(formData.get(`field_${f.key}`) ?? "").trim();
    if (f.required && !v) {
      fieldErrors[`field_${f.key}`] = [`请填写${f.label}`];
    } else if (v.length > MAX_FIELD_LEN) {
      fieldErrors[`field_${f.key}`] = [`${f.label}不超过 ${MAX_FIELD_LEN} 字`];
    }
    content[f.key] = v;
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, content };
}

export async function createSubmission(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const parsed = submissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;

  const track = await prisma.track.findUnique({ where: { id: d.trackId } });
  if (!track) return { error: "赛道不存在" };

  const collected = await collectContent(track.competitionId, formData);
  if (!collected.ok) return { fieldErrors: collected.fieldErrors };

  // 报名窗口校验：报名未开始 / 已截止则拒绝创建作品
  const regStage = await getOpenRegistrationStage(track.competitionId);
  if (!regStage) {
    return { error: "该赛事不在报名期内，无法创建作品" };
  }

  let teamId: string | null = null;
  if (d.teamName) {
    const team = await prisma.team.create({
      data: {
        name: d.teamName,
        leaderId: user.id,
        members: { create: { userId: user.id, role: "LEADER" } },
      },
    });
    teamId = team.id;
  }

  const created = await prisma.submission.create({
    data: {
      title: d.title,
      content: collected.content,
      authorId: user.id,
      teamId,
      trackId: d.trackId,
      stageId: regStage.id,
      status: "DRAFT",
    },
  });
  redirect(`/dashboard/submissions/${created.id}`);
}

export async function updateSubmission(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const submissionId = String(formData.get("id"));
  await assertDraftOwner(submissionId, user.id);
  const parsed = submissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const track = await prisma.track.findUnique({ where: { id: d.trackId } });
  if (!track) return { error: "赛道不存在" };
  const collected = await collectContent(track.competitionId, formData);
  if (!collected.ok) return { fieldErrors: collected.fieldErrors };

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      title: d.title,
      trackId: d.trackId,
      content: collected.content,
    },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  return { ok: true };
}

// 提交：DRAFT → SUBMITTED（报名截止后不可提交——服务端兜底校验）
export async function submitSubmission(formData: FormData) {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  const sub = await assertOwner(submissionId, user.id);
  if (sub.status !== "DRAFT") return;
  const track = await prisma.track.findUnique({
    where: { id: sub.trackId },
    select: { competitionId: true },
  });
  if (!track || !(await getOpenRegistrationStage(track.competitionId))) {
    return; // 报名已截止，拒绝提交（页面也会隐藏提交按钮）
  }
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  revalidatePath("/dashboard");
}

// 撤回：SUBMITTED → DRAFT（重新编辑）。
// 仅限「已提交但尚未进入评审」且报名仍开放时——已被评委审阅/打分的作品不可撤回，
// 否则会让评委已投入的评分凭空消失（状态机兜底，UI 也会隐藏按钮）。
export async function withdrawSubmission(formData: FormData) {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  const sub = await assertOwner(submissionId, user.id);
  if (sub.status !== "SUBMITTED") return;
  const track = await prisma.track.findUnique({
    where: { id: sub.trackId },
    select: { competitionId: true },
  });
  if (!track || !(await getOpenRegistrationStage(track.competitionId))) {
    return; // 报名已截止，作品锁定，不可撤回
  }
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "DRAFT", submittedAt: null },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}

export async function deleteSubmission(formData: FormData) {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  // 仅草稿可由作者删除——已进入评审的作品删除会抹掉评委评分等证据
  await assertDraftOwner(submissionId, user.id);
  // 软删除：置 deletedAt（界面隐藏、可恢复），保留附件对象与记录，不物理抹除。
  await prisma.submission.update({
    where: { id: submissionId },
    data: { deletedAt: new Date() },
  });
  redirect("/dashboard");
}

// ============ 外链 ============

export async function addLink(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  await assertDraftOwner(submissionId, user.id);
  const parsed = externalLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  await prisma.externalLink.create({
    data: {
      submissionId,
      type: d.type,
      url: d.url,
      label: d.label || null,
    },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  return { ok: true };
}

export async function deleteLink(formData: FormData) {
  const user = await requireAuth();
  const id = String(formData.get("id"));
  const submissionId = String(formData.get("submissionId"));
  await assertDraftOwner(submissionId, user.id);
  // 防 IDOR：仅删除确属于该作品的链接（id 与 submissionId 都需匹配）
  await prisma.externalLink.deleteMany({ where: { id, submissionId } });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}

// ============ 加分硬通货声明（参赛者按赛事定义的加分项声明 + 填证据链接） ============

export async function setBonus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  await assertDraftOwner(submissionId, user.id);
  const bonusRuleId = String(formData.get("bonusRuleId"));
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { track: { select: { competitionId: true } } },
  });
  const rule = await prisma.bonusRule.findUnique({ where: { id: bonusRuleId } });
  if (!sub || !rule || rule.competitionId !== sub.track.competitionId) {
    return { error: "无效的加分项" };
  }
  if (rule.requiresUrl && !evidenceUrl) {
    return { error: `「${rule.label}」需提供证据链接` };
  }
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) {
    return { error: "证据链接需以 http:// 或 https:// 开头" };
  }

  await prisma.submissionBonus.upsert({
    where: { submissionId_bonusRuleId: { submissionId, bonusRuleId } },
    create: { submissionId, bonusRuleId, evidenceUrl: evidenceUrl || null },
    update: { evidenceUrl: evidenceUrl || null },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  return { ok: true };
}

export async function removeBonus(formData: FormData) {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  await assertDraftOwner(submissionId, user.id);
  const bonusRuleId = String(formData.get("bonusRuleId"));
  await prisma.submissionBonus.deleteMany({
    where: { submissionId, bonusRuleId },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}

// ============ 附件（预签名直传：浏览器直传 S3，不经服务器中转，≤ 200MB） ============

// 单文件名长度上限（防滥用）。
const MAX_FILENAME_LEN = 200;

export type UploadTicket = {
  assetId: string; // 已登记的 PENDING 附件 id（直传完成后用于 confirm）
  uploadUrl: string; // 浏览器 PUT 直传地址（S3 预签名 / 本地上传端点）
  headers: Record<string, string>; // 直传必须携带的请求头（含 Content-Type）
  storageKey: string;
};

export type TicketState =
  | { error?: string; ticket?: UploadTicket; ok?: boolean }
  | undefined;

// 第一段：申请上传票据。校验归属/大小/类型 → 登记 PENDING 附件 → 返回预签名直传 URL。
// 文件本体由浏览器直传对象存储，绝不经过本服务器（核心：省带宽与内存）。
export async function createUploadTicket(
  _prev: TicketState,
  formData: FormData,
): Promise<TicketState> {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  await assertDraftOwner(submissionId, user.id);

  const fileName = String(formData.get("fileName") ?? "").trim();
  const sizeBytes = Number(formData.get("sizeBytes"));
  const contentType =
    String(formData.get("contentType") ?? "").trim() ||
    "application/octet-stream";

  if (!fileName) return { error: "缺少文件名" };
  if (fileName.length > MAX_FILENAME_LEN) return { error: "文件名过长" };
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { error: "请选择有效文件" };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { error: `文件超过 ${MAX_UPLOAD_MB}MB 上限` };
  }
  const type = (String(formData.get("type") || "OTHER") || "OTHER") as AssetType;

  // 清理本作品下超 1 小时仍未确认的 PENDING 孤儿（用户中途放弃直传遗留）
  await prisma.submissionAsset.deleteMany({
    where: {
      submissionId,
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot) : "";
  const key = `submissions/${submissionId}/${randomUUID()}${ext}`;

  // 先登记 PENDING（占位，记录预期大小）；直传完成后由 confirmUpload 置 READY。
  const asset = await prisma.submissionAsset.create({
    data: {
      submissionId,
      type,
      fileName,
      storageKey: key,
      mimeType: contentType,
      sizeBytes,
      status: "PENDING",
    },
  });

  const { url, headers } = await getStorage().presignPut({
    key,
    contentType,
  });

  return {
    ok: true,
    ticket: { assetId: asset.id, uploadUrl: url, headers, storageKey: key },
  };
}

// 第二段：确认上传完成。HEAD 校验对象确已存在（防伪造登记）→ 用真实大小回填并置 READY。
export async function confirmUpload(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  await assertDraftOwner(submissionId, user.id);
  const assetId = String(formData.get("assetId"));

  const asset = await prisma.submissionAsset.findUnique({
    where: { id: assetId },
  });
  // 防 IDOR：附件必须确属于该作品
  if (!asset || asset.submissionId !== submissionId) {
    return { error: "附件不存在" };
  }

  // HEAD 校验：对象真实存在才算上传成功，否则清掉占位记录
  const meta = await getStorage().head(asset.storageKey);
  if (!meta) {
    await prisma.submissionAsset.delete({ where: { id: assetId } });
    return { error: "上传未完成，请重试" };
  }
  if (meta.sizeBytes > MAX_UPLOAD_BYTES) {
    await getStorage().delete(asset.storageKey);
    await prisma.submissionAsset.delete({ where: { id: assetId } });
    return { error: `文件超过 ${MAX_UPLOAD_MB}MB 上限` };
  }

  await prisma.submissionAsset.update({
    where: { id: assetId },
    data: { status: "READY", sizeBytes: meta.sizeBytes },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  return { ok: true };
}

export async function deleteAsset(formData: FormData) {
  const user = await requireAuth();
  const id = String(formData.get("id"));
  const submissionId = String(formData.get("submissionId"));
  await assertDraftOwner(submissionId, user.id);
  const asset = await prisma.submissionAsset.findUnique({ where: { id } });
  // 防 IDOR：附件必须确属于该作品，才删除对象与记录
  if (asset && asset.submissionId === submissionId) {
    await getStorage().delete(asset.storageKey);
    await prisma.submissionAsset.delete({ where: { id } });
  }
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}
