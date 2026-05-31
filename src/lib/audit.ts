import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// 记录一条审计日志（best-effort：失败不阻断主操作）。
// 仅用于敏感管理操作——角色变更、赛事/字段/加分项增删等。
export async function audit(input: {
  actorId: string;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Prisma.InputJsonValue;
}) {
  // 取 IP 与写库分开兜底：headers() 不可用时仅丢失 IP，绝不影响审计落库。
  let ip: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
  } catch {
    // 忽略：仅记不到 IP
  }
  const data = {
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    detail: input.detail,
    ip,
  };
  try {
    await prisma.auditLog.create({
      data: { ...data, actorId: input.actorId },
    });
  } catch {
    // actorId 可能失效（如会话过期、用户已删）触发外键约束——
    // 降级为不关联 actor，仍以 actorEmail 留痕，确保审计永不因关联问题丢失。
    try {
      await prisma.auditLog.create({ data });
    } catch {
      // 最终仍失败则放弃，不阻断主流程
    }
  }
}
