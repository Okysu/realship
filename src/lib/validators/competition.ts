import { z } from "zod";
import { StageType, StageStatus, FieldType } from "@prisma/client";

const optionalText = z.string().optional().or(z.literal(""));

// 赛事基本信息
export const competitionSchema = z.object({
  title: z.string().min(2, { error: "标题至少 2 字" }).max(100),
  slug: z
    .string()
    .min(2, { error: "slug 至少 2 字" })
    .max(60)
    .regex(/^[a-z0-9-]+$/, { error: "slug 仅限小写字母、数字与连字符" }),
  subtitle: z.string().max(150).optional().or(z.literal("")),
  description: z.string().min(1, { error: "请填写赛事规则正文" }),
  manifesto: optionalText,
  startAt: z.string().min(1, { error: "请选择开始时间" }),
  endAt: z.string().min(1, { error: "请选择结束时间" }),
});

// 赛道
export const trackSchema = z.object({
  name: z.string().min(1, { error: "请填写赛道名称" }).max(60),
  description: optionalText,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

// 阶段
export const stageSchema = z.object({
  type: z.enum(StageType),
  name: z.string().min(1, { error: "请填写阶段名称" }).max(60),
  status: z.enum(StageStatus),
  startAt: z.string().min(1, { error: "请选择开始时间" }),
  endAt: z.string().min(1, { error: "请选择结束时间" }),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

// 评分维度
export const criterionSchema = z.object({
  key: z
    .string()
    .min(1, { error: "请填写维度 key" })
    .max(40)
    .regex(/^[a-z0-9_]+$/, { error: "key 仅限小写字母、数字与下划线" }),
  name: z.string().min(1, { error: "请填写维度名称" }).max(60),
  description: optionalText,
  weight: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().int().min(1).max(100),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

// 提交表单字段（动态，赛事级；required/requiresUrl 等 checkbox 在 action 内按 "on" 读取）
export const submissionFieldSchema = z.object({
  key: z
    .string()
    .min(1, { error: "请填写字段 key" })
    .max(40)
    .regex(/^[a-z0-9_]+$/, { error: "key 仅限小写字母、数字与下划线" }),
  label: z.string().min(1, { error: "请填写字段标签" }).max(60),
  type: z.enum(FieldType),
  placeholder: optionalText,
  rows: z.coerce.number().int().min(1).max(20).default(3),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

// 加分硬通货项（动态，赛事级）
export const bonusRuleSchema = z.object({
  key: z
    .string()
    .min(1, { error: "请填写加分项 key" })
    .max(40)
    .regex(/^[a-z0-9_]+$/, { error: "key 仅限小写字母、数字与下划线" }),
  label: z.string().min(1, { error: "请填写加分项名称" }).max(60),
  description: optionalText,
  points: z.coerce.number().int().min(0).max(100),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
