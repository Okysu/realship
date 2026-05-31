import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";

// 当前会话用户。用 React cache 去重——一次请求渲染内只解析一次会话。
export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

// 要求已登录，否则跳转登录页。用于页面与 Server Action 的细粒度守卫。
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// 要求具备指定角色之一，否则跳转登录页。
// 纵深防御：Server Action 是公开 POST 端点，必须在内部调用此函数，不能只靠 proxy。
export async function requireRole(...roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/login");
  return user;
}
