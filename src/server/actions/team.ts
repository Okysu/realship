"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";

export type TeamActionState = { error?: string; ok?: boolean } | undefined;

// 队长按邮箱添加已注册队员（校验人数上限、重复、自身）。
export async function addTeamMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const user = await requireAuth();
  const teamId = String(formData.get("teamId"));
  const submissionId = String(formData.get("submissionId"));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });
  if (!team) return { error: "团队不存在" };
  if (team.leaderId !== user.id) return { error: "只有队长可管理成员" };
  if (team.members.length >= team.maxMembers) {
    return { error: `队伍人数已达上限（${team.maxMembers} 人）` };
  }

  const member = await prisma.user.findUnique({ where: { email } });
  if (!member) return { error: "该邮箱对应的用户尚未注册" };
  if (team.members.some((m) => m.userId === member.id)) {
    return { error: "该用户已在队伍中" };
  }

  await prisma.teamMember.create({
    data: { teamId, userId: member.id, role: "MEMBER" },
  });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  return { ok: true };
}

// 队长移除队员（不能移除队长本人）。
export async function removeTeamMember(formData: FormData) {
  const user = await requireAuth();
  const memberId = String(formData.get("memberId"));
  const submissionId = String(formData.get("submissionId"));

  const m = await prisma.teamMember.findUnique({
    where: { id: memberId },
    include: { team: true },
  });
  if (!m || m.team.leaderId !== user.id || m.role === "LEADER") return;

  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}
