import type { Prisma } from "@prisma/client";

// Submission.content 是 Prisma Json 字段（{ fieldKey: value }，字段定义见 Competition.fields）。
// Prisma 把 Json 读出为 JsonValue，需在边界处做一次类型收敛——集中到此 helper，
// 避免 `as Record<string, string>` 散落各页（也便于将来加校验/默认值）。
export function parseSubmissionContent(
  content: Prisma.JsonValue | null | undefined,
): Record<string, string> {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(content)) {
    // 字段值统一规整为字符串（数据库里本就以字符串写入；防御异常类型）
    result[k] = v == null ? "" : String(v);
  }
  return result;
}
