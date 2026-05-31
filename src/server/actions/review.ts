"use server";

import { headers } from "next/headers";
import type { MaterialKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

// 单次心跳最多累加的秒数——服务端上限，防止伪造超长审阅时长。
const HEARTBEAT_MAX_INCREMENT = 25;
// 复用近期未结束会话的时间窗（分钟）。
const SESSION_REUSE_WINDOW_MIN = 30;

// 校验评委确实被分配了此作品。
async function assertAssigned(judgeId: string, submissionId: string) {
  const assignment = await prisma.judgeAssignment.findUnique({
    where: { judgeId_submissionId: { judgeId, submissionId } },
  });
  return !!assignment;
}

// 开启审阅会话：进入作品详情页时调用。
export async function startReviewSession(
  submissionId: string,
): Promise<string | null> {
  const judge = await requireRole("JUDGE");
  if (!(await assertAssigned(judge.id, submissionId))) return null;

  // 复用近期仍活跃的会话，避免刷新页面产生大量碎片会话。
  const since = new Date(Date.now() - SESSION_REUSE_WINDOW_MIN * 60 * 1000);
  const existing = await prisma.reviewSession.findFirst({
    where: {
      judgeId: judge.id,
      submissionId,
      endedAt: null,
      lastHeartbeat: { gte: since },
    },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return existing.id;

  const userAgent = (await headers()).get("user-agent");
  const session = await prisma.reviewSession.create({
    data: { judgeId: judge.id, submissionId, userAgent },
  });
  // 进入详情页即记一条
  await prisma.materialView.create({
    data: { sessionId: session.id, submissionId, kind: "DETAIL_PAGE" },
  });
  // 首次被审阅 → 作品进入「评审中」
  await prisma.submission.updateMany({
    where: { id: submissionId, status: "SUBMITTED" },
    data: { status: "UNDER_REVIEW" },
  });
  return session.id;
}

// 心跳：累加有效查看时长（仅活跃时由前端调用；服务端对增量设上限）。
export async function heartbeat(sessionId: string, deltaSec: number) {
  const judge = await requireRole("JUDGE");
  const session = await prisma.reviewSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.judgeId !== judge.id || session.endedAt) return;
  const inc = Math.max(0, Math.min(Math.floor(deltaSec), HEARTBEAT_MAX_INCREMENT));
  await prisma.reviewSession.update({
    where: { id: sessionId },
    data: { lastHeartbeat: new Date(), durationSec: { increment: inc } },
  });
}

// 记录评委打开了某类材料（视频 / 仓库 / 应用市场 / 邀测 / 附件 …）。
export async function recordMaterialView(input: {
  sessionId: string;
  kind: MaterialKind;
  refId?: string;
  url?: string;
}) {
  const judge = await requireRole("JUDGE");
  const session = await prisma.reviewSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session || session.judgeId !== judge.id) return;
  await prisma.materialView.create({
    data: {
      sessionId: input.sessionId,
      submissionId: session.submissionId,
      kind: input.kind,
      refId: input.refId ?? null,
      url: input.url ?? null,
    },
  });
}

// 结束会话（离开页面时调用）。
export async function endReviewSession(sessionId: string, finalDeltaSec = 0) {
  const judge = await requireRole("JUDGE");
  const session = await prisma.reviewSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.judgeId !== judge.id || session.endedAt) return;
  const inc = Math.max(
    0,
    Math.min(Math.floor(finalDeltaSec), HEARTBEAT_MAX_INCREMENT),
  );
  await prisma.reviewSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), durationSec: { increment: inc } },
  });
}
