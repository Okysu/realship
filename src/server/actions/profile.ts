"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { profileSchema, changePasswordSchema } from "@/lib/validators/auth";

export type ProfileState =
  | { errors?: Record<string, string[] | undefined>; error?: string; ok?: boolean }
  | undefined;

// 更新昵称与简介。
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireAuth();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, bio: parsed.data.bio || null },
  });
  revalidatePath("/profile");
  return { ok: true };
}

// 修改密码（校验当前密码）。
export async function changePassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const sessionUser = await requireAuth();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return { error: "当前账户未设置密码，无法修改" };
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return { errors: { currentPassword: ["当前密码不正确"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash },
  });
  return { ok: true };
}
