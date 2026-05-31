"use client";

import { useActionState } from "react";
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
  const [codeState, codeAction, codePending] = useActionState<
    AuthFormState,
    FormData
  >(sendVerificationCode, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">昵称</Label>
        <Input id="name" name="name" required />
        <FieldError messages={state?.errors?.name} />
      </div>
      <div>
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError messages={state?.errors?.email ?? codeState?.errors?.email} />
      </div>

      {emailEnabled && (
        <div>
          <Label htmlFor="code">邮箱验证码</Label>
          <div className="flex gap-2">
            <Input id="code" name="code" placeholder="6 位验证码" />
            <Button
              type="submit"
              formAction={codeAction}
              formNoValidate
              variant="secondary"
              disabled={codePending}
              className="shrink-0"
            >
              {codePending ? "发送中…" : "发送验证码"}
            </Button>
          </div>
          <FieldError messages={state?.errors?.code} />
          {codeState?.message && (
            <p className="mt-1 text-xs text-primary">{codeState.message}</p>
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
