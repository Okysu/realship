"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import {
  registerUser,
  sendVerificationCode,
  type AuthFormState,
} from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export function RegisterForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    registerUser,
    undefined,
  );

  // 发送验证码：脱离主表单的提交语义（type=button + onClick），避免触发整页刷新。
  const [email, setEmail] = useState("");
  const [codeMsg, setCodeMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [cooldown, setCooldown] = useState(0);
  const [sending, startSending] = useTransition();

  // 倒计时：cooldown>0 时每秒递减，归零自动解禁「发送验证码」。
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleSendCode() {
    if (cooldown > 0 || sending) return;
    setCodeMsg(null);
    startSending(async () => {
      const fd = new FormData();
      fd.set("email", email);
      const res = await sendVerificationCode(undefined, fd);
      if (res?.cooldownSec) setCooldown(res.cooldownSec);
      if (res?.message) {
        setCodeMsg({ text: res.message, ok: !!res.ok });
      } else if (res?.errors?.email) {
        setCodeMsg({ text: res.errors.email[0] ?? "邮箱无效", ok: false });
      }
    });
  }

  const sendLabel = sending
    ? "发送中…"
    : cooldown > 0
      ? `${cooldown}s 后重发`
      : "发送验证码";

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">昵称</Label>
        <Input id="name" name="name" required />
        <FieldError messages={state?.errors?.name} />
      </div>
      <div>
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FieldError messages={state?.errors?.email} />
      </div>

      {emailEnabled && (
        <div>
          <Label htmlFor="code">邮箱验证码</Label>
          <div className="flex gap-2">
            <Input id="code" name="code" placeholder="6 位验证码" />
            <Button
              type="button"
              onClick={handleSendCode}
              variant="secondary"
              disabled={sending || cooldown > 0}
              className="shrink-0"
            >
              {sendLabel}
            </Button>
          </div>
          <FieldError messages={state?.errors?.code} />
          {codeMsg && (
            <p
              className={`mt-1 text-xs ${codeMsg.ok ? "text-primary" : "text-danger"}`}
            >
              {codeMsg.text}
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="password">密码</Label>
        <Input id="password" name="password" type="password" required />
        <FieldError messages={state?.errors?.password} />
      </div>

      {state?.message && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "注册中…" : "注册"}
      </Button>
    </form>
  );
}
