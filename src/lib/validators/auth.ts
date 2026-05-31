import { z } from "zod";

// 登录
export const loginSchema = z.object({
  email: z.email({ error: "请输入有效邮箱" }),
  password: z.string().min(1, { error: "请输入密码" }),
});

// 注册（code = 邮箱验证码；启用 SMTP 时由 action 强制要求）
export const registerSchema = z.object({
  name: z.string().min(2, { error: "昵称至少 2 字" }).max(40),
  email: z.email({ error: "请输入有效邮箱" }),
  password: z.string().min(8, { error: "密码至少 8 位" }),
  code: z.string().optional().or(z.literal("")),
});

// 忘记密码：请求发送重置邮件
export const requestResetSchema = z.object({
  email: z.email({ error: "请输入有效邮箱" }),
});

// 重置密码：token + 新密码
export const resetPasswordSchema = z.object({
  token: z.string().min(1, { error: "重置链接无效或已过期" }),
  password: z.string().min(8, { error: "密码至少 8 位" }),
});

// 个人资料：昵称 + 简介
export const profileSchema = z.object({
  name: z.string().min(2, { error: "昵称至少 2 字" }).max(40),
  bio: z.string().max(300, { error: "简介不超过 300 字" }).optional().or(z.literal("")),
});

// 修改密码：当前密码 + 新密码
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: "请输入当前密码" }),
  newPassword: z.string().min(8, { error: "新密码至少 8 位" }),
});
