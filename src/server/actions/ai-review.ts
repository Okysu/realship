"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { isAiEnabled } from "@/lib/ai/config";
import { runAiReview } from "@/lib/ai/review";
import { isConflicted } from "@/lib/conflict";

export type AiActionState = { error?: string; ok?: boolean } | undefined;

// 触发对作品的 AI 提问式审查（评委或管理员；需 AI 已配置）。
export async function triggerAiReview(
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const user = await requireRole("JUDGE", "ADMIN");
  if (!isAiEnabled()) {
    return { error: "AI 审查未启用（未配置端点）" };
  }
  const submissionId = String(formData.get("submissionId"));

  // 评委需被分配该作品且无利益冲突；管理员不限。
  if (user.role === "JUDGE") {
    const assigned = await prisma.judgeAssignment.findUnique({
      where: {
        judgeId_submissionId: { judgeId: user.id, submissionId },
      },
    });
    if (!assigned) return { error: "未分配此作品" };
    if (await isConflicted(user.id, submissionId)) {
      return { error: "你与此作品存在利益关系，不能评审" };
    }
  }

  try {
    await runAiReview(submissionId);
  } catch (e) {
    return {
      error:
        "AI 生成失败：" + (e instanceof Error ? e.message : "未知错误"),
    };
  }
  revalidatePath(`/judge/submissions/${submissionId}`);
  return { ok: true };
}
