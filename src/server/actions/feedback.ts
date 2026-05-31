"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { notify, emailShell, getAppUrl } from "@/lib/email";

export type FeedbackState = { error?: string; ok?: boolean } | undefined;

// 选手对某位评委的评审发起反馈工单（需是作品作者 + 该评委确有评分/作答）。
export async function openFeedbackThread(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const user = await requireAuth();
  const submissionId = String(formData.get("submissionId"));
  const judgeId = String(formData.get("judgeId"));
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject) return { error: "请填写工单主题" };
  if (!body) return { error: "请填写反馈内容" };

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { authorId: true, deletedAt: true },
  });
  if (!sub || sub.deletedAt || sub.authorId !== user.id) {
    return { error: "无权操作此作品" };
  }

  // 评委必须确实评审过此作品（有分配），否则不允许针对其开工单
  const assigned = await prisma.judgeAssignment.findUnique({
    where: { judgeId_submissionId: { judgeId, submissionId } },
  });
  if (!assigned) return { error: "该评委未参与此作品评审" };

  const exists = await prisma.feedbackThread.findUnique({
    where: { submissionId_judgeId: { submissionId, judgeId } },
  });
  if (exists) return { error: "已对该评委发起过反馈，请在原工单内继续沟通" };

  await prisma.feedbackThread.create({
    data: {
      submissionId,
      judgeId,
      subject,
      messages: { create: { authorId: user.id, body } },
    },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  return { ok: true };
}

// 在工单内追加一条回复（选手作者，或该工单针对的评委本人）。
export async function replyFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const user = await requireAuth();
  const threadId = String(formData.get("threadId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "请填写回复内容" };

  const thread = await prisma.feedbackThread.findUnique({
    where: { id: threadId },
    include: {
      submission: {
        select: { authorId: true, title: true, author: { select: { email: true } } },
      },
      judge: { select: { email: true } },
    },
  });
  if (!thread) return { error: "工单不存在" };
  // 仅作品作者或被指向的评委可发言
  const isAuthor = thread.submission.authorId === user.id;
  const isJudge = thread.judgeId === user.id;
  if (!isAuthor && !isJudge) return { error: "无权回复此工单" };

  await prisma.feedbackMessage.create({
    data: { threadId, authorId: user.id, body },
  });
  await prisma.feedbackThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  // 通知对方有新回复（评委匿名——给选手的通知不暴露评委身份）
  if (isAuthor && thread.judge.email) {
    await notify({
      to: thread.judge.email,
      subject: `选手就「${thread.submission.title}」的评审反馈有新回复`,
      html: emailShell(
        "评审反馈",
        `<p>你评审的作品 <strong>${thread.submission.title}</strong> 收到选手的反馈回复。</p><p><a href="${getAppUrl()}/judge/submissions/${thread.submissionId}" style="color:#16a34a">前往查看并回复</a></p>`,
      ),
    });
  } else if (isJudge && thread.submission.author.email) {
    await notify({
      to: thread.submission.author.email,
      subject: `你对「${thread.submission.title}」的反馈收到评委回复`,
      html: emailShell(
        "评审反馈",
        `<p>评委已回复你就 <strong>${thread.submission.title}</strong> 提出的反馈。</p><p><a href="${getAppUrl()}/dashboard/submissions/${thread.submissionId}" style="color:#16a34a">前往查看</a></p>`,
      ),
    });
  }

  revalidatePath(`/dashboard/submissions/${thread.submissionId}`);
  revalidatePath(`/judge/submissions/${thread.submissionId}`);
  return { ok: true };
}

// 标记工单已解决 / 重新打开（作者或评委均可）。
export async function toggleFeedbackResolved(formData: FormData) {
  const user = await requireAuth();
  const threadId = String(formData.get("threadId"));
  const thread = await prisma.feedbackThread.findUnique({
    where: { id: threadId },
    include: { submission: { select: { authorId: true } } },
  });
  if (!thread) return;
  if (thread.submission.authorId !== user.id && thread.judgeId !== user.id) {
    return;
  }
  await prisma.feedbackThread.update({
    where: { id: threadId },
    data: { resolved: !thread.resolved },
  });
  revalidatePath(`/dashboard/submissions/${thread.submissionId}`);
  revalidatePath(`/judge/submissions/${thread.submissionId}`);
}
