"use server";

import { z } from "zod";
import { randomBytes, randomInt } from "crypto";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  registerSchema,
  requestResetSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";
import { signIn, signOut } from "@/auth";
import {
  isEmailEnabled,
  sendEmail,
  emailShell,
  getAppUrl,
} from "@/lib/email";

export type AuthFormState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
      ok?: boolean;
      cooldownSec?: number; // 验证码重发剩余冷却秒数（前端据此倒计时）
    }
  | undefined;

const CODE_TTL_MIN = 10;
const RESET_TTL_MIN = 30;
const CODE_RESEND_COOLDOWN_SEC = 60; // 验证码重发冷却（防刷接口）

// 登出并回到首页（供统一导航复用）。
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// 发送注册邮箱验证码（仅启用 SMTP 时）。token 用 `${email}:${code}` 保证全局唯一。
export async function sendVerificationCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!z.email().safeParse(email).success) {
    return { errors: { email: ["请输入有效邮箱"] } };
  }
  if (!isEmailEnabled()) return { message: "邮件服务未启用" };
  if (await prisma.user.findUnique({ where: { email } })) {
    return { message: "该邮箱已被注册" };
  }

  const identifier = `verify:${email}`;
  // 后端限流：若上一次验证码仍在冷却期内，拒绝重发（防绕过前端直刷接口）。
  // expires = 发送时刻 + CODE_TTL_MIN，故「已过去时间 = TTL - 剩余有效」。
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier },
  });
  if (existing) {
    const elapsedSec =
      CODE_TTL_MIN * 60 - (existing.expires.getTime() - Date.now()) / 1000;
    if (elapsedSec < CODE_RESEND_COOLDOWN_SEC) {
      return {
        message: "请稍后再试",
        cooldownSec: Math.ceil(CODE_RESEND_COOLDOWN_SEC - elapsedSec),
      };
    }
  }

  const code = String(randomInt(100000, 1000000));
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: `${email}:${code}`,
      expires: new Date(Date.now() + CODE_TTL_MIN * 60000),
    },
  });
  try {
    await sendEmail({
      to: email,
      subject: "你的注册验证码",
      html: emailShell(
        "注册验证码",
        `<p>你的验证码是：</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#16a34a">${code}</p><p style="color:#64748b">${CODE_TTL_MIN} 分钟内有效。若非本人操作请忽略。</p>`,
      ),
    });
  } catch {
    return { message: "验证码发送失败，请稍后重试" };
  }
  return {
    ok: true,
    message: "验证码已发送，请查收邮箱",
    cooldownSec: CODE_RESEND_COOLDOWN_SEC,
  };
}

// 注册新参赛者；启用 SMTP 时强制校验邮箱验证码。成功后直接登录并跳转。
export async function registerUser(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { name, password, code } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  if (await prisma.user.findUnique({ where: { email } })) {
    return { message: "该邮箱已被注册" };
  }

  const emailEnabled = isEmailEnabled();
  if (emailEnabled) {
    if (!code) return { errors: { code: ["请输入邮箱验证码"] } };
    const identifier = `verify:${email}`;
    const vt = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token: `${email}:${code}` } },
    });
    if (!vt || vt.expires < new Date()) {
      return { errors: { code: ["验证码错误或已过期"] } };
    }
    await prisma.verificationToken.deleteMany({ where: { identifier } });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "PARTICIPANT",
      emailVerified: emailEnabled ? new Date() : null,
    },
  });

  // 注册成功 → 凭据登录并跳转（signIn 成功会抛出重定向控制流）
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return undefined;
}

// 邮箱密码登录。
export async function loginUser(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "邮箱或密码错误" };
    }
    throw error;
  }
  return undefined;
}

// 忘记密码：发送重置邮件（不泄露邮箱是否存在，防枚举）。
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const email = parsed.data.email.toLowerCase();
  if (!isEmailEnabled()) return { message: "邮件服务未启用，暂无法重置密码" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    const identifier = `reset:${email}`;
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires: new Date(Date.now() + RESET_TTL_MIN * 60000),
      },
    });
    const link = `${getAppUrl()}/reset-password?token=${token}`;
    try {
      await sendEmail({
        to: email,
        subject: "重置你的密码",
        html: emailShell(
          "重置密码",
          `<p>点击下方链接重置密码（${RESET_TTL_MIN} 分钟内有效）：</p><p><a href="${link}" style="color:#16a34a;word-break:break-all">${link}</a></p><p style="color:#64748b">若非本人操作，请忽略此邮件。</p>`,
        ),
      });
    } catch {
      // 邮件失败也不暴露细节
    }
  }
  return { message: "若该邮箱已注册，重置邮件已发送，请查收" };
}

// 执行重置：校验 token → 改密码 → 跳登录。
export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { token, password } = parsed.data;

  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  if (!vt || !vt.identifier.startsWith("reset:") || vt.expires < new Date()) {
    return { message: "重置链接无效或已过期，请重新申请" };
  }
  const email = vt.identifier.slice("reset:".length);
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  await prisma.verificationToken.deleteMany({
    where: { identifier: vt.identifier },
  });
  redirect("/login?reset=1");
}
