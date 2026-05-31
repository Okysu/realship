"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { isConflicted } from "@/lib/conflict";

export type AnswerActionState = { error?: string; ok?: boolean } | undefined;

// 评委对 AI 核查问题作答（看过材料后；可勾选「材料中无法确认」）。
export async function saveQuestionAnswer(
  _prev: AnswerActionState,
  formData: FormData,
): Promise<AnswerActionState> {
  const judge = await requireRole("JUDGE");
  const questionId = String(formData.get("questionId"));
  const answer = String(formData.get("answer") ?? "").trim();
  const cantConfirm = formData.get("cantConfirm") === "on";

  const question = await prisma.aiReviewQuestion.findUnique({
    where: { id: questionId },
  });
  if (!question) return { error: "问题不存在" };

  const assigned = await prisma.judgeAssignment.findUnique({
    where: {
      judgeId_submissionId: {
        judgeId: judge.id,
        submissionId: question.submissionId,
      },
    },
  });
  if (!assigned) return { error: "未分配此作品" };
  if (await isConflicted(judge.id, question.submissionId)) {
    return { error: "你与此作品存在利益关系，不能评审" };
  }
  if (!cantConfirm && answer.length < 1) {
    return { error: "请作答，或勾选「材料中无法确认」" };
  }

  await prisma.judgeQuestionAnswer.upsert({
    where: { questionId_judgeId: { questionId, judgeId: judge.id } },
    create: {
      questionId,
      judgeId: judge.id,
      submissionId: question.submissionId,
      answer,
      cantConfirm,
    },
    update: { answer, cantConfirm },
  });
  revalidatePath(`/judge/submissions/${question.submissionId}`);
  return { ok: true };
}
