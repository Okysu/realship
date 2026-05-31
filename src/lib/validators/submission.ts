import { z } from "zod";
import { ExternalLinkType, AssetType } from "@prisma/client";

// 作品基础信息（动态字段值 content 在 action 内按赛事的 SubmissionField 逐项校验）
export const submissionSchema = z.object({
  title: z.string().min(2, { error: "标题至少 2 字" }).max(100),
  trackId: z.string().min(1, { error: "请选择赛道" }),
  // 填写则按团队参赛（创建团队，本人为队长）
  teamName: z.string().max(60).optional().or(z.literal("")),
});

// 外链（视频 / 仓库 / 应用市场 / 邀测 / 主页）
export const externalLinkSchema = z.object({
  type: z.enum(ExternalLinkType),
  url: z.url({ error: "请输入有效的链接（含 http/https）" }),
  label: z.string().max(60).optional().or(z.literal("")),
});

// 附件类型（上传表单用）
export const assetTypeSchema = z.enum(AssetType);
